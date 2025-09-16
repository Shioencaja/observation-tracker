-- Fix UUID type casting issues in existing functions
-- Run this in your Supabase SQL editor to fix the current error

-- Fix validate_option_ids function
CREATE OR REPLACE FUNCTION validate_option_ids(option_ids TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  option_id_array TEXT[];
  option_id TEXT;
  option_count INTEGER;
BEGIN
  IF option_ids IS NULL OR option_ids = '' THEN
    RETURN TRUE;
  END IF;
  
  option_id_array := string_to_array(option_ids, ',');
  
  -- Check if all option IDs exist
  FOR option_id IN SELECT unnest(option_id_array)
  LOOP
    SELECT COUNT(*) INTO option_count
    FROM observation_options 
    WHERE id = option_id::UUID;
    
    IF option_count = 0 THEN
      RETURN FALSE;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Fix get_option_names function
CREATE OR REPLACE FUNCTION get_option_names(option_ids TEXT)
RETURNS TEXT[] AS $$
BEGIN
  IF option_ids IS NULL OR option_ids = '' THEN
    RETURN ARRAY[]::TEXT[];
  END IF;
  
  RETURN ARRAY(
    SELECT name 
    FROM observation_options 
    WHERE id = ANY(string_to_array(option_ids, ',')::UUID[])
    ORDER BY name
  );
END;
$$ LANGUAGE plpgsql;

-- Test the functions
SELECT 'Functions updated successfully' as status;
