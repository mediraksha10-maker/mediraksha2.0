-- ============================================================================
-- 1. CREATE ENUM TYPES
-- ============================================================================
CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other');
CREATE TYPE appointment_status_enum AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
CREATE TYPE slot_status_enum AS ENUM ('available', 'booked', 'blocked');
CREATE TYPE report_category_enum AS ENUM ('lab', 'prescription', 'scan', 'other');

-- ============================================================================
-- 2. CREATE TABLES
-- ============================================================================
-- Capitalize for realtion name, camelCase for attributes
-- Doctor Table
CREATE TABLE "Doctor" (
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

-- User Table
CREATE TABLE "User" (
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

-- Slot Table
CREATE TABLE "Slot" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER,
    "doctorId" INTEGER NOT NULL,
    "bookingDate" DATE NOT NULL,
    "slotTime" TIME NOT NULL DEFAULT '09:00',
    "status" slot_status_enum DEFAULT 'available',
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointment Table
CREATE TABLE "Appointment" (
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

-- Report Table
CREATE TABLE "Report" (
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

-- Hospital Table
CREATE TABLE "Hospital" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR NOT NULL,
    "doctorId" INTEGER,
    "bed" INTEGER,
    "room" INTEGER,
    "oxygenCylinder" INTEGER,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bed Booking Table
CREATE TABLE "BedBooking" (
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

-- Diseases Table
CREATE TABLE "Disease" (
    "id" SERIAL PRIMARY KEY,
    "code" INTEGER UNIQUE,
    "name" VARCHAR NOT NULL,
    "symtom" VARCHAR,
    "solution" VARCHAR,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- User -> Doctor
-- ALTER TABLE users 
-- ADD CONSTRAINT fk_user_registered_doctor FOREIGN KEY ("registereddoctorid") REFERENCES doctor ("id") ON DELETE SET NULL;

-- -- Slot -> Doctor
-- ALTER TABLE slot 
-- ADD CONSTRAINT fk_slot_doctor FOREIGN KEY ("doctortid") REFERENCES doctor ("id") ON DELETE CASCADE;

-- -- Slot -> User (Optional link if slot tracks current booker)
-- ALTER TABLE slot 
-- ADD CONSTRAINT fk_slot_user FOREIGN KEY ("userid") REFERENCES users ("id") ON DELETE SET NULL;

-- -- Appointment -> User
-- ALTER TABLE appointment 
-- ADD CONSTRAINT fk_appointment_user FOREIGN KEY ("userid") REFERENCES users ("id") ON DELETE CASCADE;

-- -- Appointment -> Doctor
-- ALTER TABLE appointment 
-- ADD CONSTRAINT fk_appointment_doctor FOREIGN KEY ("doctorid") REFERENCES doctor ("id") ON DELETE CASCADE;

-- -- Appointment -> Slot
-- ALTER TABLE appointment 
-- ADD CONSTRAINT fk_appointment_slot FOREIGN KEY ("slotid") REFERENCES slot ("id") ON DELETE CASCADE;

-- -- Report -> User
-- ALTER TABLE report 
-- ADD CONSTRAINT fk_report_user FOREIGN KEY ("userid") REFERENCES users ("id") ON DELETE CASCADE;

-- -- Report -> Doctor
-- ALTER TABLE report 
-- ADD CONSTRAINT fk_report_doctor FOREIGN KEY ("doctorid") REFERENCES doctor ("id") ON DELETE SET NULL;

-- -- Hospital -> Doctor
-- ALTER TABLE hospital 
-- ADD CONSTRAINT fk_hospital_doctor FOREIGN KEY ("doctorid") REFERENCES doctor ("id") ON DELETE SET NULL;


-- ============================================================================
-- 4. INSERT DUMMY DATA
-- ============================================================================

-- Insert into Doctor
INSERT INTO "Doctor" ("name", "email", "number", "age", "gender", "hospital", "speciality", "password") VALUES
('Dr. Gregory House', 'house@diagnostics.com', '555-0101', 45, 'male', 'Princeton-Plainsboro', 'Diagnostic Medicine', 'hashed_pass_1'),
('Dr. Meredith Grey', 'meredith@seattlegrace.com', '555-0102', 38, 'female', 'Seattle Grace Hospital', 'General Surgery', 'hashed_pass_2'),
('Dr. John Watson', 'watson@bakerstreet.com', '555-0103', 40, 'male', 'St. Bartholomews', 'General Practice', 'hashed_pass_3'),
('Dr. Dana Scully', 'scully@fbi.gov', '555-0104', 35, 'female', 'Our Lady of Lourdes', 'Pathology', 'hashed_pass_4'),
('Dr. Stephen Strange', 'strange@kamartaj.com', '555-0105', 42, 'male', 'Metro-General Hospital', 'Neurosurgery', 'hashed_pass_5');

-- Insert into Disease
INSERT INTO "Disease" ("code", "name", "symtom", "solution") VALUES
(101, 'Influenza (Flu)', 'Fever, chills, muscle aches, cough, fatigue', 'Rest, hydration, antiviral medication if caught early.'),
(102, 'Acute Appendicitis', 'Severe abdominal pain starting near navel moving to lower right, nausea, fever', 'Emergency surgical removal of the appendix.'),
(103, 'Hypertension', 'Often asymptomatic, occasional headaches, shortness of breath, dizziness', 'Lifestyle changes (diet, exercise) and antihypertensive medication.'),
(104, 'Migraine', 'Severe throbbing headache, usually on one side, nausea, sensitivity to light/sound', 'Pain relievers, trigger avoidance, preventive medication.'),
(105, 'Type 2 Diabetes', 'Increased thirst, frequent urination, increased hunger, fatigue, blurry vision', 'Dietary modifications, regular exercise, metformin or insulin therapy.');

-- Insert into User (Referencing Doctor IDs 1-5 created above)
INSERT INTO "User" ("name", "email", "number", "age", "gender", "registeredDoctorId", "password") VALUES
('Sherlock Holmes', 'sherlock@bakerstreet.com', '555-1111', 34, 'male', 3, 'password123'),
('Tony Stark', 'tony@starkindustries.com', '555-2222', 48, 'male', 5, 'jarvis123'),
('Fox Mulder', 'mulder@fbi.gov', '555-3333', 37, 'male', 4, 'iwanttobelieve'),
('Jane Doe', 'jane.doe@email.com', '555-4444', 29, 'female', 2, 'securepass'),
('John Smith', 'john.smith@email.com', '555-5555', 52, 'male', NULL, 'mysecretpassword');

-- Insert into Slot (Referencing Doctor IDs and User IDs)
INSERT INTO "Slot" ("userId", "doctorId", "bookingDate", "slotTime", "status") VALUES
(1, 3, '2026-05-20', '10:00', 'booked'),
(2, 5, '2026-05-21', '14:30', 'booked'),
(3, 4, '2026-05-22', '09:15', 'booked'),
(NULL, 1, '2026-05-23', '09:00', 'available'),
(NULL, 1, '2026-05-23', '10:00', 'available'),
(NULL, 2, '2026-05-24', '11:00', 'available');

-- Insert into Appointment (Referencing User, Doctor, and Slot IDs)
INSERT INTO "Appointment" ("userId", "doctorId", "slotId", "requestGroupId", "slotTime", "appointmentDate", "reasonOfAppointment", "status") VALUES
(1, 3, 1, 1001, '10:00:00', '2026-05-20', 'Routine checkup for a minor gunshot wound recovery.', 'confirmed'),
(2, 5, 2, 1002, '14:30:00', '2026-05-21', 'Consultation regarding arc reactor localized chest discomfort.', 'confirmed'),
(3, 4, 3, 1003, '09:15:00', '2026-05-22', 'Reviewing strange forensic pathology findings.', 'pending'),
(4, 2, 5, 1004, '11:00:00', '2026-05-24', 'Consultation for localized abdominal pain.', 'pending');

-- Insert into Report
INSERT INTO "Report" ("userId", "uploadedBy", "doctorId", "title", "category", "fileSize", "fileData", "mimeType", "visibility", "originalFileName") VALUES
(1, 'Doctor Watson', 3, 'Blood Panel Analysis', 'lab', 2048, 'ZHVtbXk=', 'application/pdf', 'private', 'blood_test_holmes.pdf'),
(2, 'Doctor Strange', 5, 'Brain MRI Scan', 'scan', 15420, 'ZHVtbXk=', 'application/pdf', 'private', 'mri_stark_t.pdf'),
(3, 'Agent Scully', 4, 'Autopsy Consultation Report', 'other', 5120, 'ZHVtbXk=', 'application/pdf', 'doctor', 'case_file_x.pdf'),
(4, 'Doctor Grey', 2, 'Pre-Op Ultrasound', 'scan', 4096, 'ZHVtbXk=', 'image/png', 'private', 'ultrasound_appendix.png');

-- Insert into Hospital
INSERT INTO "Hospital" ("name", "doctorId", "bed", "room", "oxygenCylinder") VALUES
('Princeton-Plainsboro Teaching Hospital', 1, 500, 150, 200),
('Seattle Grace Hospital', 2, 400, 120, 180),
('St. Bartholomews Hospital', 3, 250, 80, 90),
('Metro-General Hospital', 5, 600, 200, 300);


-- ============================================================================
-- EMERGENCY CORE MODULE
-- Run emergency_migration.sql separately, or include below for a fresh install.
-- ============================================================================

CREATE TYPE emergency_status_enum AS ENUM (
  'CREATED', 'ACTIVE', 'HOSPITAL_IDENTIFIED', 'AMBULANCE_ASSIGNED',
  'PATIENT_PICKED_UP', 'PATIENT_ADMITTED', 'COMPLETED', 'CANCELLED'
);

CREATE TYPE emergency_event_type_enum AS ENUM (
  'EMERGENCY_CREATED', 'LOCATION_CAPTURED', 'TOKEN_CREATED', 'QR_GENERATED',
  'FAMILY_NOTIFIED', 'STATUS_UPDATED', 'EMERGENCY_CANCELLED', 'EMERGENCY_COMPLETED',
  'HOSPITAL_ASSIGNED', 'AMBULANCE_ASSIGNED', 'PATIENT_PICKED_UP', 'PATIENT_ADMITTED',
  'TOKEN_REVOKED', 'ACCESS_GRANTED'
);

CREATE TYPE notification_channel_enum  AS ENUM ('sms', 'whatsapp', 'email', 'push');
CREATE TYPE notification_status_enum   AS ENUM ('queued', 'sent', 'failed', 'delivered');
CREATE TYPE emergency_actor_type_enum  AS ENUM ('user', 'system', 'doctor', 'hospital', 'admin');

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

CREATE TABLE IF NOT EXISTS emergency_events (
  id                SERIAL PRIMARY KEY,
  emergency_case_id INTEGER NOT NULL REFERENCES emergency_cases(id) ON DELETE CASCADE,
  event_type        emergency_event_type_enum NOT NULL,
  event_data        JSONB DEFAULT '{}',
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emergency_events_case_id    ON emergency_events(emergency_case_id);
CREATE INDEX IF NOT EXISTS idx_emergency_events_created_at ON emergency_events(created_at ASC);

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
