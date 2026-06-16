-- ============================================================================
-- EMERGENCY CORE MODULE - MIGRATION
-- Week 1: Emergency Core Foundation
-- Run: psql -U postgres -d saswath -f emergency_migration.sql
-- ============================================================================


-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

CREATE TYPE emergency_status_enum AS ENUM (
  'CREATED',
  'ACTIVE',
  'HOSPITAL_IDENTIFIED',
  'AMBULANCE_ASSIGNED',
  'PATIENT_PICKED_UP',
  'PATIENT_ADMITTED',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE emergency_event_type_enum AS ENUM (
  'EMERGENCY_CREATED',
  'LOCATION_CAPTURED',
  'TOKEN_CREATED',
  'QR_GENERATED',
  'FAMILY_NOTIFIED',
  'STATUS_UPDATED',
  'EMERGENCY_CANCELLED',
  'EMERGENCY_COMPLETED',
  'HOSPITAL_ASSIGNED',
  'AMBULANCE_ASSIGNED',
  'PATIENT_PICKED_UP',
  'PATIENT_ADMITTED',
  'TOKEN_REVOKED',
  'ACCESS_GRANTED'
);

CREATE TYPE notification_channel_enum AS ENUM ('sms', 'whatsapp', 'email', 'push');
CREATE TYPE notification_status_enum  AS ENUM ('queued', 'sent', 'failed', 'delivered');
CREATE TYPE emergency_actor_type_enum AS ENUM ('user', 'system', 'doctor', 'hospital', 'admin');


-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- Primary emergency record
CREATE TABLE IF NOT EXISTS emergency_cases (
  id                SERIAL PRIMARY KEY,
  emergency_id      VARCHAR(20) UNIQUE,
  user_id           INTEGER NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  status            emergency_status_enum NOT NULL DEFAULT 'CREATED',
  latitude          NUMERIC(10, 8) NOT NULL,
  longitude         NUMERIC(11, 8) NOT NULL,
  location_accuracy NUMERIC(10, 2),
  emergency_type    VARCHAR(100),
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at         TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emergency_cases_user_id    ON emergency_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_cases_status     ON emergency_cases(status);
CREATE INDEX IF NOT EXISTS idx_emergency_cases_created_at ON emergency_cases(created_at DESC);

-- Immutable event log — every lifecycle action produces a row here
CREATE TABLE IF NOT EXISTS emergency_events (
  id                SERIAL PRIMARY KEY,
  emergency_case_id INTEGER NOT NULL REFERENCES emergency_cases(id) ON DELETE CASCADE,
  event_type        emergency_event_type_enum NOT NULL,
  event_data        JSONB DEFAULT '{}',
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emergency_events_case_id    ON emergency_events(emergency_case_id);
CREATE INDEX IF NOT EXISTS idx_emergency_events_created_at ON emergency_events(created_at ASC);

-- Cryptographically secure short-lived tokens for external access
CREATE TABLE IF NOT EXISTS emergency_access_tokens (
  id                SERIAL PRIMARY KEY,
  emergency_case_id INTEGER NOT NULL REFERENCES emergency_cases(id) ON DELETE CASCADE,
  token             VARCHAR(128) UNIQUE NOT NULL,
  expires_at        TIMESTAMP NOT NULL,
  revoked_at        TIMESTAMP,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emergency_tokens_token   ON emergency_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_emergency_tokens_case_id ON emergency_access_tokens(emergency_case_id);

-- Emergency contact registry per user
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  contact_name  VARCHAR(100) NOT NULL,
  contact_phone VARCHAR(20) NOT NULL,
  relationship  VARCHAR(50),
  priority      INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 10),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id ON emergency_contacts(user_id);

-- Outbound notification records (one row per contact per channel per emergency)
CREATE TABLE IF NOT EXISTS emergency_notifications (
  id                SERIAL PRIMARY KEY,
  emergency_case_id INTEGER NOT NULL REFERENCES emergency_cases(id) ON DELETE CASCADE,
  contact_id        INTEGER REFERENCES emergency_contacts(id) ON DELETE SET NULL,
  channel           notification_channel_enum NOT NULL,
  status            notification_status_enum NOT NULL DEFAULT 'queued',
  sent_at           TIMESTAMP,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emergency_notifications_case_id ON emergency_notifications(emergency_case_id);
CREATE INDEX IF NOT EXISTS idx_emergency_notifications_status  ON emergency_notifications(status);

-- Immutable audit trail of every critical action
CREATE TABLE IF NOT EXISTS emergency_audit_logs (
  id                SERIAL PRIMARY KEY,
  emergency_case_id INTEGER NOT NULL REFERENCES emergency_cases(id) ON DELETE CASCADE,
  actor_type        emergency_actor_type_enum NOT NULL,
  actor_id          INTEGER,
  action            VARCHAR(100) NOT NULL,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emergency_audit_case_id    ON emergency_audit_logs(emergency_case_id);
CREATE INDEX IF NOT EXISTS idx_emergency_audit_created_at ON emergency_audit_logs(created_at DESC);
