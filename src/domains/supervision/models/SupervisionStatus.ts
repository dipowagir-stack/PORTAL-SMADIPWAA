import { ValueObject } from '../../../foundation/core/ValueObject';

export type SupervisionStatusType = 
  | 'DRAFT'
  | 'SCHEDULED'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'REVISION_REQUIRED'
  | 'RESUBMITTED'
  | 'COMPLETED'
  | 'CANCELLED';

interface SupervisionStatusProps {
  value: SupervisionStatusType;
}

export class SupervisionStatus extends ValueObject<SupervisionStatusProps> {
  private constructor(props: SupervisionStatusProps) {
    super(props);
  }

  public static create(value: SupervisionStatusType): SupervisionStatus {
    return new SupervisionStatus({ value });
  }

  get value(): SupervisionStatusType {
    return this.props.value;
  }
}
