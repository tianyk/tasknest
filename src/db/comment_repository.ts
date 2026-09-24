import type { Database } from 'bun:sqlite';
import type { AuthorType, Comment, CommentType } from '../types/models';

const COMMENT_COLUMNS = 'id, task_id, type, author_type, author, content, created_at, updated_at';

interface CommentRow {
	id: string;
	task_id: string;
	type: CommentType;
	author_type: AuthorType;
	author: string | null;
	content: string;
	created_at: string;
	updated_at: string | null;
}

export function insertComment(
	db: Database,
	input: {
		id: string;
		taskId: string;
		type: CommentType;
		authorType: AuthorType;
		author: string | null;
		content: string;
		now: Date;
	},
): Comment {
	db.query(
		`INSERT INTO comments (${COMMENT_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
	).run(
		input.id,
		input.taskId,
		input.type,
		input.authorType,
		input.author,
		input.content,
		input.now.toISOString(),
	);
	return {
		id: input.id,
		taskId: input.taskId,
		type: input.type,
		authorType: input.authorType,
		author: input.author ?? undefined,
		content: input.content,
		createdAt: input.now,
	};
}

export function listCommentsByTask(db: Database, taskId: string): Comment[] {
	const rows = db
		.query(
			`SELECT ${COMMENT_COLUMNS} FROM comments WHERE task_id = ? ORDER BY created_at ASC, id ASC`,
		)
		.all(taskId) as CommentRow[];
	return rows.map(toComment);
}

function toComment(row: CommentRow): Comment {
	return {
		id: row.id,
		taskId: row.task_id,
		type: row.type,
		authorType: row.author_type,
		author: row.author ?? undefined,
		content: row.content,
		createdAt: new Date(row.created_at),
		updatedAt: row.updated_at === null ? undefined : new Date(row.updated_at),
	};
}
