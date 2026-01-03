import EventService from './EventService';
import ChatService from './ChatService';
import TeamService from './TeamService';

const SKUS = ['IT-001', 'IT-002', 'IT-003', 'IT-004', 'IT-005', 'IT-006', 'IT-007', 'IT-008'];

const CUSTOMER_MESSAGES = [
  "When will my order arrive?",
  "I want to cancel my order",
  "Can I get a refund?",
  "Item arrived damaged",
  "How do I track my order?",
  "I need to change my shipping address",
  "Is this product in stock?",
  "Can I get a bulk discount?",
];

export class CustomerBot {
  /**
   * Generate a random order event for a team
   */
  async generateRandomOrder(teamId: string): Promise<void> {
    const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items
    const items = [];

    for (let i = 0; i < numItems; i++) {
      const sku = SKUS[Math.floor(Math.random() * SKUS.length)];
      const qty = Math.floor(Math.random() * 5) + 1; // 1-5 quantity
      items.push({ sku, qty });
    }

    await EventService.createEvent({
      teamId,
      type: 'order.created',
      payload: {
        orderId: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        items,
        customerName: `Customer ${Math.floor(Math.random() * 10000)}`,
      },
    });
  }

  /**
   * Generate a random paid order event
   */
  async generateRandomPaidOrder(teamId: string): Promise<void> {
    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // First create order
    await EventService.createEvent({
      teamId,
      type: 'order.created',
      payload: {
        orderId,
        items: [{ sku: SKUS[Math.floor(Math.random() * SKUS.length)], qty: 1 }],
      },
    });

    // Then mark as paid (simulate delay)
    setTimeout(async () => {
      await EventService.createEvent({
        teamId,
        type: 'order.paid',
        payload: {
          orderId,
          paymentMethod: 'credit_card',
          amount: Math.floor(Math.random() * 1000) + 100,
        },
      });
    }, Math.random() * 5000); // 0-5 second delay
  }

  /**
   * Generate a cancellation event
   */
  async generateCancellation(teamId: string): Promise<void> {
    await EventService.createEvent({
      teamId,
      type: 'order.cancelled',
      payload: {
        orderId: `ORD-${Math.floor(Math.random() * 100000)}`,
        reason: ['customer_request', 'out_of_stock', 'payment_failed'][
          Math.floor(Math.random() * 3)
        ],
      },
    });
  }

  /**
   * Generate a customer chat message
   */
  async generateCustomerMessage(teamId: string): Promise<void> {
    const message = CUSTOMER_MESSAGES[Math.floor(Math.random() * CUSTOMER_MESSAGES.length)];

    await ChatService.sendMessage({
      teamId,
      from: 'customer_bot',
      text: message,
      sessionId: `chat-${Date.now()}`,
    });
  }

  /**
   * Generate a dispute event
   */
  async generateDispute(teamId: string): Promise<void> {
    await EventService.createEvent({
      teamId,
      type: 'order.dispute_opened',
      payload: {
        orderId: `ORD-${Math.floor(Math.random() * 100000)}`,
        reason: ['item_not_received', 'damaged_item', 'wrong_item'][
          Math.floor(Math.random() * 3)
        ],
      },
    });
  }

  /**
   * Generate a refund request event
   */
  async generateRefundRequest(teamId: string): Promise<void> {
    await EventService.createEvent({
      teamId,
      type: 'order.refund_requested',
      payload: {
        orderId: `ORD-${Math.floor(Math.random() * 100000)}`,
        reason: ['no_longer_needed', 'product_defect', 'wrong_item'][
          Math.floor(Math.random() * 3)
        ],
      },
    });
  }

  /**
   * Generate a random mix of events for a team
   */
  async generateRandomEvents(teamId: string, count: number = 5): Promise<void> {
    const generators = [
      () => this.generateRandomOrder(teamId),
      () => this.generateRandomPaidOrder(teamId),
      () => this.generateCustomerMessage(teamId),
      () => this.generateCancellation(teamId),
      () => this.generateDispute(teamId),
      () => this.generateRefundRequest(teamId),
    ];

    for (let i = 0; i < count; i++) {
      const generator = generators[Math.floor(Math.random() * generators.length)];
      await generator();

      // Random delay between events
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000));
    }
  }

  /**
   * Generate events for all teams
   */
  async generateEventsForAllTeams(count: number = 3): Promise<void> {
    const teams = await TeamService.getAllTeams();

    for (const team of teams) {
      await this.generateRandomEvents(team.teamId, count);
    }
  }

  /**
   * Start generating events on a schedule
   */
  startScheduledEvents(intervalMinutes: number = 5): NodeJS.Timeout {
    return setInterval(async () => {
      console.log(`Customer Bot: Generating events for all teams`);
      await this.generateEventsForAllTeams(1); // Generate 1 event per team
    }, intervalMinutes * 60 * 1000);
  }
}

export default new CustomerBot();
