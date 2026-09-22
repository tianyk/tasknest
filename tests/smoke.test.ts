import { describe, expect, test } from 'bun:test';
import pkg from '../package.json';

// 脚手架冒烟测试：保证单包配置满足单二进制分发约定；业务测试随功能实现补充。
describe('工程脚手架', () => {
	test('声明 ESM 与 tasknest 可执行入口', () => {
		expect(pkg.type).toBe('module');
		expect(pkg.bin.tasknest).toBe('./src/index.ts');
	});

	test('构建脚本输出单二进制 dist/tasknest', () => {
		expect(pkg.scripts.build).toContain('--compile');
		expect(pkg.scripts.build).toContain('dist/tasknest');
	});
});
