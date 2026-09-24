import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { getConfigPath, getTasknestHome } from './paths';

const CONFIG_FILE_CONTENT = '# tasknest 全局配置（一期无配置项）\n';

export function ensureGlobalStorageDirectory(): void {
	mkdirSync(getTasknestHome(), { recursive: true });
	const configPath = getConfigPath();
	if (!existsSync(configPath)) {
		writeFileSync(configPath, CONFIG_FILE_CONTENT, 'utf8');
	}
}
