import { runMigrations } from './migrate';
import { seedSKUs } from './seeds/skus';

export function seedDatabase() {
  console.log('Starting database seeding...');

  // Run migrations first
  runMigrations();

  // Seed SKUs
  seedSKUs();

  console.log('Database seeding completed!');
}

if (require.main === module) {
  seedDatabase();
}
