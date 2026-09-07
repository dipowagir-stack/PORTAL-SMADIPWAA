import { Result, ok, fail } from '../../foundation/core/Result';
import { ErrorCodes } from '../../foundation/shared/ErrorCatalog';
import { ParentService } from '../../domains/parent/services/ParentService';
import { ParentDashboardDTO, StudentSummaryDTO, AttendanceSummaryDTO, AcademicSummaryDTO, FinanceSummaryDTO } from '../../domains/parent/dtos/ParentFacadeDTO';

// Existing Domain Imports
import { getAcademicProfile, getStudentPayments, getEnrollments, getStudentFallbackName, getStudentIdByLinkCode } from '../../domains/student/services';
import { getReportCards, getAttendancesByClass, getClass } from '../../domains/academic/services';

export class ParentDashboardWorkflow {

  static async getLinkedStudents(parentId: string): Promise<Result<any[]>> {
    try {
      const relationsRes = await ParentService.getRelationsByParentId(parentId);
      if (relationsRes.isFailure) return fail(relationsRes.getError());
      
      const relations = relationsRes.getValue();
      const studentsData = await Promise.all(relations.map(async (rel: any) => {
         const profileRes = await getAcademicProfile(rel.studentId);
         
         let fallbackName = await getStudentFallbackName(rel.studentId);

         let profile = profileRes.isSuccess ? profileRes.getValue() : null;
         if (profile && !profile.fullName) {
             profile.fullName = fallbackName;
         }
         if (!profile) {
             profile = { 
                 fullName: fallbackName, 
                 nis: 'Data belum diisi', 
                 className: 'Data belum diisi',
                 userId: rel.studentId
             } as any;
         }

         return {
           relation: rel,
           studentProfile: profile
         };
      }));

      return ok(studentsData);
    } catch (e) {
      console.error(e);
      return fail(ErrorCodes.INTERNAL_ERROR);
    }
  }
  
  static async getDashboardSummary(parentId: string, studentId: string): Promise<Result<ParentDashboardDTO>> {
    try {
      // 1. Validate Access
      const hasAccess = await ParentService.checkParentAccess(parentId, studentId);
      if (!hasAccess) return fail(ErrorCodes.UNAUTHORIZED);

      // 2. Fetch Data in Parallel (where possible)
      const profileRes = await getAcademicProfile(studentId);
      const profile = profileRes.isSuccess ? profileRes.getValue() : null;

      // Fallback for student name
      let fallbackName = await getStudentFallbackName(studentId);

      // Parallel Data Fetching
      const [paymentsRes, reportCardsRes, enrollmentsRes] = await Promise.all([
        getStudentPayments(studentId),
        getReportCards(studentId),
        getEnrollments(studentId)
      ]);

      const enrollments = enrollmentsRes.isSuccess ? enrollmentsRes.getValue() : [];
      const activeEnrollment = enrollments.length > 0 ? enrollments[0] : null;

      let studentClass = null;
      let attendances = [];

      if (activeEnrollment && activeEnrollment.classId) {
        const classRes = await getClass(activeEnrollment.classId);
        if (classRes.isSuccess) studentClass = classRes.getValue();

        const attendanceRes = await getAttendancesByClass(activeEnrollment.classId);
        if (attendanceRes.isSuccess) attendances = attendanceRes.getValue();
      }

      // 3. Aggregate Student Profile
      const studentSummary: StudentSummaryDTO = {
        studentId: profile?.userId || studentId,
        fullName: profile?.fullName || fallbackName,
        nis: profile?.nis || 'Belum ada NIS',
        className: studentClass?.name || 'Belum masuk kelas',
        status: profile?.status || 'Active'
      };

      // 4. Aggregate Finance
      const payments = paymentsRes.isSuccess ? paymentsRes.getValue() : [];
      let totalUnpaid = 0;
      payments.forEach((p: any) => {
        if (p.status !== 'Lunas') totalUnpaid += (p.amount - (p.paidAmount || 0));
      });
      const financeSummary: FinanceSummaryDTO = {
        totalUnpaid,
        status: totalUnpaid > 0 ? 'Has_Arrears' : 'Clear',
      };

      // 5. Aggregate Academic
      const reports = reportCardsRes.isSuccess ? reportCardsRes.getValue() : [];
      const latestReport = reports.length > 0 ? reports[reports.length - 1] : null;
      const academicSummary: AcademicSummaryDTO = {
        currentSemester: latestReport?.semesterId || 'N/A',
        averageGrade: latestReport?.averageScore || 0,
        rank: latestReport?.rank
      };

      // 6. Aggregate Attendance
      let present = 0, absent = 0, sick = 0, leave = 0, total = 0;
      
      attendances.forEach(att => {
        const studentRecord = att.students?.find(s => s.uid === studentId);
        if (studentRecord) {
          total++;
          if (studentRecord.status === 'hadir') present++;
          else if (studentRecord.status === 'alpa') absent++;
          else if (studentRecord.status === 'sakit') sick++;
          else if (studentRecord.status === 'izin') leave++;
        }
      });

      const attendanceSummary: AttendanceSummaryDTO = {
        present, absent, sick, leave, totalMeetings: total
      };

      // 7. Compose DTO
      const dashboard: ParentDashboardDTO = {
        studentProfile: studentSummary,
        academic: academicSummary,
        finance: financeSummary,
        attendance: attendanceSummary,
        notifications: []
      };

      return ok(dashboard);
    } catch (error: any) {
      console.error(error);
      return fail(ErrorCodes.INTERNAL_ERROR);
    }
  }

  static async linkParentByCode(parentId: string, code: string): Promise<Result<boolean>> {
    // Find student with this code
    const studentIdRes = await getStudentIdByLinkCode(code);
    
    if (studentIdRes.isFailure) {
      return fail(studentIdRes.getError());
    }
    
    const studentId = studentIdRes.getValue();
    
    // Link using ParentService directly
    return ParentService.linkStudent({
        parentId,
        studentId,
        relationRole: 'Family',
        isPrimary: false,
        accessPermissions: ['view_only', 'attendance_read', 'grade_read']
    } as any).then(res => res.isSuccess ? ok(true) : fail((res as any).getError()));
  }
}
