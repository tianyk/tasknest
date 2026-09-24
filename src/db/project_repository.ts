import type { Database } from 'bun:sqlite';
import type { Project } from '../types/models';

interface ProjectRow {
	id: string;
	name: string;
	path: string | null;
	created_at: string;
	updated_at: string;
}

export function insertProject(
	db: Database,
	input: { id: string; name: string; path?: string; now: Date },
): Project {
	const timestamp = input.now.toISOString();
	db.query(
		'INSERT INTO projects (id, name, path, next_task_number, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)',
	).run(input.id, input.name, input.path ?? null, timestamp, timestamp);
	return {
		id: input.id,
		name: input.name,
		path: input.path,
		createdAt: input.now,
		updatedAt: input.now,
	};
}

export function getProjectById(db: Database, id: string): Project | null {
	const row = db
		.query('SELECT id, name, path, created_at, updated_at FROM projects WHERE id = ?')
		.get(id) as ProjectRow | null;
	return row === null ? null : toProject(row);
}

export function listProjects(db: Database): Project[] {
	const rows = db
		.query(
			'SELECT id, name, path, created_at, updated_at FROM projects ORDER BY created_at ASC, id ASC',
		)
		.all() as ProjectRow[];
	return rows.map(toProject);
}

export function updateProjectPath(
	db: Database,
	input: { id: string; path: string; now: Date },
): void {
	db.query('UPDATE projects SET path = ?, updated_at = ? WHERE id = ?').run(
		input.path,
		input.now.toISOString(),
		input.id,
	);
}

export function allocateTaskNumber(db: Database, projectId: string): number | null {
	const row = db
		.query(
			'UPDATE projects SET next_task_number = next_task_number + 1 WHERE id = ? RETURNING next_task_number - 1 AS number',
		)
		.get(projectId) as { number: number } | null;
	return row === null ? null : row.number;
}

function toProject(row: ProjectRow): Project {
	return {
		id: row.id,
		name: row.name,
		path: row.path ?? undefined,
		createdAt: new Date(row.created_at),
		updatedAt: new Date(row.updated_at),
	};
}
