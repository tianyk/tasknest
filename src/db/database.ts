import { Database } from 'bun:sqlite';
import { getDatabasePath } from '../config/paths';
import { LATEST_SCHEMA_VERSION, MIGRATIONS } from './migrations';

let connection: Database | null = null;

export function getDatabase(): Database {
	if (connection === null) {
		connection = openDatabase(getDatabasePath());
	}
	return connection;
}

export function openDatabase(path: string): Database {
	const db = new Database(path, { create: true });
	db.exec('PRAGMA busy_timeout = 5000;');
	db.query('PRAGMA journal_mode = WAL;').get();
	db.exec('PRAGMA foreign_keys = ON;');
	migrateDatabase(db);
	return db;
}

export function migrateDatabase(db: Database): void {
	if (readSchemaVersion(db) >= LATEST_SCHEMA_VERSION) {
		return;
	}
	withImmediateTransaction(db, () => {
		const version = readSchemaVersion(db);
		for (const migration of MIGRATIONS) {
			if (migration.version > version) {
				migration.up(db);
			}
		}
		db.exec(`PRAGMA user_version = ${LATEST_SCHEMA_VERSION};`);
	});
}

export function withImmediateTransaction<T>(db: Database, work: () => T): T {
	db.exec('BEGIN IMMEDIATE;');
	try {
		const result = work();
		db.exec('COMMIT;');
		return result;
	} catch (error) {
		try {
			db.exec('ROLLBACK;');
		} catch {
			// 回滚失败时保留原始错误
		}
		throw error;
	}
}

function readSchemaVersion(db: Database): number {
	const row = db.query('PRAGMA user_version').get() as { user_version: number } | null;
	return row?.user_version ?? 0;
}
