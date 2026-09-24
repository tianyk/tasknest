import { resolveProject } from '../core/project';
import {
	createTask,
	deleteTask,
	getTask,
	listTasks,
	splitTask,
	updateTask,
	type TaskChangeSet,
	type TaskListFilter,
} from '../core/task';
import { CliUsageError, expectPositionals, parseArgs, parseTaskNumber } from './args';
import { formatTaskDetail, formatTaskLine } from './format';
import { writeLine } from './output';
import { parseStatusValue } from './status_commands';

const ADD_SPEC = { values: ['--description'], flags: [] } as const;
const LIST_SPEC = { values: ['--status'], flags: ['--all'] } as const;
const SHOW_SPEC = { values: [], flags: [] } as const;
const EDIT_SPEC = { values: ['--title', '--description'], flags: [] } as const;
const DELETE_SPEC = { values: [], flags: [] } as const;
const SPLIT_SPEC = { values: ['--description'], flags: [] } as const;

export function handleAdd(argv: string[]): number {
	const input = parseArgs(argv, ADD_SPEC);
	expectPositionals(input, 1, 'add 需要一个标题参数（包含空格时请使用引号）');
	const description = input.values.get('--description');
	const project = resolveProject(process.cwd());
	const task = createTask(project, {
		title: input.positionals[0] as string,
		...(description === undefined ? {} : { description }),
	});
	writeLine(`已创建 #${task.number} ${task.title}`);
	return 0;
}

export function handleList(argv: string[]): number {
	const input = parseArgs(argv, LIST_SPEC);
	expectPositionals(input, 0, 'list 不接受位置参数');
	const all = input.flags.has('--all');
	const statusValue = input.values.get('--status');
	if (all && statusValue !== undefined) {
		throw new CliUsageError('--all 与 --status 不能同时使用');
	}
	let filter: TaskListFilter;
	if (all) {
		filter = { mode: 'all' };
	} else if (statusValue !== undefined) {
		filter = { mode: 'status', status: parseStatusValue(statusValue) };
	} else {
		filter = { mode: 'open' };
	}
	const project = resolveProject(process.cwd());
	for (const task of listTasks(project, filter)) {
		writeLine(formatTaskLine(task));
	}
	return 0;
}

export function handleShow(argv: string[]): number {
	const input = parseArgs(argv, SHOW_SPEC);
	expectPositionals(input, 1, 'show 需要一个任务编号');
	const number = parseTaskNumber(input.positionals[0] as string);
	const project = resolveProject(process.cwd());
	const detail = getTask(project, number);
	writeLine(formatTaskDetail(project, detail));
	return 0;
}

export function handleEdit(argv: string[]): number {
	const input = parseArgs(argv, EDIT_SPEC);
	expectPositionals(input, 1, 'edit 需要一个任务编号');
	const number = parseTaskNumber(input.positionals[0] as string);
	const title = input.values.get('--title');
	const description = input.values.get('--description');
	if (title === undefined && description === undefined) {
		throw new CliUsageError('edit 至少需要 --title 或 --description 之一');
	}
	const changes: TaskChangeSet = {};
	if (title !== undefined) {
		changes.title = title;
	}
	if (description !== undefined) {
		changes.description = description;
	}
	const project = resolveProject(process.cwd());
	updateTask(project, number, changes);
	writeLine(`已更新 #${number}`);
	return 0;
}

export function handleDelete(argv: string[]): number {
	const input = parseArgs(argv, DELETE_SPEC);
	expectPositionals(input, 1, 'delete 需要一个任务编号');
	const number = parseTaskNumber(input.positionals[0] as string);
	const project = resolveProject(process.cwd());
	deleteTask(project, number);
	writeLine(`已删除 #${number}`);
	return 0;
}

export function handleSplit(argv: string[]): number {
	const input = parseArgs(argv, SPLIT_SPEC);
	expectPositionals(input, 2, 'split 需要一个来源编号和一个标题');
	const sourceNumber = parseTaskNumber(input.positionals[0] as string);
	const title = input.positionals[1] as string;
	const description = input.values.get('--description');
	const project = resolveProject(process.cwd());
	const task = splitTask(project, sourceNumber, {
		title,
		...(description === undefined ? {} : { description }),
	});
	writeLine(`已创建 #${task.number} ${task.title}（来源 #${sourceNumber}）`);
	return 0;
}
