import { DomainEvent } from '../../../foundation/core/DomainEvent';

export class ApplicantCreatedEvent implements DomainEvent {
  public dateTimeOccurred = new Date();
  public eventName = 'ApplicantCreatedEvent';
  
  constructor(public readonly applicantId: string, public readonly payload: { academicYear: string }) {}
  
  getAggregateId(): string {
    return this.applicantId;
  }
}

export class RegistrationSubmittedEvent implements DomainEvent {
  public dateTimeOccurred = new Date();
  public eventName = 'RegistrationSubmittedEvent';
  
  constructor(public readonly registrationId: string, public readonly payload: { applicantId: string }) {}
  
  getAggregateId(): string {
    return this.registrationId;
  }
}

export class ApplicantUpdatedEvent implements DomainEvent {
  public dateTimeOccurred = new Date();
  public eventName = 'ApplicantUpdatedEvent';
  
  constructor(public readonly applicantId: string, public readonly payload: any = {}) {}
  
  getAggregateId(): string {
    return this.applicantId;
  }
}

export class ApplicantVerifiedEvent implements DomainEvent {
  public dateTimeOccurred = new Date();
  public eventName = 'ApplicantVerifiedEvent';
  
  constructor(public readonly applicantId: string, public readonly payload: { verifiedBy: string }) {}
  
  getAggregateId(): string {
    return this.applicantId;
  }
}

export class ApplicantSelectedEvent implements DomainEvent {
  public dateTimeOccurred = new Date();
  public eventName = 'ApplicantSelectedEvent';
  
  constructor(public readonly applicantId: string, public readonly payload: { selectedBy: string }) {}
  
  getAggregateId(): string {
    return this.applicantId;
  }
}

export class ApplicantRejectedEvent implements DomainEvent {
  public dateTimeOccurred = new Date();
  public eventName = 'ApplicantRejectedEvent';
  
  constructor(public readonly applicantId: string, public readonly payload: { rejectedBy: string }) {}
  
  getAggregateId(): string {
    return this.applicantId;
  }
}

export class ApplicantEnrolledEvent implements DomainEvent {
  public dateTimeOccurred = new Date();
  public eventName = 'ApplicantEnrolledEvent';
  
  constructor(public readonly applicantId: string, public readonly payload: { enrolledBy: string }) {}
  
  getAggregateId(): string {
    return this.applicantId;
  }
}
