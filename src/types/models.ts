export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done' | 'canceled';

export const TASK_STATUSES: readonly TaskStatus[] = [
	'todo',
	'in_progress',
	'blocked',
	'done',
	'canceled',
];

export type CommentType = 'comment' | 'analysis' | 'progress' | 'result' | 'system';

export type AuthorType = 'user' | 'agent' | 'system';

export interface Project {
	id: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface Task {
	id: string;
	number: number;
	projectId: string;
	title: string;
	description?: string;
	status: TaskStatus;
	derivedFromTaskId?: string;
	createdAt: Date;
	updatedAt: Date;
	completedAt?: Date;
}

export interface Comment {
	id: string;
	taskId: string;
	type: CommentType;
	authorType: AuthorType;
	author?: string;
	content: string;
	createdAt: Date;
	updatedAt?: Date;
}

export interface ProjectMarker {
	id: string;
	name: string;
}
