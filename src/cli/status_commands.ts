import { resolveProject } from '../core/project';
import { updateTaskStatus } from '../core/task';
import { TASK_STATUSES, type TaskStatus } from '../types/models';
import { CliUsageError, expectPositionals, parseArgs, parseTaskNumber } from './args';
import { writeLine } from './output';

const STATUS_SPEC = { values: [], flags: [] } as const;

const STATUS_ALIASES: Record<string, TaskStatus> = {
	start: 'in_progress',
	block: 'blocked',
	done: 'done',
	cancel: 'canceled',
	reopen: 'todo',
};

export function handleStatusAlias(command: string, argv: string[]): number {
	const input = parseArgs(argv, STATUS_SPEC);
	expectPositionals(input, 1, `${command} 需要一个任务编号`);
	const number = parseTaskNumber(input.positionals[0] as string);
	return applyStatus(number, STATUS_ALIASES[command] as TaskStatus);
}

export function handleStatus(argv: string[]): number {
	const input = parseArgs(argv, STATUS_SPEC);
	expectPositionals(input, 2, 'status 需要一个任务编号和一个状态');
	const number = parseTaskNumber(input.positionals[0] as string);
	const status = parseStatusValue(input.positionals[1] as string);
	return applyStatus(number, status);
}

export function parseStatusValue(raw: string): TaskStatus {
	if (!TASK_STATUSES.includes(raw as TaskStatus)) {
		throw new CliUsageError(`无效的状态：${raw}（可选：${TASK_STATUSES.join(' / ')}）`);
	}
	return raw as TaskStatus;
}

function applyStatus(number: number, status: TaskStatus): number {
	const project = resolveProject(process.cwd());
	const result = updateTaskStatus(project, number, status);
	writeLine(
		result.changed
			? `#${number} 状态已更新为 ${result.task.status}`
			: `#${number} 状态已是 ${result.task.status}`,
	);
	return 0;
}
