import { Injectable, Logger } from '@nestjs/common';
import { FeatureGateService } from './feature-gate.service';

/**
 * VoiceService — CANONICAL §5.5 "Voice interface (feature-gated)"
 *
 * Stub implementation behind feature gate. When enabled:
 *   - Driver: push-to-talk for dispatch acceptance, navigation commands
 *   - Rider: voice booking, status inquiry
 *   - Ops: dashboard voice queries
 *
 * All voice interactions are transcribed and stored for quality/compliance.
 */

export interface VoiceIntent {
  name: string;
  description: string;
  persona: 'driver' | 'rider' | 'ops';
  utterances: string[];
}

const VOICE_INTENTS: VoiceIntent[] = [
  { name: 'accept_ride', description: 'Accept incoming ride offer', persona: 'driver', utterances: ['accept ride', 'take this ride', 'yes accept'] },
  { name: 'decline_ride', description: 'Decline incoming ride offer', persona: 'driver', utterances: ['decline', 'pass', 'no thanks'] },
  { name: 'start_navigation', description: 'Start navigation to pickup', persona: 'driver', utterances: ['navigate', 'start directions', 'take me there'] },
  { name: 'arrived_pickup', description: 'Mark arrived at pickup', persona: 'driver', utterances: ['I arrived', 'at pickup', 'here'] },
  { name: 'book_ride', description: 'Request a new ride', persona: 'rider', utterances: ['book a ride', 'get me a car', 'I need a ride'] },
  { name: 'trip_status', description: 'Check current trip status', persona: 'rider', utterances: ['where is my driver', 'trip status', 'ETA'] },
  { name: 'cancel_trip', description: 'Cancel current trip', persona: 'rider', utterances: ['cancel ride', 'cancel trip', 'nevermind'] },
  { name: 'dashboard_query', description: 'Query dashboard metrics', persona: 'ops', utterances: ['how many active trips', 'driver count', 'system status'] },
];

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(private readonly featureGateService: FeatureGateService) {}

  async isEnabled(tenantId: string): Promise<boolean> {
    return this.featureGateService.isEnabled('voice_interface', { tenantId });
  }

  getIntents(persona?: string): VoiceIntent[] {
    if (persona) return VOICE_INTENTS.filter(i => i.persona === persona);
    return VOICE_INTENTS;
  }

  async processVoiceCommand(
    tenantId: string,
    userId: string,
    persona: 'driver' | 'rider' | 'ops',
    transcript: string,
  ): Promise<{ matched: boolean; intent?: string; message: string }> {
    const enabled = await this.isEnabled(tenantId);
    if (!enabled) {
      return { matched: false, message: 'Voice interface is not enabled for this tenant.' };
    }

    const lower = transcript.toLowerCase().trim();
    const match = VOICE_INTENTS
      .filter(i => i.persona === persona)
      .find(i => i.utterances.some(u => lower.includes(u)));

    if (!match) {
      this.logger.debug(`Voice: no intent matched for "${transcript}" (${persona})`);
      return { matched: false, message: 'Sorry, I didn\'t understand that command.' };
    }

    this.logger.log(`Voice: matched intent "${match.name}" for user ${userId} tenant ${tenantId}`);
    return { matched: true, intent: match.name, message: `Understood: ${match.description}` };
  }
}
