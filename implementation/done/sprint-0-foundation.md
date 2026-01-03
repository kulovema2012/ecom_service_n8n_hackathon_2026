# Sprint 0: Foundation & Setup

**Sprint Goal:** Establish project infrastructure, database schema, and development environment

**Duration:** 3-4 hours
**Status:** ⏳ Not Started

---

## Stories Overview

| Story | Priority | Estimate | Status |
|-------|----------|----------|--------|
| Story 1: Project Initialization | High | 2 hours | ⏳ Not Started |
| Story 2: Database Setup | High | 2 hours | ⏳ Not Started |

---

## Story 1: Project Initialization

**As a** developer
**I want** to initialize the Node.js/TypeScript project with all dependencies
**So that** I have a working development environment

**Priority:** High
**Estimate:** 2 hours

### Acceptance Criteria
- [ ] Project initialized with `npm init`
- [ ] All required dependencies installed
- [ ] TypeScript configured and working
- [ ] Build and dev scripts work
- [ ] Git repository initialized with proper .gitignore
- [ ] Project folder structure created

### Tasks

#### Task 1.1: Initialize npm project
**Time:** 15 minutes

**Steps:**
1. Run `npm init -y` in project root
2. Create `package.json` with proper metadata
3. Add scripts:
   ```json
   {
     "scripts": {
       "dev": "tsx watch src/index.ts",
       "build": "tsc",
       "start": "node dist/index.js",
       "test": "jest",
       "db:migrate": "tsx src/database/migrate.ts",
       "db:seed": "tsx src/database/seed.ts"
     }
   }
   ```

**Validation:** `npm run --help` shows all scripts

---

#### Task 1.2: Install dependencies
**Time:** 30 minutes

**Dependencies to install:**

```bash
# Runtime dependencies
npm install express ws jsonwebtoken uuid better-sqlite3 cors dotenv

# Development dependencies
npm install -D typescript @types/node @types/express @types/jsonwebtoken @types/uuid @types/better-sqlite3 @types/cors @types/ws tsx jest ts-jest @types/jest
```

**Validation:** `node_modules` folder exists, all packages install without errors

---

#### Task 1.3: Configure TypeScript
**Time:** 20 minutes

**Create `tsconfig.json`:**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "types": ["node", "jest"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Validation:** `npx tsc --noEmit` runs without errors

---

#### Task 1.4: Create folder structure
**Time:** 15 minutes

**Create directories:**
```bash
mkdir -p src/database/migrations
mkdir -p src/database/seeds
mkdir -p src/models
mkdir -p src/services
mkdir -p src/middleware
mkdir -p src/routes
mkdir -p src/config
mkdir -p src/utils
mkdir -p tests/unit
mkdir -p tests/integration
mkdir -p dashboard
mkdir -p data
```

**Validation:** All directories exist

---

#### Task 1.5: Create .gitignore
**Time:** 10 minutes

**Create `.gitignore`:**

```
# Dependencies
node_modules/

# Build output
dist/

# Database
data/
*.db
*.db-shm
*.db-wal

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# Logs
logs/
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
```

**Validation:** `git status` doesn't show ignored files

---

## Story 2: Database Setup

**As a** developer
**I want** to create the database schema and seed initial data
**So that** the platform has a working data store

**Priority:** High
**Estimate:** 2 hours

### Acceptance Criteria
- [ ] SQLite database file is created
- [ ] All tables are created with correct schema
- [ ] Database is in WAL mode
- [ ] Product catalog is seeded with 8 IT products
- [ ] Initial team can be created
- [ ] Migration and seed scripts work

### Tasks

#### Task 2.1: Create database connection module
**Time:** 30 minutes

**Create `src/database/connection.ts`:**

```typescript
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/platform.db');

export const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables directory if it doesn't exist
const fs = require('fs');
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export default db;
```

**Validation:** No errors when importing module

---

#### Task 2.2: Create initial schema migration
**Time:** 45 minutes

**Create `src/database/migrations/001_initial.sql`:**

```sql
-- Events table (immutable log)
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  processed_at TEXT,
  metadata TEXT
);

CREATE INDEX idx_events_team_id ON events(team_id);
CREATE INDEX idx_events_created_at ON events(created_at);

-- Inventory table (current state)
CREATE TABLE IF NOT EXISTS inventory (
  team_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  reserved INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (team_id, sku)
);

CREATE INDEX idx_inventory_team_id ON inventory(team_id);

-- Inventory events table (audit log)
CREATE TABLE IF NOT EXISTS inventory_events (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_inventory_events_team_id ON inventory_events(team_id);

-- Messages table (chat)
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  from TEXT NOT NULL,
  text TEXT NOT NULL,
  session_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_messages_team_id ON messages(team_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  team_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'development',
  created_at TEXT NOT NULL
);

-- SKUs table (product catalog)
CREATE TABLE IF NOT EXISTS skus (
  sku TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  initial_stock INTEGER NOT NULL DEFAULT 20
);
```

**Validation:** All SQL syntax is correct

---

#### Task 2.3: Create migration runner
**Time:** 20 minutes

**Create `src/database/migrate.ts`:**

```typescript
import db from './connection';
import fs from 'fs';
import path from 'path';

const migrationsDir = path.join(__dirname, 'migrations');

function runMigrations() {
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

export { runMigrations };
```

**Validation:** `npm run db:migrate` creates all tables

---

#### Task 2.4: Create SKU seed data
**Time:** 20 minutes

**Create `src/database/seeds/skus.ts`:**

```typescript
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

function seedSKUs() {
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

export { seedSKUs };
```

**Validation:** Running seed populates `skus` table with 8 products

---

#### Task 2.5: Create seed runner
**Time:** 10 minutes

**Create `src/database/seed.ts`:**

```typescript
import { runMigrations } from './migrate';
import { seedSKUs } from './seeds/skus';

function seedDatabase() {
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

export { seedDatabase };
```

**Validation:** `npm run db:seed` runs migrations and seeds data

---

## Sprint Completion Checklist

- [ ] All stories completed per acceptance criteria
- [ ] All tasks completed
- [ ] `npm run db:seed` runs without errors
- [ ] Database file exists in `data/` directory
- [ ] Can query SKUs from database
- [ ] No critical bugs
- [ ] Ready to start Sprint 1

---

## Demo / Verification

**To verify Sprint 0 is complete:**

```bash
# 1. Run database setup
npm run db:seed

# 2. Verify database was created
ls -la data/platform.db

# 3. (Optional) Query database to verify SKUs
sqlite3 data/platform.db "SELECT * FROM skus;"
```

**Expected output:** 8 rows in `skus` table

---

**Sprint 0 Status:** ⏳ Ready to Start
**Last Updated:** 2026-01-03
