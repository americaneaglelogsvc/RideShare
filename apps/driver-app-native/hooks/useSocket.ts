import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.EXPO_PUBLIC_GATEWAY_URL || 'http://localhost:3000';

export function useDriverSocket(userId: string | undefined) {
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!userId) return;

        socketRef.current = io(SOCKET_URL, {
            query: { userId, type: 'driver' },
        });

        socketRef.current.on('connect', () => {
            console.log('Connected to Gateway as Driver');
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, [userId]);

    return socketRef.current;
}
