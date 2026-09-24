import type { Database } from 'bun:sqlite';

export interface Migration {
	version: number;
	up: (db: Database) => void;
}

export const MIGRATIONS: readonly Migration[] = [
	{
		version: 1,
		up(db) {
			db.exec(`
				CREATE TABLE projects (
					id TEXT PRIMARY KEY,
					name TEXT NOT NULL,
					next_task_number INTEGER NOT NULL DEFAULT 1 CHECK (next_task_number >= 1),
					created_at TEXT NOT NULL,
					updated_at TEXT NOT NULL
				);

				CREATE TABLE tasks (
					id TEXT PRIMARY KEY,
					project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
					number INTEGER NOT NULL CHECK (number >= 1),
					title TEXT NOT NULL,
					description TEXT,
					status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'blocked', 'done', 'canceled')),
					derived_from_task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
					created_at TEXT NOT NULL,
					updated_at TEXT NOT NULL,
					completed_at TEXT,
					UNIQUE (project_id, number)
				);

				CREATE INDEX idx_tasks_project_status ON tasks (project_id, status);
				CREATE INDEX idx_tasks_derived_from ON tasks (derived_from_task_id);

				CREATE TABLE comments (
					id TEXT PRIMARY KEY,
					task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
					type TEXT NOT NULL CHECK (type IN ('comment', 'analysis', 'progress', 'result', 'system')),
					author_type TEXT NOT NULL CHECK (author_type IN ('user', 'agent', 'system')),
					author TEXT,
					content TEXT NOT NULL,
					created_at TEXT NOT NULL,
					updated_at TEXT
				);

				CREATE INDEX idx_comments_task_created ON comments (task_id, created_at);
			`);
		},
	},
	{
		version: 2,
		up(db) {
			db.exec('ALTER TABLE projects ADD COLUMN path TEXT;');
		},
	},
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS.at(-1)?.version ?? 0;
