-- Migration: Add subject_code field to subjects table
-- Date: 2025-07-31
-- Description: Adds optional subject_code field for user-defined subject codes (e.g., MATH401, CS101)

-- Add subject_code column to subjects table
ALTER TABLE public.subjects 
ADD COLUMN subject_code VARCHAR(10) NULL;

-- Add constraint to ensure subject codes follow proper format
ALTER TABLE public.subjects 
ADD CONSTRAINT subject_code_format 
CHECK (subject_code IS NULL OR subject_code ~ '^[A-Z0-9]{2,10}$');

-- Add comment for documentation
COMMENT ON COLUMN public.subjects.subject_code IS 'Optional user-defined subject code (e.g., MATH401, CS101). Must be 2-10 characters, uppercase letters and numbers only.';

-- Create index for subject_code for better query performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_subjects_subject_code ON public.subjects(subject_code) WHERE subject_code IS NOT NULL;

-- Update RLS policies to include subject_code (if needed)
-- Note: Existing RLS policies should automatically apply to the new column since they use SELECT * patterns