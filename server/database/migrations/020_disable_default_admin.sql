-- Migration: Disable default admin account for production security
-- ⚠️  CRITICAL: Run this migration before deploying to production
-- Note: You must create a new admin user before disabling the default one

-- Add a flag to mark the default admin
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_default_user BOOLEAN DEFAULT FALSE;

-- Mark the default admin
UPDATE users 
SET is_default_user = TRUE 
WHERE username = 'admin' AND email = 'admin@example.com';

-- Add a comment explaining the security requirement
COMMENT ON COLUMN users.is_default_user IS 'Marks default/demo users that should be disabled in production';

-- Create a function to check if any active admin exists
CREATE OR REPLACE FUNCTION has_active_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE role = 'admin' 
    AND is_active = TRUE 
    AND is_default_user = FALSE
  );
END;
$$ LANGUAGE plpgsql;

-- Create a production security check view
CREATE OR REPLACE VIEW v_production_security_checks AS
SELECT 
  'Default Admin Account' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM users WHERE is_default_user = TRUE AND is_active = TRUE)
    THEN 'FAIL - Default admin still active'
    ELSE 'PASS'
  END as status,
  'Disable default admin account before production deployment' as recommendation
UNION ALL
SELECT 
  'Active Admin Exists' as check_name,
  CASE 
    WHEN has_active_admin()
    THEN 'PASS'
    ELSE 'FAIL - No active admin user found'
  END as status,
  'Create at least one production admin user using create-admin.js script' as recommendation
UNION ALL
SELECT 
  'User Count' as check_name,
  CASE 
    WHEN (SELECT COUNT(*) FROM users WHERE is_active = TRUE AND is_default_user = FALSE) > 0
    THEN 'PASS - ' || (SELECT COUNT(*) FROM users WHERE is_active = TRUE AND is_default_user = FALSE)::TEXT || ' production users'
    ELSE 'WARN - Only default users exist'
  END as status,
  'Create production users before deployment' as recommendation;

-- Instructions for production deployment
COMMENT ON VIEW v_production_security_checks IS 
'Run: SELECT * FROM v_production_security_checks; 
Before production deployment to ensure security requirements are met.

STEPS FOR PRODUCTION:
1. Create new admin: node scripts/create-admin.js
2. Test login with new admin account
3. Disable default admin: UPDATE users SET is_active = FALSE WHERE is_default_user = TRUE;
4. Verify: SELECT * FROM v_production_security_checks;';

-- Log this migration
INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address)
VALUES (
  (SELECT id FROM users WHERE username = 'admin' LIMIT 1),
  'MIGRATION',
  'security',
  '020',
  '{"message": "Added default user tracking and production security checks"}',
  '127.0.0.1'
);
