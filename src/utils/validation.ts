import { EventType } from '../models/Event';

export function validateEventPayload(type: EventType, payload: unknown): boolean {
  switch (type) {
    case 'order.created':
    case 'order.paid':
      return validateOrderPayload(payload);

    case 'order.cancelled':
    case 'order.refund_requested':
    case 'order.dispute_opened':
      return validateOrderCancellationPayload(payload);

    case 'inventory.restocked':
    case 'inventory.manual_adjusted':
      return validateInventoryPayload(payload);

    default:
      return true; // Allow unknown event types
  }
}

function validateOrderPayload(payload: any): boolean {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof payload.orderId === 'string' &&
    Array.isArray(payload.items) &&
    payload.items.every((item: any) =>
      typeof item.sku === 'string' && typeof item.qty === 'number'
    )
  );
}

function validateOrderCancellationPayload(payload: any): boolean {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof payload.orderId === 'string'
  );
}

function validateInventoryPayload(payload: any): boolean {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof payload.sku === 'string' &&
    typeof payload.quantity === 'number'
  );
}
