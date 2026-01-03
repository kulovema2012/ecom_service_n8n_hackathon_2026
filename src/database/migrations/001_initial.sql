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

CREATE INDEX IF NOT EXISTS idx_events_team_id ON events(team_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

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

CREATE INDEX IF NOT EXISTS idx_inventory_team_id ON inventory(team_id);

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

CREATE INDEX IF NOT EXISTS idx_inventory_events_team_id ON inventory_events(team_id);

-- Messages table (chat)
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  "from" TEXT NOT NULL,
  text TEXT NOT NULL,
  session_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_team_id ON messages(team_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

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
