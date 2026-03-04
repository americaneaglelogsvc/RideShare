import { BadRequestException } from '@nestjs/common';
import { TripStateMachine, TripStatus, TripEvent } from './trip-state-machine';

describe('TripStateMachine', () => {
  describe('happy path: full lifecycle', () => {
    it('requested → assigned → en_route → arrived → active → completed', () => {
      let s = TripStateMachine.transition(TripStatus.REQUESTED, TripEvent.ASSIGN);
      expect(s).toBe(TripStatus.ASSIGNED);

      s = TripStateMachine.transition(s, TripEvent.DRIVER_DEPART);
      expect(s).toBe(TripStatus.DRIVER_EN_ROUTE);

      s = TripStateMachine.transition(s, TripEvent.DRIVER_ARRIVE);
      expect(s).toBe(TripStatus.DRIVER_ARRIVED);

      s = TripStateMachine.transition(s, TripEvent.START);
      expect(s).toBe(TripStatus.ACTIVE);

      s = TripStateMachine.transition(s, TripEvent.COMPLETE);
      expect(s).toBe(TripStatus.COMPLETED);
    });
  });

  describe('cancellation from any non-terminal state', () => {
    const cancellableStates = [
      TripStatus.REQUESTED,
      TripStatus.ASSIGNED,
      TripStatus.DRIVER_EN_ROUTE,
      TripStatus.DRIVER_ARRIVED,
      TripStatus.ACTIVE,
    ];

    for (const state of cancellableStates) {
      it(`${state} → cancelled`, () => {
        const s = TripStateMachine.transition(state, TripEvent.CANCEL);
        expect(s).toBe(TripStatus.CANCELLED);
      });
    }
  });

  describe('no-show from driver_arrived', () => {
    it('driver_arrived → no_show', () => {
      const s = TripStateMachine.transition(TripStatus.DRIVER_ARRIVED, TripEvent.NO_SHOW);
      expect(s).toBe(TripStatus.NO_SHOW);
    });
  });

  describe('invalid transitions throw', () => {
    it('completed + complete throws', () => {
      expect(() => TripStateMachine.transition(TripStatus.COMPLETED, TripEvent.COMPLETE))
        .toThrow(BadRequestException);
    });

    it('cancelled + assign throws', () => {
      expect(() => TripStateMachine.transition(TripStatus.CANCELLED, TripEvent.ASSIGN))
        .toThrow(BadRequestException);
    });

    it('requested + complete throws', () => {
      expect(() => TripStateMachine.transition(TripStatus.REQUESTED, TripEvent.COMPLETE))
        .toThrow(BadRequestException);
    });

    it('unknown status throws', () => {
      expect(() => TripStateMachine.transition('bogus', TripEvent.ASSIGN))
        .toThrow(BadRequestException);
    });
  });

  describe('canTransition', () => {
    it('returns true for valid transition', () => {
      expect(TripStateMachine.canTransition(TripStatus.REQUESTED, TripEvent.ASSIGN)).toBe(true);
    });

    it('returns false for invalid transition', () => {
      expect(TripStateMachine.canTransition(TripStatus.COMPLETED, TripEvent.ASSIGN)).toBe(false);
    });
  });

  describe('isTerminal', () => {
    it('completed is terminal', () => {
      expect(TripStateMachine.isTerminal(TripStatus.COMPLETED)).toBe(true);
    });

    it('cancelled is terminal', () => {
      expect(TripStateMachine.isTerminal(TripStatus.CANCELLED)).toBe(true);
    });

    it('no_show is terminal', () => {
      expect(TripStateMachine.isTerminal(TripStatus.NO_SHOW)).toBe(true);
    });

    it('active is not terminal', () => {
      expect(TripStateMachine.isTerminal(TripStatus.ACTIVE)).toBe(false);
    });
  });

  describe('allowedEvents', () => {
    it('requested allows assign and cancel', () => {
      const events = TripStateMachine.allowedEvents(TripStatus.REQUESTED);
      expect(events).toContain(TripEvent.ASSIGN);
      expect(events).toContain(TripEvent.CANCEL);
      expect(events).toHaveLength(2);
    });

    it('completed allows nothing', () => {
      expect(TripStateMachine.allowedEvents(TripStatus.COMPLETED)).toHaveLength(0);
    });
  });
});
