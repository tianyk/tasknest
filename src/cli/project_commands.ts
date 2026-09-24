import { initProject, listProjects, resolveProject } from '../core/project';
import { CliUsageError, expectPositionals, parseArgs } from './args';
import { writeLine } from './output';

const INIT_SPEC = { values: ['--name'], flags: [] } as const;
const PROJECT_SPEC = { values: [], flags: [] } as const;

export function handleInit(argv: string[]): number {
	const input = parseArgs(argv, INIT_SPEC);
	expectPositionals(input, 0, 'init 不接受位置参数');
	const name = input.values.get('--name');
	const result = initProject({
		cwd: process.cwd(),
		...(name === undefined ? {} : { name }),
	});
	writeLine(
		result.created ? `已初始化项目 ${result.project.name}` : `项目已就绪：${result.project.name}`,
	);
	return 0;
}

export function handleProject(argv: string[]): number {
	const input = parseArgs(argv, PROJECT_SPEC);
	if (input.positionals.length === 0) {
		writeLine(resolveProject(process.cwd()).name);
		return 0;
	}
	if (input.positionals.length === 1 && input.positionals[0] === 'list') {
		for (const project of listProjects()) {
			writeLine(project.name);
		}
		return 0;
	}
	throw new CliUsageError(`未知的 project 子命令：${input.positionals.join(' ')}`);
}
