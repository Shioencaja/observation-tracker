-- Create function to get all users (for admin user management)
-- This function returns all authenticated users with their basic info

CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  email text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.id as user_id,
    au.email
  FROM auth.users au
  WHERE au.email IS NOT NULL
  ORDER BY au.email;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_all_users() IS 'Returns all authenticated users with their basic info for project user management';

