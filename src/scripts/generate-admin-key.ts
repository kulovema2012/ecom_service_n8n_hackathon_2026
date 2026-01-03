import AuthService from '../services/AuthService';

/**
 * Generate an Admin API Key
 *
 * This script generates a JWT token with admin:all scope
 * that can be used to access all admin APIs.
 */

function generateAdminKey() {
  const adminToken = AuthService.generateAdminToken();

  console.log('\n=== Admin API Key Generated ===\n');
  console.log('Copy this key and use it in the Authorization header:\n');
  console.log('Authorization: Bearer <paste-key-here>\n');
  console.log('--- Admin API Key ---');
  console.log(adminToken);
  console.log('--- End ---\n');
  console.log('Example usage:');
  console.log('curl -H "Authorization: Bearer <paste-key-here>" http://localhost:3000/api/admin/teams\n');
}

generateAdminKey();
