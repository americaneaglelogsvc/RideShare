import * as SQLite from 'expo-sqlite';
import { driverApi } from './api';

export async function syncOfflineActions(db: SQLite.SQLiteDatabase): Promise<number> {
    const rows = await db.getAllAsync<{ id: number; action: string; payload: string }>(
        'SELECT id, action, payload FROM offline_actions WHERE synced = 0 ORDER BY created_at ASC'
    );

    if (rows.length === 0) return 0;

    let synced = 0;
    for (const row of rows) {
        try {
            const payload = JSON.parse(row.payload);

            switch (row.action) {
                case 'update_location':
                    await driverApi.updateLocation(payload.lat, payload.lng);
                    break;
                case 'update_status':
                    await driverApi.updateStatus(payload.status);
                    break;
                case 'respond_offer':
                    await driverApi.respondToOffer(payload.offerId, payload.accept);
                    break;
                default:
                    console.warn(`Unknown offline action: ${row.action}`);
                    continue;
            }

            await db.runAsync('UPDATE offline_actions SET synced = 1 WHERE id = ?', row.id);
            synced++;
        } catch (error) {
            console.error(`Failed to sync action ${row.id} (${row.action}):`, error);
            break;
        }
    }

    return synced;
}
