-- ============================================================
-- WEEK 3: AMBULANCE INFRASTRUCTURE LAYER
-- Run after: emergency_migration.sql + hospital_intelligence_migration.sql
-- ============================================================

BEGIN;

-- ── New enums ─────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE ambulance_type_enum AS ENUM ('BLS', 'ALS', 'CARDIAC', 'ICU');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ownership_type_enum AS ENUM ('PRIVATE', 'HOSPITAL', 'GOVERNMENT', 'PARTNER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ambulance_status_enum AS ENUM ('AVAILABLE', 'ASSIGNED', 'BUSY', 'OFFLINE', 'MAINTENANCE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE driver_status_enum AS ENUM ('ONLINE', 'OFFLINE', 'ON_TRIP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE assignment_status_enum AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ambulance_event_type_enum AS ENUM (
    'AMBULANCE_REGISTERED',
    'AMBULANCE_ACTIVATED',
    'AMBULANCE_DEACTIVATED',
    'STATUS_CHANGED',
    'LOCATION_UPDATED',
    'DRIVER_ASSIGNED',
    'DRIVER_REMOVED',
    'ASSIGNMENT_CREATED',
    'ASSIGNMENT_ACCEPTED',
    'ASSIGNMENT_REJECTED',
    'ASSIGNMENT_COMPLETED',
    'ASSIGNMENT_CANCELLED',
    'EN_ROUTE',
    'ARRIVED_AT_PATIENT',
    'PATIENT_PICKED_UP',
    'ARRIVED_AT_HOSPITAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Extend existing enums ─────────────────────────────────────────────────────

-- Add AMBULANCE_DRIVER role to the auth role system
ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'AMBULANCE_DRIVER';

-- Extend the emergency timeline with ambulance-specific lifecycle events
ALTER TYPE emergency_event_type_enum ADD VALUE IF NOT EXISTS 'AMBULANCE_MATCHED';
ALTER TYPE emergency_event_type_enum ADD VALUE IF NOT EXISTS 'DRIVER_ACCEPTED';
ALTER TYPE emergency_event_type_enum ADD VALUE IF NOT EXISTS 'DRIVER_REJECTED';
ALTER TYPE emergency_event_type_enum ADD VALUE IF NOT EXISTS 'AMBULANCE_EN_ROUTE';
ALTER TYPE emergency_event_type_enum ADD VALUE IF NOT EXISTS 'PATIENT_DROPPED';

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ambulances (
  id                   SERIAL        PRIMARY KEY,
  ambulance_code       VARCHAR(20)   UNIQUE NOT NULL,
  registration_number  VARCHAR(50)   UNIQUE NOT NULL,
  ambulance_type       ambulance_type_enum   NOT NULL,
  ownership_type       ownership_type_enum   NOT NULL DEFAULT 'PRIVATE',
  hospital_id          INTEGER       REFERENCES hospitals(id) ON DELETE SET NULL,
  current_status       ambulance_status_enum NOT NULL DEFAULT 'OFFLINE',
  current_latitude     DECIMAL(9,6),
  current_longitude    DECIMAL(9,6),
  last_location_update TIMESTAMPTZ,
  is_active            BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Drivers link to both the ambulance they operate AND optionally to a User account
-- for driver-app authentication (role = AMBULANCE_DRIVER on User record)
CREATE TABLE IF NOT EXISTS ambulance_drivers (
  id              SERIAL       PRIMARY KEY,
  ambulance_id    INTEGER      NOT NULL REFERENCES ambulances(id) ON DELETE CASCADE,
  user_id         INTEGER      REFERENCES "User"(id) ON DELETE SET NULL,
  driver_name     VARCHAR(255) NOT NULL,
  phone           VARCHAR(20)  NOT NULL,
  license_number  VARCHAR(100) UNIQUE NOT NULL,
  status          driver_status_enum NOT NULL DEFAULT 'OFFLINE',
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Location history — append-only; current location is denormalized onto ambulances
-- for fast geospatial queries (no JOIN needed on the hot path)
CREATE TABLE IF NOT EXISTS ambulance_locations (
  id            SERIAL       PRIMARY KEY,
  ambulance_id  INTEGER      NOT NULL REFERENCES ambulances(id) ON DELETE CASCADE,
  latitude      DECIMAL(9,6) NOT NULL,
  longitude     DECIMAL(9,6) NOT NULL,
  speed         DECIMAL(5,2),           -- km/h
  heading       DECIMAL(5,2),           -- degrees 0–360
  accuracy      DECIMAL(8,2),           -- metres
  recorded_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ambulance_assignments (
  id                 SERIAL     PRIMARY KEY,
  emergency_case_id  INTEGER    NOT NULL REFERENCES emergency_cases(id) ON DELETE RESTRICT,
  ambulance_id       INTEGER    NOT NULL REFERENCES ambulances(id)       ON DELETE RESTRICT,
  driver_id          INTEGER    REFERENCES ambulance_drivers(id)         ON DELETE SET NULL,
  assignment_status  assignment_status_enum NOT NULL DEFAULT 'PENDING',
  assigned_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at        TIMESTAMPTZ,
  rejected_at        TIMESTAMPTZ,
  en_route_at        TIMESTAMPTZ,
  arrived_at         TIMESTAMPTZ,
  completed_at       TIMESTAMPTZ,
  cancelled_at       TIMESTAMPTZ,
  rejection_reason   TEXT,
  notes              TEXT,
  UNIQUE(emergency_case_id, ambulance_id)
);

CREATE TABLE IF NOT EXISTS ambulance_events (
  id            SERIAL      PRIMARY KEY,
  ambulance_id  INTEGER     NOT NULL REFERENCES ambulances(id) ON DELETE CASCADE,
  event_type    ambulance_event_type_enum NOT NULL,
  event_data    JSONB       NOT NULL DEFAULT '{}',
  actor_type    VARCHAR(50),
  actor_id      INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ambulance_audit_logs (
  id             SERIAL      PRIMARY KEY,
  ambulance_id   INTEGER     REFERENCES ambulances(id)            ON DELETE SET NULL,
  assignment_id  INTEGER     REFERENCES ambulance_assignments(id) ON DELETE SET NULL,
  actor_type     VARCHAR(50) NOT NULL,
  actor_id       INTEGER,
  action         VARCHAR(100) NOT NULL,
  metadata       JSONB        NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Primary geospatial index — only indexes AVAILABLE active ambulances that have
-- a reported location. This is the hot index for every nearby-ambulance search.
CREATE INDEX IF NOT EXISTS idx_ambulances_geo_available
  ON ambulances(current_latitude, current_longitude)
  WHERE current_status = 'AVAILABLE'
    AND is_active      = TRUE
    AND current_latitude  IS NOT NULL
    AND current_longitude IS NOT NULL;

-- General status + active lookup
CREATE INDEX IF NOT EXISTS idx_ambulances_status_active
  ON ambulances(current_status, is_active);

CREATE INDEX IF NOT EXISTS idx_ambulances_type
  ON ambulances(ambulance_type);

CREATE INDEX IF NOT EXISTS idx_ambulances_hospital
  ON ambulances(hospital_id) WHERE hospital_id IS NOT NULL;

-- Location history — most recent first per ambulance (track replay, ETA, routing)
CREATE INDEX IF NOT EXISTS idx_ambulance_locations_ambulance_time
  ON ambulance_locations(ambulance_id, recorded_at DESC);

-- Assignment lookups
CREATE INDEX IF NOT EXISTS idx_ambulance_assignments_emergency
  ON ambulance_assignments(emergency_case_id);

CREATE INDEX IF NOT EXISTS idx_ambulance_assignments_ambulance
  ON ambulance_assignments(ambulance_id);

CREATE INDEX IF NOT EXISTS idx_ambulance_assignments_status
  ON ambulance_assignments(assignment_status);

-- Pending/active assignments — used by dispatcher dashboard
CREATE INDEX IF NOT EXISTS idx_ambulance_assignments_active
  ON ambulance_assignments(assignment_status, assigned_at DESC)
  WHERE assignment_status IN ('PENDING', 'ACCEPTED', 'IN_PROGRESS');

-- Events — most recent first per ambulance
CREATE INDEX IF NOT EXISTS idx_ambulance_events_ambulance_time
  ON ambulance_events(ambulance_id, created_at DESC);

-- Driver lookups
CREATE INDEX IF NOT EXISTS idx_ambulance_drivers_ambulance
  ON ambulance_drivers(ambulance_id);

CREATE INDEX IF NOT EXISTS idx_ambulance_drivers_user
  ON ambulance_drivers(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ambulance_drivers_status
  ON ambulance_drivers(status) WHERE is_active = TRUE;

COMMIT;
