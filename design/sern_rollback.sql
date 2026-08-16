-- SERN Rollback: drop all SERN tables, enums, and User columns
-- Run this in psql or pgAdmin to clean the database.

-- 1. Drop SERN tables (order matters for FK constraints)
DROP TABLE IF EXISTS emergency_staff_tokens CASCADE;
DROP TABLE IF EXISTS unknown_patients CASCADE;
DROP TABLE IF EXISTS emergency_profiles CASCADE;
DROP TABLE IF EXISTS ambulance_audit_logs CASCADE;
DROP TABLE IF EXISTS ambulance_events CASCADE;
DROP TABLE IF EXISTS ambulance_assignments CASCADE;
DROP TABLE IF EXISTS ambulance_locations CASCADE;
DROP TABLE IF EXISTS ambulance_drivers CASCADE;
DROP TABLE IF EXISTS ambulances CASCADE;
DROP TABLE IF EXISTS hospital_admin_audit_logs CASCADE;
DROP TABLE IF EXISTS hospital_ranking_logs CASCADE;
DROP TABLE IF EXISTS hospital_contacts CASCADE;
DROP TABLE IF EXISTS hospital_departments CASCADE;
DROP TABLE IF EXISTS hospital_facilities CASCADE;
DROP TABLE IF EXISTS hospitals CASCADE;
DROP TABLE IF EXISTS emergency_audit_logs CASCADE;
DROP TABLE IF EXISTS emergency_notifications CASCADE;
DROP TABLE IF EXISTS emergency_access_tokens CASCADE;
DROP TABLE IF EXISTS emergency_contacts CASCADE;
DROP TABLE IF EXISTS emergency_events CASCADE;
DROP TABLE IF EXISTS emergency_cases CASCADE;

-- 2. Drop sequences
DROP SEQUENCE IF EXISTS unknown_patient_seq CASCADE;

-- 3. Remove SERN columns from User table
ALTER TABLE "User"
  DROP COLUMN IF EXISTS mediraksha_id,
  DROP COLUMN IF EXISTS mrk_qr_payload,
  DROP COLUMN IF EXISTS role;

-- 4. Drop SERN enums
DROP TYPE IF EXISTS ambulance_event_type_enum CASCADE;
DROP TYPE IF EXISTS assignment_status_enum CASCADE;
DROP TYPE IF EXISTS driver_status_enum CASCADE;
DROP TYPE IF EXISTS ambulance_status_enum CASCADE;
DROP TYPE IF EXISTS ownership_type_enum CASCADE;
DROP TYPE IF EXISTS ambulance_type_enum CASCADE;
DROP TYPE IF EXISTS facility_type_enum CASCADE;
DROP TYPE IF EXISTS hospital_type_enum CASCADE;
DROP TYPE IF EXISTS user_role_enum CASCADE;
DROP TYPE IF EXISTS emergency_event_type_enum CASCADE;
DROP TYPE IF EXISTS emergency_status_enum CASCADE;
