import * as LocalAuthentication from 'expo-local-authentication';

export async function authenticateWithBiometrics() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
        return { success: false, error: 'Biometrics not available' };
    }

    const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to continue',
        fallbackLabel: 'Enter Passcode',
    });

    return {
        success: result.success,
        error: 'error' in result ? result.error : undefined
    };
}
