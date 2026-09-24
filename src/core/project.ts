import { basename, resolve } from 'node:path';
import { ensureGlobalStorageDirectory } from '../config/global_storage';
import { getGlobalProjectMarkerPath, getHomeDir, getProjectMarkerPath } from '../config/paths';
import { findProjectMarker } from '../config/project_discovery';
import { readProjectMarker, writeProjectMarker } from '../config/project_marker';
import { getDatabase, withImmediateTransaction } from '../db/database';
import { getProjectById, insertProject, listProjects as listProjectRows } from '../db/project_repository';
import type { Project } from '../types/models';
import {
	InvalidProjectMarkerError,
	ProjectBindingConflictError,
	ProjectNotFoundError,
	ValidationError,
} from './errors';

export const PERSONAL_PROJECT_NAME = 'Personal';

export function ensureGlobalInitialized(): Project {
	ensureGlobalStorageDirectory();
	const db = getDatabase();
	const markerPath = getGlobalProjectMarkerPath();
	const read = readProjectMarker(markerPath);
	if (read.status === 'ok') {
		const existing = getProjectById(db, read.marker.id);
		if (existing !== null) {
			return existing;
		}
	} else if (read.status === 'invalid') {
		throw invalidMarkerError(markerPath, read.reason);
	} else if (read.status === 'unreadable') {
		throw unreadableMarkerError(markerPath, read.cause);
	}
	return withImmediateTransaction(db, () => {
		const recheck = readProjectMarker(markerPath);
		if (recheck.status === 'ok') {
			const existing = getProjectById(db, recheck.marker.id);
			if (existing !== null) {
				return existing;
			}
			const name = recheck.marker.name === '' ? PERSONAL_PROJECT_NAME : recheck.marker.name;
			return insertProject(db, { id: recheck.marker.id, name, now: new Date() });
		}
		if (recheck.status === 'invalid') {
			throw invalidMarkerError(markerPath, recheck.reason);
		}
		if (recheck.status === 'unreadable') {
			throw unreadableMarkerError(markerPath, recheck.cause);
		}
		const created = insertProject(db, {
			id: Bun.randomUUIDv7(),
			name: PERSONAL_PROJECT_NAME,
			now: new Date(),
		});
		writeProjectMarker(markerPath, { id: created.id, name: created.name });
		return created;
	});
}

export function createProject(name: string): Project {
	const normalizedName = normalizeProjectName(name);
	return insertProject(getDatabase(), {
		id: Bun.randomUUIDv7(),
		name: normalizedName,
		now: new Date(),
	});
}

export function resolveProject(cwd: string): Project {
	const personal = ensureGlobalInitialized();
	const markerPath = findProjectMarker(cwd);
	if (markerPath === null) {
		return personal;
	}
	return loadProjectFromMarker(markerPath);
}

export function listProjects(): Project[] {
	ensureGlobalInitialized();
	return listProjectRows(getDatabase());
}

export function initProject(options: {
	cwd: string;
	name?: string;
}): { project: Project; created: boolean } {
	const personal = ensureGlobalInitialized();
	const cwd = resolve(options.cwd);
	const requestedName =
		options.name === undefined ? undefined : normalizeProjectName(options.name);
	if (cwd === getHomeDir()) {
		if (requestedName !== undefined && requestedName !== personal.name) {
			throw new ProjectBindingConflictError(
				`$HOME 已绑定 Personal 项目，不能初始化为 ${requestedName}`,
			);
		}
		return { project: personal, created: false };
	}
	const markerPath = getProjectMarkerPath(cwd);
	const existing = readProjectMarker(markerPath);
	if (existing.status === 'ok') {
		const project = loadProjectFromMarker(markerPath);
		assertNameMatches(project, requestedName);
		return { project, created: false };
	}
	if (existing.status === 'invalid') {
		throw invalidMarkerError(markerPath, existing.reason);
	}
	if (existing.status === 'unreadable') {
		throw unreadableMarkerError(markerPath, existing.cause);
	}
	const name = requestedName ?? normalizeProjectName(basename(cwd));
	const db = getDatabase();
	return withImmediateTransaction(db, () => {
		const recheck = readProjectMarker(markerPath);
		if (recheck.status === 'ok') {
			const project = loadProjectFromMarker(markerPath);
			assertNameMatches(project, requestedName);
			return { project, created: false };
		}
		if (recheck.status === 'invalid') {
			throw invalidMarkerError(markerPath, recheck.reason);
		}
		if (recheck.status === 'unreadable') {
			throw unreadableMarkerError(markerPath, recheck.cause);
		}
		const created = insertProject(db, { id: Bun.randomUUIDv7(), name, now: new Date() });
		writeProjectMarker(markerPath, { id: created.id, name: created.name });
		return { project: created, created: true };
	});
}

function loadProjectFromMarker(markerPath: string): Project {
	const read = readProjectMarker(markerPath);
	if (read.status === 'invalid') {
		throw invalidMarkerError(markerPath, read.reason);
	}
	if (read.status === 'unreadable') {
		throw unreadableMarkerError(markerPath, read.cause);
	}
	if (read.status === 'missing') {
		throw new ProjectNotFoundError(`项目标记不存在：${markerPath}`);
	}
	const project = getProjectById(getDatabase(), read.marker.id);
	if (project === null) {
		throw new ProjectNotFoundError(
			`项目标记指向的 Project 不存在：${markerPath}（id：${read.marker.id}）`,
		);
	}
	return project;
}

function assertNameMatches(project: Project, requestedName: string | undefined): void {
	if (requestedName !== undefined && requestedName !== project.name) {
		throw new ProjectBindingConflictError(
			`当前目录已绑定项目 ${project.name}，不能改名为 ${requestedName}`,
		);
	}
}

function normalizeProjectName(name: string): string {
	const normalized = name.trim();
	if (normalized === '') {
		throw new ValidationError('项目名称不能为空');
	}
	return normalized;
}

function invalidMarkerError(path: string, reason: string): InvalidProjectMarkerError {
	return new InvalidProjectMarkerError(`项目标记无效：${path}（${reason}）`);
}

function unreadableMarkerError(path: string, cause: unknown): Error {
	return new Error(`无法读取项目标记：${path}`, { cause });
}
