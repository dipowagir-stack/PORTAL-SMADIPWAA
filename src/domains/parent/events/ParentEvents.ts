import { DomainEvent } from '../../../foundation/core/DomainEvent';

export class ParentLinkedToStudentEvent implements DomainEvent<any> {
  eventName = 'Event';
  payload: any;
  public dateTimeOccurred: Date;
  public parentId: string;
  public studentId: string;

  constructor(parentId: string, studentId: string) {
    this.dateTimeOccurred = new Date();
    this.parentId = parentId;
    this.studentId = studentId;
  }

  getAggregateId(): string {
    return this.parentId;
  }
}
