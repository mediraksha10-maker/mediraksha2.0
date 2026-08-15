-- ============================================================================
-- MEDICAL RECORDS MODULE MIGRATION
-- Run this once against the 'saswath' database to enable the full
-- medical records, tags, collections, and patient summary features.
-- ============================================================================

-- 1. Add 'discharge' to the category enum (safe if already present in PG 14+)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'discharge'
      AND enumtypid = 'report_category_enum'::regtype
  ) THEN
    ALTER TYPE report_category_enum ADD VALUE 'discharge';
  END IF;
END$$;

-- 2. Add missing columns to the existing "Report" table
ALTER TABLE "Report"
  ADD COLUMN IF NOT EXISTS "recordId"        VARCHAR,
  ADD COLUMN IF NOT EXISTS "specialization"  VARCHAR,
  ADD COLUMN IF NOT EXISTS "hospital"        VARCHAR,
  ADD COLUMN IF NOT EXISTS "visitDate"       DATE,
  ADD COLUMN IF NOT EXISTS "notes"           TEXT,
  ADD COLUMN IF NOT EXISTS "isImportant"     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "isArchived"      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "isPinned"        BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. PatientSummary — one row per user, upserted on save
CREATE TABLE IF NOT EXISTS "PatientSummary" (
  "id"               SERIAL PRIMARY KEY,
  "userId"           INTEGER NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "bloodGroup"       VARCHAR(10),
  "knownConditions"  TEXT,
  "allergies"        TEXT,
  "emergencyContact" VARCHAR(200),
  "healthRemarks"    TEXT,
  "updated_at"       TIMESTAMP DEFAULT NOW()
);

-- 4. RecordTag — user-owned tags
CREATE TABLE IF NOT EXISTS "RecordTag" (
  "id"      SERIAL PRIMARY KEY,
  "userId"  INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name"    VARCHAR(50) NOT NULL,
  "color"   VARCHAR(20) NOT NULL DEFAULT 'indigo',
  UNIQUE ("userId", "name")
);

-- 5. ReportTagAssignment — many-to-many: reports ↔ tags
CREATE TABLE IF NOT EXISTS "ReportTagAssignment" (
  "reportId" INTEGER NOT NULL REFERENCES "Report"("id") ON DELETE CASCADE,
  "tagId"    INTEGER NOT NULL REFERENCES "RecordTag"("id") ON DELETE CASCADE,
  PRIMARY KEY ("reportId", "tagId")
);

-- 6. ReportConnection — bidirectional link between two reports
CREATE TABLE IF NOT EXISTS "ReportConnection" (
  "id"             SERIAL PRIMARY KEY,
  "sourceReportId" INTEGER NOT NULL REFERENCES "Report"("id") ON DELETE CASCADE,
  "targetReportId" INTEGER NOT NULL REFERENCES "Report"("id") ON DELETE CASCADE,
  UNIQUE ("sourceReportId", "targetReportId")
);

-- 7. RecordActivity — audit log per record
CREATE TABLE IF NOT EXISTS "RecordActivity" (
  "id"        SERIAL PRIMARY KEY,
  "reportId"  INTEGER NOT NULL REFERENCES "Report"("id") ON DELETE CASCADE,
  "userId"    INTEGER NOT NULL,
  "action"    VARCHAR(100) NOT NULL,
  "detail"    TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_record_activity_report ON "RecordActivity"("reportId");

-- 8. Collection — user-owned groups (Medical Journeys)
CREATE TABLE IF NOT EXISTS "Collection" (
  "id"          SERIAL PRIMARY KEY,
  "userId"      INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name"        VARCHAR(200) NOT NULL,
  "description" TEXT,
  "created_at"  TIMESTAMP DEFAULT NOW(),
  "updated_at"  TIMESTAMP DEFAULT NOW()
);

-- 9. CollectionRecord — many-to-many: collections ↔ reports
CREATE TABLE IF NOT EXISTS "CollectionRecord" (
  "collectionId" INTEGER NOT NULL REFERENCES "Collection"("id") ON DELETE CASCADE,
  "reportId"     INTEGER NOT NULL REFERENCES "Report"("id") ON DELETE CASCADE,
  "addedAt"      TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY ("collectionId", "reportId")
);
