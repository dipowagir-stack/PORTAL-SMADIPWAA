import { DomainEvent } from '../../../foundation/core/DomainEvent';

export class SupervisionScheduledEvent implements DomainEvent<any> {
  eventName = 'SupervisionScheduled';
  payload: any;
  public dateTimeOccurred: Date;

  constructor(public sessionId: string, public teacherId: string, public principalId: string) {
    this.dateTimeOccurred = new Date();
  }

  getAggregateId(): string {
    return this.sessionId;
  }
}

export class SupervisionSubmittedEvent implements DomainEvent<any> {
  eventName = 'SupervisionSubmitted';
  payload: any;
  public dateTimeOccurred: Date;

  constructor(public sessionId: string, public teacherId: string) {
    this.dateTimeOccurred = new Date();
  }

  getAggregateId(): string {
    return this.sessionId;
  }
}

export class SupervisionRevisionRequestedEvent implements DomainEvent<any> {
  eventName = 'SupervisionRevisionRequested';
  payload: any;
  public dateTimeOccurred: Date;

  constructor(public sessionId: string, public teacherId: string, public principalId: string) {
    this.dateTimeOccurred = new Date();
  }

  getAggregateId(): string {
    return this.sessionId;
  }
}

export class SupervisionResubmittedEvent implements DomainEvent<any> {
  eventName = 'SupervisionResubmitted';
  payload: any;
  public dateTimeOccurred: Date;

  constructor(public sessionId: string, public teacherId: string) {
    this.dateTimeOccurred = new Date();
  }

  getAggregateId(): string {
    return this.sessionId;
  }
}

export class SupervisionCompletedEvent implements DomainEvent<any> {
  eventName = 'SupervisionCompleted';
  payload: any;
  public dateTimeOccurred: Date;

  constructor(public sessionId: string, public teacherId: string) {
    this.dateTimeOccurred = new Date();
  }

  getAggregateId(): string {
    return this.sessionId;
  }
}
