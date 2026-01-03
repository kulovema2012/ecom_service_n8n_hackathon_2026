export interface Event {
  id: string;
  teamId: string;
  type: EventType;
  payload: unknown;
  createdAt: string;
  processedAt?: string;
  metadata?: EventMetadata;
}

export interface EventMetadata {
  correlationId?: string;
  causationId?: string;
  replayOf?: string;
  delayedUntil?: string;
  outOfOrder?: string;
}

export type EventType =
  | "order.created"
  | "order.paid"
  | "order.cancelled"
  | "order.refund_requested"
  | "order.dispute_opened"
  | "inventory.restocked"
  | "inventory.shortage_detected"
  | "inventory.manual_adjusted"
  | "event.duplicate_sent"
  | "event.delayed"
  | "event.out_of_order";

export interface CreateEventDTO {
  teamId: string;
  type: EventType;
  payload: unknown;
  metadata?: EventMetadata;
}

export interface EventFilters {
  type?: EventType;
  since?: string;
  limit?: number;
}
