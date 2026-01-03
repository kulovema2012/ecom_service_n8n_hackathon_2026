import db from './connection';

// Verify SKUs
const skus = db.prepare('SELECT * FROM skus').all();
console.log('SKUs in database:');
console.table(skus);

// Verify tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
console.log('\nTables created:');
tables.forEach(t => console.log(`  - ${t.name}`));

process.exit(0);
