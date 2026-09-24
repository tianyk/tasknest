export class CliUsageError extends Error {}

export interface ArgSpec {
	values: readonly string[];
	flags: readonly string[];
}

export interface ParsedArgs {
	values: Map<string, string>;
	flags: Set<string>;
	positionals: string[];
}

export function parseArgs(argv: string[], spec: ArgSpec): ParsedArgs {
	const values = new Map<string, string>();
	const flags = new Set<string>();
	const positionals: string[] = [];
	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index] as string;
		if (!token.startsWith('--')) {
			positionals.push(token);
			continue;
		}
		const separator = token.indexOf('=');
		const name = separator === -1 ? token : token.slice(0, separator);
		const inlineValue = separator === -1 ? undefined : token.slice(separator + 1);
		if (spec.flags.includes(name)) {
			if (inlineValue !== undefined) {
				throw new CliUsageError(`参数 ${name} 不接受值`);
			}
			if (flags.has(name)) {
				throw new CliUsageError(`参数重复：${name}`);
			}
			flags.add(name);
			continue;
		}
		if (!spec.values.includes(name)) {
			throw new CliUsageError(`未知参数：${name}`);
		}
		if (values.has(name)) {
			throw new CliUsageError(`参数重复：${name}`);
		}
		let value: string;
		if (inlineValue !== undefined) {
			value = inlineValue;
		} else {
			const next = argv[index + 1];
			if (next === undefined || next.startsWith('--')) {
				throw new CliUsageError(`参数 ${name} 缺少值`);
			}
			value = next;
			index += 1;
		}
		values.set(name, value);
	}
	return { values, flags, positionals };
}

export function expectPositionals(input: ParsedArgs, count: number, message: string): void {
	if (input.positionals.length !== count) {
		throw new CliUsageError(message);
	}
}

export function parseTaskNumber(raw: string): number {
	if (!/^[1-9]\d*$/.test(raw)) {
		throw new CliUsageError(`无效的任务编号：${raw}`);
	}
	const value = Number(raw);
	if (!Number.isSafeInteger(value)) {
		throw new CliUsageError(`无效的任务编号：${raw}`);
	}
	return value;
}
