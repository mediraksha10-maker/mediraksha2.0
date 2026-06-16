-- ============================================================================
-- HOSPITAL INTELLIGENCE LAYER - MIGRATION
-- Week 2: Hospital Intelligence Foundation
-- Run AFTER emergency_migration.sql
-- psql -U postgres -d saswath -f hospital_intelligence_migration.sql
-- ============================================================================


-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE hospital_type_enum AS ENUM (
    'MULTISPECIALITY',
    'GOVERNMENT',
    'PRIVATE',
    'TRAUMA_CENTER',
    'CARDIAC_CENTER',
    'CHILDREN_HOSPITAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE facility_type_enum AS ENUM (
    'ICU',
    'VENTILATOR',
    'TRAUMA_CENTER',
    'CT_SCAN',
    'MRI',
    'BLOOD_BANK',
    'EMERGENCY_OT',
    'CARDIOLOGY',
    'NEUROLOGY',
    'ORTHOPEDICS',
    'PEDIATRICS',
    'MATERNITY',
    'DIALYSIS',
    'ONCOLOGY',
    'PHARMACY'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role_enum AS ENUM (
    'USER',
    'HOSPITAL_ADMIN',
    'OPERATIONS_TEAM',
    'SUPER_ADMIN'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- 2. EXTEND USER TABLE FOR RBAC
-- ============================================================================

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS role user_role_enum DEFAULT 'USER';


-- ============================================================================
-- 3. HOSPITAL MASTER TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS hospitals (
  id                SERIAL PRIMARY KEY,
  hospital_code     VARCHAR(20) UNIQUE,
  hospital_name     VARCHAR(255) NOT NULL,
  hospital_type     hospital_type_enum NOT NULL DEFAULT 'PRIVATE',
  address           TEXT,
  city              VARCHAR(100),
  state             VARCHAR(100),
  country           VARCHAR(100) DEFAULT 'India',
  pincode           VARCHAR(10),
  latitude          NUMERIC(10, 8) NOT NULL,
  longitude         NUMERIC(11, 8) NOT NULL,
  phone             VARCHAR(20),
  email             VARCHAR(255),
  website           VARCHAR(500),
  -- rating: 0.00–5.00, community / external review score
  rating            NUMERIC(3, 2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  -- reliability_score: 0–100, internal ops score (response time, data accuracy, etc.)
  reliability_score NUMERIC(5, 2) DEFAULT 100.00 CHECK (reliability_score >= 0 AND reliability_score <= 100),
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Composite index used for bounding-box pre-filter in Haversine geospatial queries
CREATE INDEX IF NOT EXISTS idx_hospitals_coordinates ON hospitals(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_hospitals_city        ON hospitals(LOWER(city));
CREATE INDEX IF NOT EXISTS idx_hospitals_type        ON hospitals(hospital_type);
CREATE INDEX IF NOT EXISTS idx_hospitals_active      ON hospitals(is_active);


-- ============================================================================
-- 4. HOSPITAL CAPABILITIES
-- ============================================================================

-- One row per capability per hospital. facility_code is the stable machine key.
CREATE TABLE IF NOT EXISTS hospital_facilities (
  id            SERIAL PRIMARY KEY,
  hospital_id   INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  facility_code VARCHAR(50) NOT NULL,
  facility_name VARCHAR(100) NOT NULL,
  facility_type facility_type_enum NOT NULL,
  is_available  BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(hospital_id, facility_code)
);

CREATE INDEX IF NOT EXISTS idx_hospital_facilities_hospital_id ON hospital_facilities(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_facilities_type        ON hospital_facilities(facility_type);
CREATE INDEX IF NOT EXISTS idx_hospital_facilities_available   ON hospital_facilities(is_available);


-- ============================================================================
-- 5. HOSPITAL DEPARTMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS hospital_departments (
  id              SERIAL PRIMARY KEY,
  hospital_id     INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  department_name VARCHAR(100) NOT NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  UNIQUE(hospital_id, department_name)
);

CREATE INDEX IF NOT EXISTS idx_hospital_departments_hospital_id ON hospital_departments(hospital_id);


-- ============================================================================
-- 6. HOSPITAL CONTACTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS hospital_contacts (
  id            SERIAL PRIMARY KEY,
  hospital_id   INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  contact_name  VARCHAR(100),
  designation   VARCHAR(100),
  phone         VARCHAR(20),
  email         VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_hospital_contacts_hospital_id ON hospital_contacts(hospital_id);


-- ============================================================================
-- 7. HOSPITAL RANKING LOGS
-- Records every scoring decision made by the ranking engine per emergency.
-- Enables post-mortem analysis, ML training, and ranking engine iteration.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hospital_ranking_logs (
  id                SERIAL PRIMARY KEY,
  emergency_case_id INTEGER NOT NULL REFERENCES emergency_cases(id) ON DELETE CASCADE,
  hospital_id       INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  distance_km       NUMERIC(8, 3),
  distance_score    NUMERIC(8, 6),
  facility_score    NUMERIC(8, 6) DEFAULT 0,
  rating_score      NUMERIC(8, 6),
  total_score       NUMERIC(8, 6),
  rank_position     INTEGER,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hospital_ranking_emergency ON hospital_ranking_logs(emergency_case_id);
CREATE INDEX IF NOT EXISTS idx_hospital_ranking_hospital  ON hospital_ranking_logs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_ranking_score     ON hospital_ranking_logs(total_score DESC);


-- ============================================================================
-- 8. HOSPITAL ADMIN AUDIT LOG
-- Separate from emergency_audit_logs (which requires a non-null emergency_case_id).
-- Tracks all hospital master data mutations.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hospital_admin_audit_logs (
  id          SERIAL PRIMARY KEY,
  hospital_id INTEGER REFERENCES hospitals(id) ON DELETE SET NULL,
  actor_id    INTEGER,
  actor_type  VARCHAR(50) DEFAULT 'user',
  action      VARCHAR(100) NOT NULL,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hosp_audit_hospital  ON hospital_admin_audit_logs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hosp_audit_created   ON hospital_admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hosp_audit_actor     ON hospital_admin_audit_logs(actor_id);
