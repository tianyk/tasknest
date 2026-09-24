import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ProjectMarker } from '../types/models';

export type ProjectMarkerReadResult =
	| { status: 'ok'; marker: ProjectMarker }
	| { status: 'missing' }
	| { status: 'invalid'; reason: string }
	| { status: 'unreadable'; cause: unknown };

export function readProjectMarker(path: string): ProjectMarkerReadResult {
	if (!existsSync(path)) {
		return { status: 'missing' };
	}
	let raw: string;
	try {
		raw = readFileSync(path, 'utf8');
	} catch (cause) {
		return { status: 'unreadable', cause };
	}
	let parsed: unknown;
	try {
		parsed = Bun.TOML.parse(raw);
	} catch {
		return { status: 'invalid', reason: 'TOML 解析失败' };
	}
	if (typeof parsed !== 'object' || parsed === null) {
		return { status: 'invalid', reason: '内容不是 TOML 表' };
	}
	const record = parsed as Record<string, unknown>;
	const id = typeof record.id === 'string' ? record.id.trim() : '';
	if (id === '') {
		return { status: 'invalid', reason: '缺少有效 id' };
	}
	const name = typeof record.name === 'string' ? record.name.trim() : '';
	return { status: 'ok', marker: { id, name } };
}

export function writeProjectMarker(path: string, marker: ProjectMarker): void {
	const content = `id = ${formatTomlString(marker.id)}\nname = ${formatTomlString(marker.name)}\n`;
	mkdirSync(dirname(path), { recursive: true });
	const temporaryPath = `${path}.${process.pid}.${Date.now()}.tmp`;
	writeFileSync(temporaryPath, content, 'utf8');
	renameSync(temporaryPath, path);
}

function formatTomlString(value: string): string {
	return JSON.stringify(value);
}
