-- ============================================================================
-- MEDIRAKSHA — DUMMY DATA SEED (medi-connect-development branch)
-- Extracted from db.sql's old inline "4. INSERT DUMMY DATA" section.
--
-- Run schema.sql FIRST — this file only inserts rows, it creates nothing.
-- Guarded as a single block keyed off Doctor.email, so re-running this file
-- after schema.sql never creates duplicates.
--
-- Run: psql -U <username> -d <dbname> -f seed.sql
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Doctor" WHERE "email" = 'house@diagnostics.com') THEN
    RAISE NOTICE 'Dummy data already exists — skipping.';
    RETURN;
  END IF;

  INSERT INTO "Doctor" ("name", "email", "number", "age", "gender", "hospital", "speciality", "password") VALUES
  ('Dr. Gregory House', 'house@diagnostics.com', '555-0101', 45, 'male', 'Princeton-Plainsboro', 'Diagnostic Medicine', 'hashed_pass_1'),
  ('Dr. Meredith Grey', 'meredith@seattlegrace.com', '555-0102', 38, 'female', 'Seattle Grace Hospital', 'General Surgery', 'hashed_pass_2'),
  ('Dr. John Watson', 'watson@bakerstreet.com', '555-0103', 40, 'male', 'St. Bartholomews', 'General Practice', 'hashed_pass_3'),
  ('Dr. Dana Scully', 'scully@fbi.gov', '555-0104', 35, 'female', 'Our Lady of Lourdes', 'Pathology', 'hashed_pass_4'),
  ('Dr. Stephen Strange', 'strange@kamartaj.com', '555-0105', 42, 'male', 'Metro-General Hospital', 'Neurosurgery', 'hashed_pass_5');

  INSERT INTO "Disease" ("code", "name", "symtom", "solution") VALUES
  (101, 'Influenza (Flu)', 'Fever, chills, muscle aches, cough, fatigue', 'Rest, hydration, antiviral medication if caught early.'),
  (102, 'Acute Appendicitis', 'Severe abdominal pain starting near navel moving to lower right, nausea, fever', 'Emergency surgical removal of the appendix.'),
  (103, 'Hypertension', 'Often asymptomatic, occasional headaches, shortness of breath, dizziness', 'Lifestyle changes (diet, exercise) and antihypertensive medication.'),
  (104, 'Migraine', 'Severe throbbing headache, usually on one side, nausea, sensitivity to light/sound', 'Pain relievers, trigger avoidance, preventive medication.'),
  (105, 'Type 2 Diabetes', 'Increased thirst, frequent urination, increased hunger, fatigue, blurry vision', 'Dietary modifications, regular exercise, metformin or insulin therapy.');

  INSERT INTO "User" ("name", "email", "number", "age", "gender", "registeredDoctorId", "password") VALUES
  ('Sherlock Holmes', 'sherlock@bakerstreet.com', '555-1111', 34, 'male', (SELECT "id" FROM "Doctor" WHERE "email" = 'watson@bakerstreet.com'), 'password123'),
  ('Tony Stark', 'tony@starkindustries.com', '555-2222', 48, 'male', (SELECT "id" FROM "Doctor" WHERE "email" = 'strange@kamartaj.com'), 'jarvis123'),
  ('Fox Mulder', 'mulder@fbi.gov', '555-3333', 37, 'male', (SELECT "id" FROM "Doctor" WHERE "email" = 'scully@fbi.gov'), 'iwanttobelieve'),
  ('Jane Doe', 'jane.doe@email.com', '555-4444', 29, 'female', (SELECT "id" FROM "Doctor" WHERE "email" = 'meredith@seattlegrace.com'), 'securepass'),
  ('John Smith', 'john.smith@email.com', '555-5555', 52, 'male', NULL, 'mysecretpassword');

  INSERT INTO "Slot" ("userId", "doctorId", "bookingDate", "slotTime", "status")
  SELECT (SELECT "id" FROM "User" WHERE "email" = 'sherlock@bakerstreet.com'), (SELECT "id" FROM "Doctor" WHERE "email" = 'watson@bakerstreet.com'), '2026-05-20', '10:00', 'booked'
  UNION ALL
  SELECT (SELECT "id" FROM "User" WHERE "email" = 'tony@starkindustries.com'), (SELECT "id" FROM "Doctor" WHERE "email" = 'strange@kamartaj.com'), '2026-05-21', '14:30', 'booked'
  UNION ALL
  SELECT (SELECT "id" FROM "User" WHERE "email" = 'mulder@fbi.gov'), (SELECT "id" FROM "Doctor" WHERE "email" = 'scully@fbi.gov'), '2026-05-22', '09:15', 'booked'
  UNION ALL
  SELECT NULL, (SELECT "id" FROM "Doctor" WHERE "email" = 'house@diagnostics.com'), '2026-05-23', '09:00', 'available'
  UNION ALL
  SELECT NULL, (SELECT "id" FROM "Doctor" WHERE "email" = 'house@diagnostics.com'), '2026-05-23', '10:00', 'available'
  UNION ALL
  SELECT NULL, (SELECT "id" FROM "Doctor" WHERE "email" = 'meredith@seattlegrace.com'), '2026-05-24', '11:00', 'available';

  INSERT INTO "Appointment" ("userId", "doctorId", "slotId", "requestGroupId", "slotTime", "appointmentDate", "reasonOfAppointment", "status")
  SELECT (SELECT "id" FROM "User" WHERE "email"='sherlock@bakerstreet.com'), (SELECT "id" FROM "Doctor" WHERE "email"='watson@bakerstreet.com'),
         (SELECT "id" FROM "Slot" WHERE "bookingDate"='2026-05-20' AND "slotTime"='10:00'), 1001, '10:00:00', '2026-05-20',
         'Routine checkup for a minor gunshot wound recovery.', 'confirmed'
  UNION ALL
  SELECT (SELECT "id" FROM "User" WHERE "email"='tony@starkindustries.com'), (SELECT "id" FROM "Doctor" WHERE "email"='strange@kamartaj.com'),
         (SELECT "id" FROM "Slot" WHERE "bookingDate"='2026-05-21' AND "slotTime"='14:30'), 1002, '14:30:00', '2026-05-21',
         'Consultation regarding arc reactor localized chest discomfort.', 'confirmed'
  UNION ALL
  SELECT (SELECT "id" FROM "User" WHERE "email"='mulder@fbi.gov'), (SELECT "id" FROM "Doctor" WHERE "email"='scully@fbi.gov'),
         (SELECT "id" FROM "Slot" WHERE "bookingDate"='2026-05-22' AND "slotTime"='09:15'), 1003, '09:15:00', '2026-05-22',
         'Reviewing strange forensic pathology findings.', 'pending'
  UNION ALL
  SELECT (SELECT "id" FROM "User" WHERE "email"='jane.doe@email.com'), (SELECT "id" FROM "Doctor" WHERE "email"='meredith@seattlegrace.com'),
         (SELECT "id" FROM "Slot" WHERE "bookingDate"='2026-05-24' AND "slotTime"='11:00'), 1004, '11:00:00', '2026-05-24',
         'Consultation for localized abdominal pain.', 'pending';

  INSERT INTO "Report" ("userId", "uploadedBy", "doctorId", "title", "category", "fileSize", "fileData", "mimeType", "visibility", "originalFileName") VALUES
  ((SELECT "id" FROM "User" WHERE "email"='sherlock@bakerstreet.com'), 'Doctor Watson', (SELECT "id" FROM "Doctor" WHERE "email"='watson@bakerstreet.com'), 'Blood Panel Analysis', 'lab', 2048, 'ZHVtbXk=', 'application/pdf', 'private', 'blood_test_holmes.pdf'),
  ((SELECT "id" FROM "User" WHERE "email"='tony@starkindustries.com'), 'Doctor Strange', (SELECT "id" FROM "Doctor" WHERE "email"='strange@kamartaj.com'), 'Brain MRI Scan', 'scan', 15420, 'ZHVtbXk=', 'application/pdf', 'private', 'mri_stark_t.pdf'),
  ((SELECT "id" FROM "User" WHERE "email"='mulder@fbi.gov'), 'Agent Scully', (SELECT "id" FROM "Doctor" WHERE "email"='scully@fbi.gov'), 'Autopsy Consultation Report', 'other', 5120, 'ZHVtbXk=', 'application/pdf', 'doctor', 'case_file_x.pdf'),
  ((SELECT "id" FROM "User" WHERE "email"='jane.doe@email.com'), 'Doctor Grey', (SELECT "id" FROM "Doctor" WHERE "email"='meredith@seattlegrace.com'), 'Pre-Op Ultrasound', 'scan', 4096, 'ZHVtbXk=', 'image/png', 'private', 'ultrasound_appendix.png');

  INSERT INTO "Hospital" ("name", "doctorId", "bed", "room", "oxygenCylinder") VALUES
  ('Princeton-Plainsboro Teaching Hospital', (SELECT "id" FROM "Doctor" WHERE "email"='house@diagnostics.com'), 500, 150, 200),
  ('Seattle Grace Hospital', (SELECT "id" FROM "Doctor" WHERE "email"='meredith@seattlegrace.com'), 400, 120, 180),
  ('St. Bartholomews Hospital', (SELECT "id" FROM "Doctor" WHERE "email"='watson@bakerstreet.com'), 250, 80, 90),
  ('Metro-General Hospital', (SELECT "id" FROM "Doctor" WHERE "email"='strange@kamartaj.com'), 600, 200, 300);

  RAISE NOTICE 'Dummy data inserted.';
END $$;
