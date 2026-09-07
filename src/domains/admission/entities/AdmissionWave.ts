export interface SelectionConfig {
  method: 'MANUAL' | 'RULE_BASED';
  minimumCriteria?: {
    [key: string]: number | string;
  };
  priorityCriteria?: string[];
}

export enum WaveStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

export interface AdmissionWave {
  id?: string;
  name: string;
  academicYear: string;
  startDate: number;
  endDate: number;
  quota: number;
  paths?: string[];
  scheduleVerification?: number;
  scheduleSelection?: number;
  scheduleAnnouncement?: number;
  scheduleRegistration?: number;
  status: WaveStatus;
  selectionConfig?: SelectionConfig;
  
  createdAt: number;
  updatedAt: number;
}
