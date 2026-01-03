import db from '../connection';

const SKUS = [
  { sku: 'IT-001', name: 'NVMe SSD 1TB', category: 'Storage', initial_stock: 20 },
  { sku: 'IT-002', name: 'DDR5 RAM 32GB', category: 'Memory', initial_stock: 15 },
  { sku: 'IT-003', name: 'USB-C Docking Station', category: 'Accessories', initial_stock: 25 },
  { sku: 'IT-004', name: '10GbE Network Switch', category: 'Networking', initial_stock: 10 },
  { sku: 'IT-005', name: 'Firewall Appliance', category: 'Security', initial_stock: 8 },
  { sku: 'IT-006', name: 'Mini Server (Barebone)', category: 'Compute', initial_stock: 5 },
  { sku: 'IT-007', name: 'Cloud Backup License', category: 'Software', initial_stock: 100 },
  { sku: 'IT-008', name: 'VPN Gateway License', category: 'Software', initial_stock: 100 },
];

export function seedSKUs() {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO skus (sku, name, category, initial_stock)
    VALUES (@sku, @name, @category, @initial_stock)
  `);

  const insertMany = db.transaction((skus: typeof SKUS) => {
    for (const sku of skus) {
      insert.run(sku);
    }
  });

  insertMany(SKUS);
  console.log(`Seeded ${SKUS.length} SKUs`);
}

if (require.main === module) {
  seedSKUs();
}
