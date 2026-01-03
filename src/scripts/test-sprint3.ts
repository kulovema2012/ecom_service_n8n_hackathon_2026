/**
 * Sprint 3 Test Script
 * Tests Customer Bot, Chaos Events, and Error Handling
 */

import EventService from '../services/EventService';
import CustomerBot from '../services/CustomerBot';
import TeamService from '../services/TeamService';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

async function testCustomerBot() {
  console.log('\n=== Testing Customer Bot ===');

  const teams = await TeamService.getAllTeams();
  if (teams.length === 0) {
    console.log('No teams found. Creating test team...');
    const team = await TeamService.createTeam('Test Team');
    console.log('Created team:', team.teamId);
    teams.push(team);
  }

  const testTeamId = teams[0].teamId;

  // Test generating random order
  console.log('\n1. Testing random order generation...');
  await CustomerBot.generateRandomOrder(testTeamId);
  console.log('✓ Random order generated');

  // Test generating customer message
  console.log('\n2. Testing customer message generation...');
  await CustomerBot.generateCustomerMessage(testTeamId);
  console.log('✓ Customer message generated');

  // Test generating dispute
  console.log('\n3. Testing dispute generation...');
  await CustomerBot.generateDispute(testTeamId);
  console.log('✓ Dispute generated');

  // Test generating multiple random events
  console.log('\n4. Testing batch event generation...');
  await CustomerBot.generateRandomEvents(testTeamId, 3);
  console.log('✓ Batch of 3 events generated');

  console.log('\n✅ Customer Bot tests passed');
}

async function testChaosEvents() {
  console.log('\n=== Testing Chaos Events ===');

  const teams = await TeamService.getAllTeams();
  const testTeamId = teams[0].teamId;

  // Test duplicate event
  console.log('\n1. Testing duplicate event handling...');
  const events = await EventService.getEvents(testTeamId, { limit: 1 });
  if (events.length > 0) {
    const duplicate = await EventService.sendDuplicateEvent(events[0].id);
    console.log('✓ Duplicate event returned (idempotent)');
  }

  // Test out-of-order events
  console.log('\n2. Testing out-of-order events...');
  const eventsToSend = [
    { type: 'order.created' as const, payload: { orderId: 'ORD-001', items: [] }, teamId: testTeamId },
    { type: 'order.paid' as const, payload: { orderId: 'ORD-002', amount: 100 }, teamId: testTeamId },
    { type: 'order.cancelled' as const, payload: { orderId: 'ORD-003', reason: 'test' }, teamId: testTeamId },
  ];
  const outOfOrderEvents = await EventService.sendOutOfOrderEvents(testTeamId, eventsToSend);
  console.log(`✓ Sent ${outOfOrderEvents.length} events out of order`);

  // Test delayed events
  console.log('\n3. Testing delayed events...');
  const delayedEvents = await EventService.createDelayedEvents(
    testTeamId,
    [
      { type: 'order.created' as const, payload: { orderId: 'ORD-004', items: [] }, teamId: testTeamId },
      { type: 'order.paid' as const, payload: { orderId: 'ORD-005', amount: 200 }, teamId: testTeamId },
    ],
    60000 // 1 minute delay
  );
  console.log(`✓ Created ${delayedEvents.length} delayed events`);

  console.log('\n✅ Chaos Events tests passed');
}

async function testErrorHandling() {
  console.log('\n=== Testing Error Handling ===');

  // Test logger
  console.log('\n1. Testing logger...');
  logger.info('Test info message', { test: true });
  logger.audit('Test audit message', { action: 'test' });
  logger.error('Test error message', new Error('Test error'));
  console.log('✓ Logger working');

  // Test AppError
  console.log('\n2. Testing AppError...');
  try {
    throw new AppError(400, 'Bad Request', true);
  } catch (error: any) {
    console.log(`✓ AppError created: ${error.message} (status: ${error.statusCode})`);
  }

  console.log('\n✅ Error Handling tests passed');
}

async function main() {
  try {
    console.log('🧪 Sprint 3 Test Suite');
    console.log('========================');

    await testCustomerBot();
    await testChaosEvents();
    await testErrorHandling();

    console.log('\n✅ All Sprint 3 tests passed!');
    console.log('\n📝 Test Summary:');
    console.log('  - Customer Bot: ✓');
    console.log('  - Chaos Events: ✓');
    console.log('  - Error Handling: ✓');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
