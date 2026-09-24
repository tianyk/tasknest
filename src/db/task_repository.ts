import type { Database } from 'bun:sqlite';
import type { Task, TaskStatus } from '../types/models';

const TASK_COLUMNS =
	'id, project_id, number, title, description, status, derived_from_task_id, created_at, updated_at, completed_at';

interface TaskRow {
	id: string;
	project_id: string;
	number: number;
	title: string;
	description: string | null;
	status: TaskStatus;
	derived_from_task_id: string | null;
	created_at: string;
	updated_at: string;
	completed_at: string | null;
}

export function insertTask(
	db: Database,
	input: {
		id: string;
		projectId: string;
		number: number;
		title: string;
		description: string | null;
		derivedFromTaskId: string | null;
		now: Date;
	},
): Task {
	const timestamp = input.now.toISOString();
	db.query(
		`INSERT INTO tasks (${TASK_COLUMNS}) VALUES (?, ?, ?, ?, ?, 'todo', ?, ?, ?, NULL)`,
	).run(
		input.id,
		input.projectId,
		input.number,
		input.title,
		input.description,
		input.derivedFromTaskId,
		timestamp,
		timestamp,
	);
	return {
		id: input.id,
		number: input.number,
		projectId: input.projectId,
		title: input.title,
		description: input.description ?? undefined,
		status: 'todo',
		derivedFromTaskId: input.derivedFromTaskId ?? undefined,
		createdAt: input.now,
		updatedAt: input.now,
	};
}

export function getTaskByNumber(db: Database, projectId: string, number: number): Task | null {
	const row = db
		.query(`SELECT ${TASK_COLUMNS} FROM tasks WHERE project_id = ? AND number = ?`)
		.get(projectId, number) as TaskRow | null;
	return row === null ? null : toTask(row);
}

export function getTaskById(db: Database, id: string): Task | null {
	const row = db
		.query(`SELECT ${TASK_COLUMNS} FROM tasks WHERE id = ?`)
		.get(id) as TaskRow | null;
	return row === null ? null : toTask(row);
}

export function listTasksByStatuses(
	db: Database,
	projectId: string,
	statuses: readonly TaskStatus[] | null,
): Task[] {
	if (statuses === null) {
		const rows = db
			.query(`SELECT ${TASK_COLUMNS} FROM tasks WHERE project_id = ? ORDER BY number ASC`)
			.all(projectId) as TaskRow[];
		return rows.map(toTask);
	}
	if (statuses.length === 0) {
		return [];
	}
	const placeholders = statuses.map(() => '?').join(', ');
	const rows = db
		.query(
			`SELECT ${TASK_COLUMNS} FROM tasks WHERE project_id = ? AND status IN (${placeholders}) ORDER BY number ASC`,
		)
		.all(projectId, ...statuses) as TaskRow[];
	return rows.map(toTask);
}

export function updateTaskContent(
	db: Database,
	input: { id: string; title: string; description: string | null; now: Date },
): void {
	db.query('UPDATE tasks SET title = ?, description = ?, updated_at = ? WHERE id = ?').run(
		input.title,
		input.description,
		input.now.toISOString(),
		input.id,
	);
}

export function updateTaskStatus(
	db: Database,
	input: { id: string; status: TaskStatus; completedAt: Date | null; now: Date },
): void {
	db.query('UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?').run(
		input.status,
		input.completedAt === null ? null : input.completedAt.toISOString(),
		input.now.toISOString(),
		input.id,
	);
}

export function deleteTaskById(db: Database, id: string): void {
	db.query('DELETE FROM tasks WHERE id = ?').run(id);
}

function toTask(row: TaskRow): Task {
	return {
		id: row.id,
		number: row.number,
		projectId: row.project_id,
		title: row.title,
		description: row.description ?? undefined,
		status: row.status,
		derivedFromTaskId: row.derived_from_task_id ?? undefined,
		createdAt: new Date(row.created_at),
		updatedAt: new Date(row.updated_at),
		completedAt: row.completed_at === null ? undefined : new Date(row.completed_at),
	};
}
