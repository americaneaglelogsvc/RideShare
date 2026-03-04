import { authenticateWithBiometrics } from '../lib/biometrics';
import * as LocalAuthentication from 'expo-local-authentication';

jest.mock('expo-local-authentication', () => ({
    hasHardwareAsync: jest.fn(),
    isEnrolledAsync: jest.fn(),
    authenticateAsync: jest.fn(),
}));

describe('Biometrics Logic', () => {
    it('should return success when biometrics are authenticated', async () => {
        (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
        (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
        (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });

        const result = await authenticateWithBiometrics();
        expect(result.success).toBe(true);
    });

    it('should return error when no hardware is present', async () => {
        (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);

        const result = await authenticateWithBiometrics();
        expect(result.success).toBe(false);
        expect(result.error).toBe('Biometrics not supported');
    });
});
