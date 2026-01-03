export interface Inventory {
  teamId: string;
  sku: string;
  name: string;
  stock: number;
  reserved: number;
  available: number; // Computed: stock - reserved
  version: number;
  updatedAt: string;
}

export interface InventoryEvent {
  id: string;
  teamId: string;
  sku: string;
  type: 'restocked' | 'reserved' | 'released' | 'adjusted';
  quantity: number;
  previousStock: number;
  newStock: number;
  by: 'staff' | 'system' | 'customer_bot';
  createdAt: string;
}

export interface RestockDTO {
  teamId: string;
  sku: string;
  quantity: number;
  by: 'staff' | 'system';
}

export interface ReserveDTO {
  teamId: string;
  sku: string;
  quantity: number;
  orderId: string;
}
