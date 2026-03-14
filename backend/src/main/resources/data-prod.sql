-- Fix: Allow null user_id for public files and folders
ALTER TABLE file_metadata ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE folders ALTER COLUMN user_id DROP NOT NULL;
