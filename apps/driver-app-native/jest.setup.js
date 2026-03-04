
jest.mock('expo-router', () => ({
    router: {
        replace: jest.fn(),
        push: jest.fn(),
        back: jest.fn(),
    },
    useRouter: () => ({
        replace: jest.fn(),
        push: jest.fn(),
        back: jest.fn(),
    }),
    useLocalSearchParams: () => ({}),
}));

jest.mock('expo-local-authentication', () => ({
    hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
    isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
    authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
}));

jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        auth: {
            onAuthStateChange: jest.fn(),
            getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        },
    })),
}));

jest.mock('./context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'test-user' },
        session: {},
        signOut: jest.fn(),
    }),
    AuthProvider: ({ children }) => children,
}));

jest.mock('./hooks/useSocket', () => ({
    useRiderSocket: () => ({ emit: jest.fn(), on: jest.fn() }),
    useDriverSocket: () => ({ emit: jest.fn(), on: jest.fn() }),
}));

jest.mock('./lib/database', () => ({
    initDatabase: jest.fn(() => Promise.resolve()),
    queueOfflineAction: jest.fn(() => Promise.resolve()),
}));

jest.mock('./lib/location', () => ({
    startBackgroundLocation: jest.fn(),
}));
