import type { TaskDetail } from '../core/task';
import type { Comment, Project, Task } from '../types/models';

const STATUS_COLUMN_WIDTH = 13;

export function formatLocalTime(date: Date): string {
	const pad = (value: number) => String(value).padStart(2, '0');
	return [
		`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
		`${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
	].join(' ');
}

export function formatProjectLine(project: Project): string {
	return project.path === undefined ? project.name : `${project.name}  ${project.path}`;
}

export function formatTaskLine(task: Task): string {
	const status = `[${task.status}]`.padEnd(STATUS_COLUMN_WIDTH);
	return `#${task.number} ${status}  ${task.title}`;
}

export function formatTaskDetail(project: Project, detail: TaskDetail): string {
	const { task, derivedFrom, comments } = detail;
	const lines = [
		`#${task.number} ${task.title}`,
		`项目：${project.name}`,
		`状态：${task.status}`,
		`创建时间：${formatLocalTime(task.createdAt)}`,
		`更新时间：${formatLocalTime(task.updatedAt)}`,
		`完成时间：${task.completedAt === undefined ? '-' : formatLocalTime(task.completedAt)}`,
		`来源：${derivedFrom === null ? '-' : `#${derivedFrom.number} ${derivedFrom.title}`}`,
	];
	if (task.description === undefined) {
		lines.push('描述：-');
	} else {
		lines.push('描述：', task.description);
	}
	if (comments.length === 0) {
		lines.push('评论：无');
	} else {
		lines.push('评论：');
		for (const comment of comments) {
			lines.push(formatCommentLine(comment));
		}
	}
	return lines.join('\n');
}

function formatCommentLine(comment: Comment): string {
	const author = comment.author === undefined ? '' : `(${comment.author})`;
	return `[${formatLocalTime(comment.createdAt)}] ${comment.type}/${comment.authorType}${author} ${comment.content}`;
}
