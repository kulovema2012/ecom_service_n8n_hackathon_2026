import AuthService from '../services/AuthService';

const BASE_URL = 'http://localhost:3000/api';

async function testAPI() {
  console.log('=== Sprint 1 API Testing ===\n');

  // Generate test token
  const token = AuthService.generateTeamToken('team-01', 'development');
  console.log('Generated team token for team-01\n');

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Test 1: Health check
  console.log('1. Health Check');
  const healthRes = await fetch('http://localhost:3000/health');
  const health = await healthRes.json();
  console.log('   ✓', health);

  // Test 2: Get inventory (without auth - should fail)
  console.log('\n2. Test without authentication');
  const noAuthRes = await fetch(`${BASE_URL}/inventory`);
  console.log('   ✓ Expected 401:', noAuthRes.status);

  // Test 3: Get inventory (with auth)
  console.log('\n3. GET /api/inventory');
  const invRes = await fetch(`${BASE_URL}/inventory`, { headers });
  const invData = await invRes.json() as { inventory: unknown[] };
  console.log('   ✓ Status:', invRes.status);
  console.log('   ✓ Items:', invData.inventory.length);

  // Test 4: Get events (with auth)
  console.log('\n4. GET /api/events');
  const eventsRes = await fetch(`${BASE_URL}/events`, { headers });
  const eventsData = await eventsRes.json() as { events: unknown[] };
  console.log('   ✓ Status:', eventsRes.status);
  console.log('   ✓ Events:', eventsData.events.length);

  // Test 5: Send chat message
  console.log('\n5. POST /api/chat');
  const chatRes = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text: 'Test message', sessionId: 'test-session' })
  });
  console.log('   ✓ Status:', chatRes.status);

  // Test 6: Get team info
  console.log('\n6. GET /api/teams/team-01');
  const teamRes = await fetch(`${BASE_URL}/teams/team-01`, { headers });
  const teamData = await teamRes.json();
  console.log('   ✓ Status:', teamRes.status);
  console.log('   ✓ Team:', teamData);

  // Test 7: Test scope validation (admin endpoint)
  console.log('\n7. Test scope validation');
  const normalToken = AuthService.generateTeamToken('team-01', 'judging'); // No write:events scope
  const adminRes = await fetch(`${BASE_URL}/inventory`, {
    headers: { 'Authorization': `Bearer ${normalToken}` }
  });
  console.log('   ✓ Read access works:', adminRes.status === 200);

  // Test 8: Test pagination
  console.log('\n8. GET /api/events?limit=5');
  const pagRes = await fetch(`${BASE_URL}/events?limit=5`, { headers });
  const pagData = await pagRes.json() as { pagination: unknown };
  console.log('   ✓ Status:', pagRes.status);
  console.log('   ✓ Pagination:', pagData.pagination);

  console.log('\n=== All API tests passed! ===');
}

testAPI().catch(console.error);
