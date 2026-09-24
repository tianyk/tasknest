import { getDatabase } from '../db/database';
import { getTaskByNumber } from '../db/task_repository';
import { insertComment, listCommentsByTask } from '../db/comment_repository';
import type { AuthorType, Comment, CommentType, Project } from '../types/models';
import { TaskNotFoundError, ValidationError } from './errors';

export const COMMENT_TYPES_FOR_CLI: readonly CommentType[] = [
	'comment',
	'analysis',
	'progress',
	'result',
];

export const AUTHOR_TYPES_FOR_CLI: readonly AuthorType[] = ['user', 'agent'];

export function addComment(
	project: Project,
	taskNumber: number,
	input: { content: string; type?: CommentType; authorType?: AuthorType; author?: string },
): Comment {
	if (input.content.trim() === '') {
		throw new ValidationError('评论内容不能为空');
	}
	const type = input.type ?? 'comment';
	if (!COMMENT_TYPES_FOR_CLI.includes(type)) {
		throw new ValidationError(`无效的活动类型：${type}`);
	}
	const authorType = input.authorType ?? 'user';
	if (!AUTHOR_TYPES_FOR_CLI.includes(authorType)) {
		throw new ValidationError(`无效的作者类型：${authorType}`);
	}
	let author: string | null = null;
	if (input.author !== undefined) {
		author = input.author.trim();
		if (author === '') {
			throw new ValidationError('作者不能为空');
		}
	}
	const db = getDatabase();
	const task = getTaskByNumber(db, project.id, taskNumber);
	if (task === null) {
		throw new TaskNotFoundError(`任务 #${taskNumber} 不存在`);
	}
	return insertComment(db, {
		id: Bun.randomUUIDv7(),
		taskId: task.id,
		type,
		authorType,
		author,
		content: input.content,
		now: new Date(),
	});
}

export function listComments(project: Project, taskNumber: number): Comment[] {
	const db = getDatabase();
	const task = getTaskByNumber(db, project.id, taskNumber);
	if (task === null) {
		throw new TaskNotFoundError(`任务 #${taskNumber} 不存在`);
	}
	return listCommentsByTask(db, task.id);
}
