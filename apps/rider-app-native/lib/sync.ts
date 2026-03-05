import * as SQLite from 'expo-sqlite';
import { riderApi } from './api';

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
                case 'book_ride':
                    await riderApi.bookRide(payload);
                    break;
                case 'submit_rating':
                    await riderApi.submitRating(payload);
                    break;
                case 'send_message':
                    await riderApi.sendMessage(payload.tripId, payload.content);
                    break;
                case 'create_dispute':
                    await riderApi.createDispute(payload);
                    break;
                case 'update_consent':
                    await riderApi.updateConsent(payload.consentType, payload.granted);
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
