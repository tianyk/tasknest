import pkg from '../../package.json';
import {
	InvalidProjectMarkerError,
	InvalidStatusTransitionError,
	ProjectBindingConflictError,
	ProjectNotFoundError,
	TaskNotFoundError,
	ValidationError,
} from '../core/errors';
import { CliUsageError } from './args';
import { handleComment } from './comment_commands';
import { writeError, writeLine } from './output';
import { handleInit, handleProject } from './project_commands';
import { handleStatus, handleStatusAlias } from './status_commands';
import {
	handleAdd,
	handleDelete,
	handleEdit,
	handleList,
	handleShow,
	handleSplit,
} from './task_commands';

const HELP_TEXT = `tasknest ${pkg.version} — 本地项目任务管理

用法：
  tasknest <命令> [参数]

Project：
  init [--name <名称>]                       初始化当前目录的 Project
  project                                    显示当前 Project
  project list                               列出全部 Project（含 Personal）

Task：
  add <标题> [--description <描述>]          创建 Task
  list [--all | --status <状态>]             列出 Task（默认 todo / in_progress / blocked）
  show <编号>                                查看 Task 详情与评论
  edit <编号> [--title <标题>] [--description <描述>]
  delete <编号>                              删除 Task
  split <编号> <标题> [--description <描述>] 拆分 Task 并建立 derived_from

Status：
  start | block | done | cancel | reopen <编号>  设置状态
  status <编号> <状态>                           通用状态命令（todo / in_progress / blocked / done / canceled）

Context：
  comment <编号> <内容> [--type <类型>] [--author-type <user|agent>] [--author <名称>]

选项：
  --help      显示帮助
  --version   显示版本`;

const COMMANDS: Record<string, (argv: string[]) => number> = {
	init: handleInit,
	project: handleProject,
	add: handleAdd,
	list: handleList,
	show: handleShow,
	edit: handleEdit,
	delete: handleDelete,
	split: handleSplit,
	start: (argv) => handleStatusAlias('start', argv),
	block: (argv) => handleStatusAlias('block', argv),
	done: (argv) => handleStatusAlias('done', argv),
	cancel: (argv) => handleStatusAlias('cancel', argv),
	reopen: (argv) => handleStatusAlias('reopen', argv),
	status: handleStatus,
	comment: handleComment,
};

export function main(argv: string[]): number {
	try {
		return dispatch(argv);
	} catch (error) {
		writeError(`错误：${errorMessage(error)}`);
		return exitCodeFor(error);
	}
}

function dispatch(argv: string[]): number {
	const command = argv[0];
	const rest = argv.slice(1);
	if (command === undefined) {
		writeError(HELP_TEXT);
		return 2;
	}
	if (command === '--help') {
		writeLine(HELP_TEXT);
		return 0;
	}
	if (command === '--version') {
		writeLine(`tasknest ${pkg.version}`);
		return 0;
	}
	if (command.startsWith('--')) {
		throw new CliUsageError(`未知参数：${command}`);
	}
	if (rest.includes('--help')) {
		writeLine(HELP_TEXT);
		return 0;
	}
	const handler = COMMANDS[command];
	if (handler === undefined) {
		throw new CliUsageError(`未知命令：${command}`);
	}
	return handler(rest);
}

function exitCodeFor(error: unknown): number {
	if (error instanceof CliUsageError || error instanceof ValidationError) {
		return 2;
	}
	if (error instanceof ProjectNotFoundError || error instanceof TaskNotFoundError) {
		return 3;
	}
	if (
		error instanceof InvalidStatusTransitionError ||
		error instanceof InvalidProjectMarkerError ||
		error instanceof ProjectBindingConflictError
	) {
		return 4;
	}
	return 1;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
