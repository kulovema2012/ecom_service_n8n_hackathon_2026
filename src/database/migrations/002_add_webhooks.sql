-- Team webhook URLs table
CREATE TABLE IF NOT EXISTS team_webhooks (
  team_id TEXT PRIMARY KEY,
  webhook_url TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_team_webhooks_team_id ON team_webhooks(team_id);
