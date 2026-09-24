import type { Database } from 'bun:sqlite';
import { getDatabase, withImmediateTransaction } from '../db/database';
import { listCommentsByTask } from '../db/comment_repository';
import { allocateTaskNumber } from '../db/project_repository';
import {
	deleteTaskById,
	getTaskById,
	getTaskByNumber,
	insertTask,
	listTasksByStatuses,
	updateTaskContent,
	updateTaskStatus as updateTaskStatusRow,
} from '../db/task_repository';
import { TASK_STATUSES, type Comment, type Project, type Task, type TaskStatus } from '../types/models';
import { InvalidStatusTransitionError, ProjectNotFoundError, TaskNotFoundError, ValidationError } from './errors';

const OPEN_STATUSES: readonly TaskStatus[] = ['todo', 'in_progress', 'blocked'];

const STATUS_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
	todo: ['in_progress', 'done', 'canceled'],
	in_progress: ['todo', 'blocked', 'done', 'canceled'],
	blocked: ['todo', 'in_progress', 'done', 'canceled'],
	done: ['todo'],
	canceled: ['todo'],
};

export interface TaskDetail {
	task: Task;
	derivedFrom: { number: number; title: string } | null;
	comments: Comment[];
}

export interface TaskChangeSet {
	title?: string;
	description?: string | null;
}

export type TaskListFilter =
	| { mode: 'open' }
	| { mode: 'all' }
	| { mode: 'status'; status: TaskStatus };

export function createTask(project: Project, input: { title: string; description?: string }): Task {
	const title = normalizeTitle(input.title);
	const description = normalizeDescription(input.description);
	const db = getDatabase();
	return withImmediateTransaction(db, () => {
		return insertNewTask(db, project, { title, description, derivedFromTaskId: null });
	});
}

export function getTask(project: Project, number: number): TaskDetail {
	const db = getDatabase();
	const task = requireTaskByNumber(db, project.id, number);
	let derivedFrom: TaskDetail['derivedFrom'] = null;
	if (task.derivedFromTaskId !== undefined) {
		const source = getTaskById(db, task.derivedFromTaskId);
		if (source !== null) {
			derivedFrom = { number: source.number, title: source.title };
		}
	}
	return { task, derivedFrom, comments: listCommentsByTask(db, task.id) };
}

export function listTasks(project: Project, filter: TaskListFilter): Task[] {
	const db = getDatabase();
	if (filter.mode === 'open') {
		return listTasksByStatuses(db, project.id, OPEN_STATUSES);
	}
	if (filter.mode === 'all') {
		return listTasksByStatuses(db, project.id, null);
	}
	requireStatus(filter.status);
	return listTasksByStatuses(db, project.id, [filter.status]);
}

export function updateTask(project: Project, number: number, changes: TaskChangeSet): Task {
	const hasTitle = changes.title !== undefined;
	const hasDescription = changes.description !== undefined;
	if (!hasTitle && !hasDescription) {
		throw new ValidationError('至少需要提供标题或描述');
	}
	const nextTitle = hasTitle ? normalizeTitle(changes.title as string) : null;
	const nextDescription = hasDescription ? normalizeDescription(changes.description) : null;
	const db = getDatabase();
	return withImmediateTransaction(db, () => {
		const task = requireTaskByNumber(db, project.id, number);
		const title = nextTitle ?? task.title;
		const description = hasDescription ? nextDescription : (task.description ?? null);
		if (title === task.title && description === (task.description ?? null)) {
			return task;
		}
		const now = new Date();
		updateTaskContent(db, { id: task.id, title, description, now });
		return {
			...task,
			title,
			description: description ?? undefined,
			updatedAt: now,
		};
	});
}

export function updateTaskStatus(
	project: Project,
	number: number,
	status: TaskStatus,
): { task: Task; changed: boolean } {
	requireStatus(status);
	const db = getDatabase();
	return withImmediateTransaction(db, () => {
		const task = requireTaskByNumber(db, project.id, number);
		if (task.status === status) {
			return { task, changed: false };
		}
		const allowed = STATUS_TRANSITIONS[task.status];
		if (!allowed.includes(status)) {
			throw new InvalidStatusTransitionError(`状态不能从 ${task.status} 变更为 ${status}`);
		}
		const now = new Date();
		const completedAt = status === 'done' ? now : null;
		updateTaskStatusRow(db, { id: task.id, status, completedAt, now });
		return {
			task: {
				...task,
				status,
				completedAt: completedAt ?? undefined,
				updatedAt: now,
			},
			changed: true,
		};
	});
}

export function deleteTask(project: Project, number: number): void {
	const db = getDatabase();
	const task = requireTaskByNumber(db, project.id, number);
	deleteTaskById(db, task.id);
}

export function splitTask(
	project: Project,
	sourceNumber: number,
	input: { title: string; description?: string },
): Task {
	const title = normalizeTitle(input.title);
	const description = normalizeDescription(input.description);
	const db = getDatabase();
	return withImmediateTransaction(db, () => {
		const source = requireTaskByNumber(db, project.id, sourceNumber);
		return insertNewTask(db, project, {
			title,
			description,
			derivedFromTaskId: source.id,
		});
	});
}

function insertNewTask(
	db: Database,
	project: Project,
	input: { title: string; description: string | null; derivedFromTaskId: string | null },
): Task {
	const number = allocateTaskNumber(db, project.id);
	if (number === null) {
		throw new ProjectNotFoundError(`项目不存在：${project.name}`);
	}
	return insertTask(db, {
		id: Bun.randomUUIDv7(),
		projectId: project.id,
		number,
		title: input.title,
		description: input.description,
		derivedFromTaskId: input.derivedFromTaskId,
		now: new Date(),
	});
}

function requireTaskByNumber(db: Database, projectId: string, number: number): Task {
	const task = getTaskByNumber(db, projectId, number);
	if (task === null) {
		throw new TaskNotFoundError(`任务 #${number} 不存在`);
	}
	return task;
}

function requireStatus(status: TaskStatus): void {
	if (!TASK_STATUSES.includes(status)) {
		throw new ValidationError(`无效的状态：${status}`);
	}
}

function normalizeTitle(title: string): string {
	const normalized = title.trim();
	if (normalized === '') {
		throw new ValidationError('标题不能为空');
	}
	return normalized;
}

function normalizeDescription(description: string | null | undefined): string | null {
	if (description === undefined || description === null) {
		return null;
	}
	return description.trim() === '' ? null : description;
}
