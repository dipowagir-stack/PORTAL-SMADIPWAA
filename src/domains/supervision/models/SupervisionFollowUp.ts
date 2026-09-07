export type FollowUpStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface SupervisionFollowUpProps {
  id?: string;
  supervisionId: string;
  teacherId: string;
  tenantId: string;
  academicYearId: string;
  semesterId: string;
  target: string;
  action: string;
  dueDate: number;
  status: FollowUpStatus;
  createdAt: number;
  updatedAt: number;
}

export class SupervisionFollowUp {
  private constructor(public props: SupervisionFollowUpProps) {}

  public static create(props: Omit<SupervisionFollowUpProps, 'createdAt' | 'updatedAt' | 'status'> & { id?: string; status?: FollowUpStatus }): SupervisionFollowUp {
    const now = Date.now();
    return new SupervisionFollowUp({
      ...props,
      status: props.status || 'OPEN',
      createdAt: now,
      updatedAt: now,
    });
  }

  public updateStatus(status: FollowUpStatus): void {
    this.props.status = status;
    this.props.updatedAt = Date.now();
  }
}
