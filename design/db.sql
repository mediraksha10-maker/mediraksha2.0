-- ============================================================================
-- 1. CREATE ENUM TYPES
-- ============================================================================
CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other');
CREATE TYPE appointment_status_enum AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
CREATE TYPE slot_status_enum AS ENUM ('available', 'booked', 'blocked');
CREATE TYPE report_category_enum AS ENUM ('lab_report', 'prescription', 'scan', 'other');

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
    "fileId" INTEGER,
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
INSERT INTO Doctor ("name", "email", "number", "age", "gender", "hospital", "speciality", "password") VALUES
('Dr. Gregory House', 'house@diagnostics.com', '555-0101', 45, 'male', 'Princeton-Plainsboro', 'Diagnostic Medicine', 'hashed_pass_1'),
('Dr. Meredith Grey', 'meredith@seattlegrace.com', '555-0102', 38, 'female', 'Seattle Grace Hospital', 'General Surgery', 'hashed_pass_2'),
('Dr. John Watson', 'watson@bakerstreet.com', '555-0103', 40, 'male', 'St. Bartholomews', 'General Practice', 'hashed_pass_3'),
('Dr. Dana Scully', 'scully@fbi.gov', '555-0104', 35, 'female', 'Our Lady of Lourdes', 'Pathology', 'hashed_pass_4'),
('Dr. Stephen Strange', 'strange@kamartaj.com', '555-0105', 42, 'male', 'Metro-General Hospital', 'Neurosurgery', 'hashed_pass_5');

-- Insert into Disease
INSERT INTO Disease ("code", "name", "symtom", "solution") VALUES
(101, 'Influenza (Flu)', 'Fever, chills, muscle aches, cough, fatigue', 'Rest, hydration, antiviral medication if caught early.'),
(102, 'Acute Appendicitis', 'Severe abdominal pain starting near navel moving to lower right, nausea, fever', 'Emergency surgical removal of the appendix.'),
(103, 'Hypertension', 'Often asymptomatic, occasional headaches, shortness of breath, dizziness', 'Lifestyle changes (diet, exercise) and antihypertensive medication.'),
(104, 'Migraine', 'Severe throbbing headache, usually on one side, nausea, sensitivity to light/sound', 'Pain relievers, trigger avoidance, preventive medication.'),
(105, 'Type 2 Diabetes', 'Increased thirst, frequent urination, increased hunger, fatigue, blurry vision', 'Dietary modifications, regular exercise, metformin or insulin therapy.');

-- Insert into User (Referencing Doctor IDs 1-5 created above)
INSERT INTO User ("name", "email", "number", "age", "gender", "registeredDoctorId", "password") VALUES
('Sherlock Holmes', 'sherlock@bakerstreet.com', '555-1111', 34, 'male', 3, 'password123'),
('Tony Stark', 'tony@starkindustries.com', '555-2222', 48, 'male', 5, 'jarvis123'),
('Fox Mulder', 'mulder@fbi.gov', '555-3333', 37, 'male', 4, 'iwanttobelieve'),
('Jane Doe', 'jane.doe@email.com', '555-4444', 29, 'female', 2, 'securepass'),
('John Smith', 'john.smith@email.com', '555-5555', 52, 'male', NULL, 'mysecretpassword');

-- Insert into Slot (Referencing Doctor IDs and User IDs)
INSERT INTO Slot ("userId", "doctorId", "bookingDate", "status") VALUES
(1, 3, '2026-05-20', 'booked'),
(2, 5, '2026-05-21', 'booked'),
(3, 4, '2026-05-22', 'booked'),
(NULL, 1, '2026-05-23', 'available'),
(NULL, 2, '2026-05-24', 'available');

-- Insert into Appointment (Referencing User, Doctor, and Slot IDs)
INSERT INTO Appointment ("userId", "doctorId", "slotId", "requestGroupId", "slotTime", "appointmentDate", "reasonOfAppointment", "status") VALUES
(1, 3, 1, 1001, '10:00:00', '2026-05-20', 'Routine checkup for a minor gunshot wound recovery.', 'confirmed'),
(2, 5, 2, 1002, '14:30:00', '2026-05-21', 'Consultation regarding arc reactor localized chest discomfort.', 'confirmed'),
(3, 4, 3, 1003, '09:15:00', '2026-05-22', 'Reviewing strange forensic pathology findings.', 'pending'),
(4, 2, 5, 1004, '11:00:00', '2026-05-24', 'Consultation for localized abdominal pain.', 'pending');

-- Insert into Report
INSERT INTO Report ("userId", "uploadedBy", "doctorId", "title", "category", "fileSize", "fileId", "visibility", "originalFileName") VALUES
(1, 'Doctor Watson', 3, 'Blood Panel Analysis', 'lab_report', 2048, 98761, 'private', 'blood_test_holmes.pdf'),
(2, 'Doctor Strange', 5, 'Brain MRI Scan', 'scan', 15420, 98762, 'private', 'mri_stark_t.dicom'),
(3, 'Agent Scully', 4, 'Autopsy Consultation Report', 'other', 5120, 98763, 'restricted', 'case_file_x.pdf'),
(4, 'Doctor Grey', 2, 'Pre-Op Ultrasound', 'scan', 4096, 98764, 'private', 'ultrasound_appendix.png');

-- Insert into Hospital
INSERT INTO Hospital ("name", "doctorId", "bed", "room", "oxygenCylinder") VALUES
('Princeton-Plainsboro Teaching Hospital', 1, 500, 150, 200),
('Seattle Grace Hospital', 2, 400, 120, 180),
('St. Bartholomews Hospital', 3, 250, 80, 90),
('Metro-General Hospital', 5, 600, 200, 300);

