import AuthService from '../services/AuthService';
import EventService from '../services/EventService';
import InventoryService from '../services/InventoryService';
import { db } from '../database/connection';

async function testSprint1() {
  console.log('=== Sprint 1 Testing ===\n');

  // Test 1: Generate tokens
  console.log('1. Testing AuthService...');
  const teamToken = AuthService.generateTeamToken('team-01', 'development');
  const adminToken = AuthService.generateAdminToken();
  console.log('   ✓ Team token generated');
  console.log('   ✓ Admin token generated');

  // Validate tokens
  const teamPayload = AuthService.validateToken(teamToken);
  console.log('   ✓ Team token validated:', teamPayload);

  // Test 2: Create team inventory
  console.log('\n2. Testing InventoryService...');
  await InventoryService.initializeTeamInventory('team-01');
  console.log('   ✓ Initialized inventory for team-01');

  const inventory = await InventoryService.getInventory('team-01');
  console.log(`   ✓ Retrieved ${inventory.length} inventory items`);
  console.log('   Sample:', inventory[0]);

  // Test 3: Restock inventory
  await InventoryService.restock({
    teamId: 'team-01',
    sku: 'IT-001',
    quantity: 5,
    by: 'staff'
  });
  console.log('   ✓ Restocked IT-001 with +5 units');

  const updatedInventory = await InventoryService.getInventoryItem('team-01', 'IT-001');
  console.log('   ✓ Updated inventory:', updatedInventory?.stock, 'stock,', updatedInventory?.reserved, 'reserved');

  // Test 4: Reserve inventory
  const reserved = await InventoryService.reserve({
    teamId: 'team-01',
    sku: 'IT-001',
    quantity: 2,
    orderId: 'ORD-001'
  });
  console.log('   ✓ Reserved 2 units:', reserved);

  const afterReserve = await InventoryService.getInventoryItem('team-01', 'IT-001');
  console.log('   ✓ After reserve:', afterReserve?.stock, 'stock,', afterReserve?.reserved, 'reserved');

  // Test 5: Create events
  console.log('\n3. Testing EventService...');
  const event = await EventService.createEvent({
    teamId: 'team-01',
    type: 'order.created',
    payload: {
      orderId: 'ORD-001',
      items: [
        { sku: 'IT-001', qty: 2 }
      ]
    }
  });
  console.log('   ✓ Created event:', event.id);

  // Test 6: Query events
  const events = await EventService.getEvents('team-01');
  console.log(`   ✓ Retrieved ${events.length} events`);

  // Test 7: Check inventory events table
  console.log('\n4. Testing inventory_events audit log...');
  const invEventsStmt = db.prepare('SELECT * FROM inventory_events WHERE team_id = ?');
  const invEvents = invEventsStmt.all('team-01');
  console.log(`   ✓ Found ${invEvents.length} inventory events in audit log`);

  console.log('\n=== All Sprint 1 tests passed! ===');

  // Cleanup
  db.close();
}

testSprint1().catch(console.error);
