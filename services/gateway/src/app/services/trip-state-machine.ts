import { BadRequestException } from '@nestjs/common';

export enum TripStatus {
  REQUESTED = 'requested',
  ASSIGNED = 'assigned',
  DRIVER_EN_ROUTE = 'driver_en_route',
  DRIVER_ARRIVED = 'driver_arrived',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum TripEvent {
  ASSIGN = 'assign',
  DRIVER_DEPART = 'driver_depart',
  DRIVER_ARRIVE = 'driver_arrive',
  START = 'start',
  COMPLETE = 'complete',
  CANCEL = 'cancel',
  NO_SHOW = 'no_show',
}

type TransitionMap = Record<string, Partial<Record<string, TripStatus>>>;

const TRANSITIONS: TransitionMap = {
  [TripStatus.REQUESTED]: {
    [TripEvent.ASSIGN]: TripStatus.ASSIGNED,
    [TripEvent.CANCEL]: TripStatus.CANCELLED,
  },
  [TripStatus.ASSIGNED]: {
    [TripEvent.DRIVER_DEPART]: TripStatus.DRIVER_EN_ROUTE,
    [TripEvent.START]: TripStatus.ACTIVE,
    [TripEvent.CANCEL]: TripStatus.CANCELLED,
  },
  [TripStatus.DRIVER_EN_ROUTE]: {
    [TripEvent.DRIVER_ARRIVE]: TripStatus.DRIVER_ARRIVED,
    [TripEvent.CANCEL]: TripStatus.CANCELLED,
  },
  [TripStatus.DRIVER_ARRIVED]: {
    [TripEvent.START]: TripStatus.ACTIVE,
    [TripEvent.NO_SHOW]: TripStatus.NO_SHOW,
    [TripEvent.CANCEL]: TripStatus.CANCELLED,
  },
  [TripStatus.ACTIVE]: {
    [TripEvent.COMPLETE]: TripStatus.COMPLETED,
    [TripEvent.CANCEL]: TripStatus.CANCELLED,
  },
  [TripStatus.COMPLETED]: {},
  [TripStatus.CANCELLED]: {},
  [TripStatus.NO_SHOW]: {},
};

export class TripStateMachine {
  static transition(currentStatus: string, event: string): TripStatus {
    const allowed = TRANSITIONS[currentStatus];
    if (!allowed) {
      throw new BadRequestException(
        `Unknown trip status: "${currentStatus}"`,
      );
    }

    const nextStatus = allowed[event];
    if (!nextStatus) {
      throw new BadRequestException(
        `Invalid transition: "${currentStatus}" + event "${event}". Allowed events: [${Object.keys(allowed).join(', ')}]`,
      );
    }

    return nextStatus;
  }

  static canTransition(currentStatus: string, event: string): boolean {
    const allowed = TRANSITIONS[currentStatus];
    if (!allowed) return false;
    return event in allowed;
  }

  static allowedEvents(currentStatus: string): string[] {
    const allowed = TRANSITIONS[currentStatus];
    if (!allowed) return [];
    return Object.keys(allowed);
  }

  static isTerminal(status: string): boolean {
    return (
      status === TripStatus.COMPLETED ||
      status === TripStatus.CANCELLED ||
      status === TripStatus.NO_SHOW
    );
  }

  static allStatuses(): TripStatus[] {
    return Object.values(TripStatus);
  }

  static allEvents(): TripEvent[] {
    return Object.values(TripEvent);
  }
}
