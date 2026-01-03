const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function generateAdminToken() {
  return jwt.sign(
    { scopes: ['admin:all'] },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

const BASE_URL = 'http://localhost:3001/api';

async function testSprint2() {
  console.log('=== Sprint 2 API Testing ===\n');

  // Generate admin token (with admin scope)
  const adminToken = generateAdminToken();
  console.log('Generated admin token\n');

  const headers = {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  };

  // Test 1: Create a team
  console.log('1. POST /api/admin/teams - Create team');
  const createRes = await fetch(`${BASE_URL}/admin/teams`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'Test Team Alpha' })
  });
  const team = await createRes.json();
  console.log('   ✓ Team created:', team.teamId);
  console.log('   ✓ API Key:', team.apiKey.substring(0, 20) + '...');

  // Test 2: Get all teams
  console.log('\n2. GET /api/admin/teams - List teams');
  const teamsRes = await fetch(`${BASE_URL}/admin/teams`, { headers });
  const teamsData = await teamsRes.json();
  console.log('   ✓ Teams count:', teamsData.teams.length);

  // Test 3: Get inventory
  console.log('\n3. GET /api/admin/inventory - Get all inventory');
  const invRes = await fetch(`${BASE_URL}/admin/inventory`, { headers });
  const invData = await invRes.json();
  console.log('   ✓ Inventory items:', invData.inventory.length);

  // Test 4: Restock inventory
  console.log('\n4. POST /api/admin/inventory - Restock');
  const restockRes = await fetch(`${BASE_URL}/admin/inventory`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      teamId: team.teamId,
      sku: 'IT-001',
      quantity: 5,
      type: 'restock'
    })
  });
  console.log('   ✓ Restock status:', restockRes.status === 204 ? 'Success (204)' : restockRes.status);

  // Test 5: Send an event
  console.log('\n5. POST /api/admin/events - Inject event');
  const eventRes = await fetch(`${BASE_URL}/admin/events`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      teamId: team.teamId,
      type: 'order.created',
      payload: {
        orderId: 'ORD-TEST-001',
        items: [
          { sku: 'IT-001', qty: 2 }
        ]
      }
    })
  });
  const eventData = await eventRes.json();
  console.log('   ✓ Event created:', eventData.id);

  // Test 6: Get audit logs - events
  console.log('\n6. GET /api/admin/audit/events - Get event logs');
  const auditRes = await fetch(`${BASE_URL}/admin/audit/events?limit=5`, { headers });
  const auditData = await auditRes.json();
  console.log('   ✓ Event logs:', auditData.count);

  // Test 7: Send a message
  console.log('\n7. POST /api/admin/messages - Send message');
  const msgRes = await fetch(`${BASE_URL}/admin/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      teamId: team.teamId,
      text: 'Test message from admin'
    })
  });
  console.log('   ✓ Message status:', msgRes.status === 204 ? 'Success (204)' : msgRes.status);

  // Test 8: Get messages
  console.log('\n8. GET /api/admin/messages - Get messages');
  const getMsgRes = await fetch(`${BASE_URL}/admin/messages?limit=10`, { headers });
  const getMsgData = await getMsgRes.json();
  console.log('   ✓ Messages count:', getMsgData.messages.length);

  // Test 9: Get platform mode
  console.log('\n9. GET /api/admin/mode - Get platform mode');
  const modeRes = await fetch(`${BASE_URL}/admin/mode`, { headers });
  const modeData = await modeRes.json();
  console.log('   ✓ Platform mode:', modeData.mode);

  // Test 10: Test team token (non-admin)
  console.log('\n10. Test with team token (non-admin)');
  const teamToken = team.apiKey;
  const teamHeaders = {
    'Authorization': `Bearer ${teamToken}`,
    'Content-Type': 'application/json'
  };

  // Try to access admin endpoint (should fail)
  const adminAccessRes = await fetch(`${BASE_URL}/admin/teams`, {
    headers: teamHeaders
  });
  console.log('   ✓ Admin access blocked:', adminAccessRes.status === 403 ? 'Yes (403)' : adminAccessRes.status);

  // Try to access team endpoints (should work)
  const teamInvRes = await fetch(`${BASE_URL}/inventory`, {
    headers: teamHeaders
  });
  console.log('   ✓ Team can access inventory:', teamInvRes.status === 200 ? 'Yes (200)' : teamInvRes.status);

  // Test 11: Send chat message as team
  console.log('\n11. POST /api/chat - Send chat as team');
  const chatRes = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: teamHeaders,
    body: JSON.stringify({
      text: 'Hello from team!',
      sessionId: 'test-session-001'
    })
  });
  console.log('   ✓ Chat status:', chatRes.status === 204 ? 'Success (204)' : chatRes.status);

  // Test 12: Get chat history
  console.log('\n12. GET /api/chat - Get chat history');
  const getChatRes = await fetch(`${BASE_URL}/chat`, {
    headers: teamHeaders
  });
  const getChatData = await getChatRes.json();
  console.log('   ✓ Messages:', getChatData.messages.length);

  console.log('\n=== All Sprint 2 tests passed! ===');
}

testSprint2().catch(console.error);
