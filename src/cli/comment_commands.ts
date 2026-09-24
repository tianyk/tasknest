import { addComment, AUTHOR_TYPES_FOR_CLI, COMMENT_TYPES_FOR_CLI } from '../core/comment';
import { resolveProject } from '../core/project';
import type { AuthorType, CommentType } from '../types/models';
import { CliUsageError, expectPositionals, parseArgs, parseTaskNumber } from './args';
import { writeLine } from './output';

const COMMENT_SPEC = { values: ['--type', '--author-type', '--author'], flags: [] } as const;

export function handleComment(argv: string[]): number {
	const input = parseArgs(argv, COMMENT_SPEC);
	expectPositionals(input, 2, 'comment 需要一个任务编号和评论内容');
	const number = parseTaskNumber(input.positionals[0] as string);
	const content = input.positionals[1] as string;
	const rawType = input.values.get('--type');
	const rawAuthorType = input.values.get('--author-type');
	const author = input.values.get('--author');
	const project = resolveProject(process.cwd());
	addComment(project, number, {
		content,
		...(rawType === undefined ? {} : { type: parseCommentType(rawType) }),
		...(rawAuthorType === undefined ? {} : { authorType: parseAuthorType(rawAuthorType) }),
		...(author === undefined ? {} : { author }),
	});
	writeLine(`已添加评论到 #${number}`);
	return 0;
}

function parseCommentType(raw: string): CommentType {
	if (!COMMENT_TYPES_FOR_CLI.includes(raw as CommentType)) {
		throw new CliUsageError(
			`无效的活动类型：${raw}（可选：${COMMENT_TYPES_FOR_CLI.join(' / ')}）`,
		);
	}
	return raw as CommentType;
}

function parseAuthorType(raw: string): AuthorType {
	if (!AUTHOR_TYPES_FOR_CLI.includes(raw as AuthorType)) {
		throw new CliUsageError(
			`无效的作者类型：${raw}（可选：${AUTHOR_TYPES_FOR_CLI.join(' / ')}）`,
		);
	}
	return raw as AuthorType;
}
