import { initDatabase, queueOfflineAction } from '../lib/database';
import * as SQLite from 'expo-sqlite';

jest.mock('expo-sqlite', () => ({
    openDatabaseSync: jest.fn(() => ({
        execAsync: jest.fn(),
        runAsync: jest.fn(),
    })),
}));

describe('Database Logic', () => {
    it('should initialize the database without errors', async () => {
        const db = await initDatabase();
        expect(db).toBeDefined();
    });

    it('should queue an offline action', async () => {
        // Basic verification that the function doesn't throw
        await expect(queueOfflineAction('TEST_ACTION', { foo: 'bar' })).resolves.not.toThrow();
    });
});
