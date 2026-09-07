import { FirestoreRepository } from './repositories';
import { AcademicYear, AcademicSemesterMaster } from './types';

export class AcademicYearRepository extends FirestoreRepository<AcademicYear> {
  constructor() {
    super('academic_years');
  }
}

export class AcademicSemesterRepository extends FirestoreRepository<AcademicSemesterMaster> {
  constructor() {
    super('academic_semesters');
  }
}
