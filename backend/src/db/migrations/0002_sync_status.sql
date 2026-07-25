-- Add sync metadata required by the offline-first client.
ALTER TABLE categories ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE investment_value_snapshots ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE goals ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE goal_allocations ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
