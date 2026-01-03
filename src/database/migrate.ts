import db from './connection';
import fs from 'fs';
import path from 'path';

const migrationsDir = path.join(__dirname, 'migrations');

export function runMigrations() {
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Running ${migrationFiles.length} migrations...`);

  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    console.log(`Running migration: ${file}`);
    db.exec(sql);
  }

  console.log('Migrations completed successfully');
}

if (require.main === module) {
  runMigrations();
}
