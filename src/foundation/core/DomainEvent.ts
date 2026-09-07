export interface DomainEvent<T = any> {
  dateTimeOccurred: Date;
  getAggregateId(): string;
  payload: T;
  eventName: string;
}
