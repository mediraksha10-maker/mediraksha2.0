-- ════════════════════════════════════════════════════════════════
-- SERN v2 — Week 4 Migration
-- Patient Identification + Auto-Dispatch + Emergency Profiles
-- Run AFTER: ambulance_migration.sql
-- ════════════════════════════════════════════════════════════════

-- ── 1. MRK ID on User table ──────────────────────────────────────────────────

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS mediraksha_id  VARCHAR(12) UNIQUE,
  ADD COLUMN IF NOT EXISTS mrk_qr_payload TEXT;

-- Backfill existing users
UPDATE "User"
SET
  mediraksha_id  = 'MRK-' || LPAD(id::TEXT, 6, '0'),
  mrk_qr_payload = '{"patient_id":"MRK-' || LPAD(id::TEXT, 6, '0') || '","v":1}'
WHERE mediraksha_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_mediraksha_id ON "User"(mediraksha_id);

-- ── 2. Emergency cases — patient identity + dispatch state columns ──────────

ALTER TABLE emergency_cases
  ADD COLUMN IF NOT EXISTS patient_user_id            INTEGER REFERENCES "User"(id),
  ADD COLUMN IF NOT EXISTS patient_unknown_id         VARCHAR(20),
  ADD COLUMN IF NOT EXISTS patient_id_level           SMALLINT,
  -- 1 = QR scan, 2 = MRK ID, 3 = contact recovery, 4 = unknown patient
  ADD COLUMN IF NOT EXISTS dispatch_hospital_status   VARCHAR(20) DEFAULT 'PENDING',
  -- PENDING | SEARCHING | MATCHED | FAILED
  ADD COLUMN IF NOT EXISTS dispatch_ambulance_status  VARCHAR(20) DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS dispatch_started_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatch_completed_at      TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_emergency_cases_dispatch
  ON emergency_cases(dispatch_hospital_status, dispatch_ambulance_status);

-- ── 3. Blood group enum ───────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE blood_group_enum AS ENUM ('A+','A-','B+','B-','AB+','AB-','O+','O-','UNKNOWN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 4. Emergency profiles (limited medical snapshot for first responders) ────

CREATE TABLE IF NOT EXISTS emergency_profiles (
  id                    SERIAL PRIMARY KEY,
  user_id               INTEGER UNIQUE NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  blood_group           blood_group_enum    DEFAULT 'UNKNOWN',
  allergies             TEXT[]              DEFAULT '{}',
  chronic_conditions    TEXT[]              DEFAULT '{}',
  current_medications   TEXT[]              DEFAULT '{}',
  donor_consent         BOOLEAN             DEFAULT FALSE,
  first_responder_note  TEXT,
  created_at            TIMESTAMPTZ         DEFAULT NOW(),
  updated_at            TIMESTAMPTZ         DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_profiles_user ON emergency_profiles(user_id);

-- ── 5. Unknown patient counter + table ───────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS unknown_patient_seq START 1;

CREATE TABLE IF NOT EXISTS unknown_patients (
  id                 SERIAL PRIMARY KEY,
  unknown_id         VARCHAR(20) UNIQUE NOT NULL,   -- UNK-YYYY-NNNNNN
  emergency_case_id  INTEGER NOT NULL,
  reported_name      VARCHAR(200),
  approximate_age    INTEGER,
  reported_gender    VARCHAR(20),
  reported_phone     VARCHAR(20),
  description        TEXT,
  id_status          VARCHAR(20)   DEFAULT 'UNKNOWN',  -- UNKNOWN | RESOLVED
  resolved_user_id   INTEGER REFERENCES "User"(id),
  created_at         TIMESTAMPTZ   DEFAULT NOW(),
  updated_at         TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unknown_patients_case ON unknown_patients(emergency_case_id);

-- FK from emergency_cases to unknown_patients (after table exists)
DO $$ BEGIN
  ALTER TABLE emergency_cases
    ADD CONSTRAINT fk_emergency_unknown_patient
    FOREIGN KEY (patient_unknown_id) REFERENCES unknown_patients(unknown_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 6. Staff access tokens (scoped, time-limited, not the QR token) ──────────

CREATE TABLE IF NOT EXISTS emergency_staff_tokens (
  id                 SERIAL PRIMARY KEY,
  token              VARCHAR(80)  UNIQUE NOT NULL,  -- EMG-TKN-XXXXXXXX
  emergency_case_id  INTEGER      NOT NULL,
  granted_user_id    INTEGER      REFERENCES "User"(id),
  scopes             TEXT[]       NOT NULL,
  -- e.g. ARRAY['read:emergency_profile','read:location']
  expires_at         TIMESTAMPTZ  NOT NULL,
  revoked_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_tokens_case
  ON emergency_staff_tokens(emergency_case_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_staff_tokens_token
  ON emergency_staff_tokens(token) WHERE revoked_at IS NULL;

-- ── 7. New event types ────────────────────────────────────────────────────────

ALTER TYPE emergency_event_type_enum ADD VALUE IF NOT EXISTS 'AUTO_DISPATCH_STARTED';
ALTER TYPE emergency_event_type_enum ADD VALUE IF NOT EXISTS 'AUTO_DISPATCH_COMPLETED';
ALTER TYPE emergency_event_type_enum ADD VALUE IF NOT EXISTS 'PATIENT_IDENTIFIED';
ALTER TYPE emergency_event_type_enum ADD VALUE IF NOT EXISTS 'UNKNOWN_PATIENT_ASSIGNED';
ALTER TYPE emergency_event_type_enum ADD VALUE IF NOT EXISTS 'STAFF_TOKEN_ISSUED';
ALTER TYPE emergency_event_type_enum ADD VALUE IF NOT EXISTS 'STAFF_TOKEN_REVOKED';
