-- ============================================================================
-- MEDIRAKSHA — FULL DATABASE SCHEMA (medi-connect-development branch)
-- Consolidated from: db.sql, hospital_intelligence_migration.sql, plus the
-- Records/Collections/Reviews tables the backend controllers require but that
-- were never migrated anywhere (this was the deploy-time "table issues" bug —
-- recordsController.js/collectionsController.js/tagsController.js/reviewController.js
-- query "Collection", "CollectionRecord", "ReportConnection", "ReportTagAssignment",
-- "RecordTag", "RecordActivity", "PatientSummary", "Reviews", and several extra
-- columns on "Report", none of which existed in any .sql file in this repo).
--
-- Every statement here is idempotent — safe to run against a fresh database
-- OR an existing one that already has some of these tables/columns.
--
-- Run: psql -U <username> -d <dbname> -f schema.sql
-- Then seed dummy data with:  psql -U <username> -d <dbname> -f seed.sql
-- ============================================================================


-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE appointment_status_enum AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE slot_status_enum AS ENUM ('available', 'booked', 'blocked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 'discharge' is used by recordsController.js's ALLOWED_CAT but was missing
-- from the original enum — this silently broke every "discharge" record upload.
DO $$ BEGIN
  CREATE TYPE report_category_enum AS ENUM ('lab', 'prescription', 'scan', 'discharge', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE report_category_enum ADD VALUE IF NOT EXISTS 'discharge';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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
-- 2. CORE MEDIRAKSHA TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS "Doctor" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR NOT NULL,
    "email" VARCHAR UNIQUE NOT NULL,
    "number" VARCHAR,
    "age" INTEGER,
    "gender" gender_enum,
    hospital VARCHAR,
    "speciality" VARCHAR,
    "password" VARCHAR NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "User" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR NOT NULL,
    "email" VARCHAR UNIQUE NOT NULL,
    "number" VARCHAR,
    "age" INTEGER,
    "gender" gender_enum,
    "registeredDoctorId" INTEGER,
    "password" VARCHAR NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RBAC role, used by hospitalIntelligenceRoutes.js's admin guard (roleAuth.js)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS role user_role_enum DEFAULT 'USER';

CREATE TABLE IF NOT EXISTS "Slot" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER,
    "doctorId" INTEGER NOT NULL,
    "bookingDate" DATE NOT NULL,
    "slotTime" TIME NOT NULL DEFAULT '09:00',
    "status" slot_status_enum DEFAULT 'available',
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Appointment" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "doctorId" INTEGER NOT NULL,
    "slotId" INTEGER NOT NULL,
    "requestGroupId" INTEGER,
    "slotTime" TIME,
    "appointmentDate" DATE NOT NULL,
    "reasonOfAppointment" VARCHAR,
    "status" appointment_status_enum DEFAULT 'pending',
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Report Table — base columns (original upload feature: uploadController.js,
-- doctorReportController.js, doctorMeetingController.js).
CREATE TABLE IF NOT EXISTS "Report" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "uploadedBy" VARCHAR,
    "doctorId" INTEGER,
    "title" VARCHAR NOT NULL,
    "category" report_category_enum,
    "fileSize" INTEGER,
    "fileData" TEXT,
    "mimeType" VARCHAR,
    "visibility" VARCHAR,
    "originalFileName" VARCHAR,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Report Table — extension columns needed by the Records/Collections feature
-- (recordsController.js, collectionsController.js, tagsController.js). These
-- were missing from every migration file — this is the deploy-breaking gap.
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "recordId" VARCHAR;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "doctorName" VARCHAR;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "specialization" VARCHAR;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "hospital" VARCHAR;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "visitDate" DATE;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "isImportant" BOOLEAN DEFAULT FALSE;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN DEFAULT FALSE;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN DEFAULT FALSE;
-- "visibility" is now private/shared only; emergency access is its own flag
-- so a report can be shared-with-doctor AND emergency-accessible independently.
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "emergencyAccess" BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS "Hospital" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR NOT NULL,
    "doctorId" INTEGER,
    "bed" INTEGER,
    "room" INTEGER,
    "oxygenCylinder" INTEGER,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "BedBooking" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "hospitalId" INTEGER,
    "hospitalPlaceId" VARCHAR,
    "hospitalName" VARCHAR NOT NULL,
    "bedsRequested" INTEGER NOT NULL DEFAULT 1,
    "contactName" VARCHAR,
    "contactNumber" VARCHAR,
    "notes" VARCHAR,
    "status" VARCHAR NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Disease" (
    "id" SERIAL PRIMARY KEY,
    "code" INTEGER UNIQUE,
    "name" VARCHAR NOT NULL,
    "symtom" VARCHAR,
    "solution" VARCHAR,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
-- 3. RECORDS / COLLECTIONS / TAGS
-- Backs recordsController.js, collectionsController.js, tagsController.js.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "RecordTag" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "color" VARCHAR(20),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recordtag_user ON "RecordTag"("userId");

CREATE TABLE IF NOT EXISTS "ReportTagAssignment" (
    "id" SERIAL PRIMARY KEY,
    "reportId" INTEGER NOT NULL REFERENCES "Report"("id") ON DELETE CASCADE,
    "tagId" INTEGER NOT NULL REFERENCES "RecordTag"("id") ON DELETE CASCADE,
    UNIQUE("reportId", "tagId")
);

CREATE INDEX IF NOT EXISTS idx_reporttag_report ON "ReportTagAssignment"("reportId");
CREATE INDEX IF NOT EXISTS idx_reporttag_tag    ON "ReportTagAssignment"("tagId");

CREATE TABLE IF NOT EXISTS "ReportConnection" (
    "id" SERIAL PRIMARY KEY,
    "sourceReportId" INTEGER NOT NULL REFERENCES "Report"("id") ON DELETE CASCADE,
    "targetReportId" INTEGER NOT NULL REFERENCES "Report"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("sourceReportId", "targetReportId")
);

CREATE INDEX IF NOT EXISTS idx_reportconn_source ON "ReportConnection"("sourceReportId");
CREATE INDEX IF NOT EXISTS idx_reportconn_target ON "ReportConnection"("targetReportId");

CREATE TABLE IF NOT EXISTS "RecordActivity" (
    "id" SERIAL PRIMARY KEY,
    "reportId" INTEGER NOT NULL REFERENCES "Report"("id") ON DELETE CASCADE,
    "userId" INTEGER NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "detail" VARCHAR,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recordactivity_report ON "RecordActivity"("reportId");

CREATE TABLE IF NOT EXISTS "Collection" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "name" VARCHAR NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_collection_user ON "Collection"("userId");

CREATE TABLE IF NOT EXISTS "CollectionRecord" (
    "id" SERIAL PRIMARY KEY,
    "collectionId" INTEGER NOT NULL REFERENCES "Collection"("id") ON DELETE CASCADE,
    "reportId" INTEGER NOT NULL REFERENCES "Report"("id") ON DELETE CASCADE,
    "addedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("collectionId", "reportId")
);

CREATE INDEX IF NOT EXISTS idx_collectionrecord_collection ON "CollectionRecord"("collectionId");
CREATE INDEX IF NOT EXISTS idx_collectionrecord_report     ON "CollectionRecord"("reportId");

CREATE TABLE IF NOT EXISTS "PatientSummary" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL UNIQUE,
    "bloodGroup" VARCHAR(10),
    "knownConditions" TEXT,
    "allergies" TEXT,
    "emergencyContact" VARCHAR,
    "healthRemarks" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
-- 4. REVIEWS
-- Backs reviewController.js (which previously self-created this table on every
-- request via a runtime CREATE TABLE IF NOT EXISTS — moved here so it happens
-- once, at migration time, instead of on the request path).
-- ============================================================================

CREATE TABLE IF NOT EXISTS "Reviews" (
    "id" SERIAL PRIMARY KEY,
    "entityType" VARCHAR(20) NOT NULL CHECK ("entityType" IN ('hospital','doctor')),
    "entityId"   INTEGER,
    "rating"     SMALLINT NOT NULL CHECK ("rating" BETWEEN 1 AND 5),
    "reviewText" TEXT,
    "authorName" VARCHAR(120) NOT NULL DEFAULT 'Anonymous',
    "userId"     INTEGER,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_entity ON "Reviews"("entityType", "entityId");


-- ============================================================================
-- 5. HOSPITAL INTELLIGENCE TABLES (hospitals / hospital_facilities / hospital_departments)
-- Shared foundation used by MediConnect (hospitalIntelligenceController.js).
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

CREATE TABLE IF NOT EXISTS hospital_departments (
  id              SERIAL PRIMARY KEY,
  hospital_id     INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  department_name VARCHAR(100) NOT NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  UNIQUE(hospital_id, department_name)
);

CREATE INDEX IF NOT EXISTS idx_hospital_departments_hospital_id ON hospital_departments(hospital_id);

CREATE TABLE IF NOT EXISTS hospital_contacts (
  id            SERIAL PRIMARY KEY,
  hospital_id   INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  contact_name  VARCHAR(100),
  designation   VARCHAR(100),
  phone         VARCHAR(20),
  email         VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_hospital_contacts_hospital_id ON hospital_contacts(hospital_id);

-- Tracks all hospital master data mutations (create/update/delete via the
-- HOSPITAL_ADMIN-guarded routes in hospitalIntelligenceRoutes.js).
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
