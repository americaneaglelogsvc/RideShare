import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const LOCATION_TASK_NAME = 'background-location-task';

export async function startBackgroundLocation() {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') return;

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') return;

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 10,
        foregroundService: {
            notificationTitle: 'Live Dispatch',
            notificationBody: 'Your location is being tracked for nearby requests.',
        },
    });
}

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: { data: any, error: any }) => {
    if (error) {
        console.error(error);
        return;
    }
    if (data) {
        const { locations } = data as any;
        // Here we would emit to socket if online, or queue to SQLite if offline
        console.log('Background location received:', locations);
    }
});
