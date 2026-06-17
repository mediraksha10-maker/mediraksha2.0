import { pool } from "./config/db.js";

export default async function seed() {
    try {
        console.log("Starting database seeding...");

        // 1. CREATE ENUM TYPES (Conditional check via DO block)
        const createEnumsQuery = `
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_enum') THEN
                    CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other');
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status_enum') THEN
                    CREATE TYPE appointment_status_enum AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'slot_status_enum') THEN
                    CREATE TYPE slot_status_enum AS ENUM ('available', 'booked', 'blocked');
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_category_enum') THEN
                    CREATE TYPE report_category_enum AS ENUM ('lab', 'prescription', 'scan', 'other');
                END IF;
            END $$;
        `;
        await pool.query(createEnumsQuery);
        console.log("Enums checked/created successfully.");

        // 2. CREATE TABLES
        const createTablesQuery = `
            -- Doctor Table
            CREATE TABLE IF NOT EXISTS "Doctor" (
                "id" SERIAL PRIMARY KEY,
                "name" VARCHAR NOT NULL,
                "email" VARCHAR UNIQUE NOT NULL,
                "number" VARCHAR,
                "age" INTEGER,
                "gender" gender_enum,
                "hospital" VARCHAR,
                "speciality" VARCHAR,
                "password" VARCHAR NOT NULL,
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- User Table
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

            -- Slot Table
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

            -- Appointment Table
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

            -- Report Table
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

            -- Hospital Table
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

            -- Bed Booking Table
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

            -- Diseases Table
            CREATE TABLE IF NOT EXISTS "Disease" (
                "id" SERIAL PRIMARY KEY,
                "code" INTEGER UNIQUE,
                "name" VARCHAR NOT NULL,
                "symtom" VARCHAR,
                "solution" VARCHAR,
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await pool.query(createTablesQuery);
        console.log("All tables checked/created successfully.");

    } catch (e) {
        console.error("Error during database seeding:", e);
        throw e; 
    }
}