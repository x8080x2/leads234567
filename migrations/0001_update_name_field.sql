
-- Migration to combine firstName and lastName into single name field
ALTER TABLE email_searches 
ADD COLUMN name TEXT;

-- Update existing records (if any)
UPDATE email_searches 
SET name = CONCAT(first_name, ' ', last_name) 
WHERE first_name IS NOT NULL AND last_name IS NOT NULL;

-- Make name column required
ALTER TABLE email_searches 
ALTER COLUMN name SET NOT NULL;

-- Drop old columns
ALTER TABLE email_searches 
DROP COLUMN first_name,
DROP COLUMN last_name;
