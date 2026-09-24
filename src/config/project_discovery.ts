import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { getHomeDir, getProjectMarkerPath } from './paths';

export function findProjectMarker(cwd: string): string | null {
	const home = getHomeDir();
	let directory = resolve(cwd);
	for (;;) {
		const markerPath = getProjectMarkerPath(directory);
		if (existsSync(markerPath)) {
			return markerPath;
		}
		if (directory === home) {
			return null;
		}
		const parent = dirname(directory);
		if (parent === directory) {
			return null;
		}
		directory = parent;
	}
}
