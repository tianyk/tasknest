import { homedir } from 'node:os';
import { join } from 'node:path';

const TASKNEST_DIRECTORY = '.tasknest';

export function getHomeDir(): string {
	return homedir();
}

export function getTasknestHome(): string {
	return join(getHomeDir(), TASKNEST_DIRECTORY);
}

export function getDatabasePath(): string {
	return join(getTasknestHome(), 'tasknest.db');
}

export function getConfigPath(): string {
	return join(getTasknestHome(), 'config.toml');
}

export function getGlobalProjectMarkerPath(): string {
	return join(getTasknestHome(), 'project.toml');
}

export function getProjectMarkerPath(directory: string): string {
	return join(directory, TASKNEST_DIRECTORY, 'project.toml');
}
