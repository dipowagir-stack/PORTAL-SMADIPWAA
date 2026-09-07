import { Result, ok, fail } from '../../../foundation/core/Result';
import { ErrorCodes } from '../../../foundation/shared/ErrorCatalog';
import { ISupervisionRepository } from '../repositories/ISupervisionRepository';
import { ISupervisionFollowUpRepository } from '../repositories/ISupervisionFollowUpRepository';
import { SupervisionSession } from '../models/SupervisionSession';
import { SupervisionFollowUp } from '../models/SupervisionFollowUp';
import { ReportingEngine } from '../../reporting/services';
import { ExportFormat, ReportConfig } from '../../reporting/types';

export interface SupervisionDashboardSummary {
  overview: {
    total: number;
    scheduled: number;
    submitted: number;
    underReview: number;
    revisionRequired: number;
    resubmitted: number;
    completed: number;
  };
  score: {
    average: number;
    highest: number;
    lowest: number;
    categoryDistribution: Record<string, number>;
  };
  followUp: {
    total: number;
    open: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
  teacherPerformance: TeacherPerformanceSummary[];
}

export interface TeacherPerformanceSummary {
  teacherId: string;
  supervisionCount: number;
  latestScore: number | null;
  latestStatus: string;
  recommendation: string | null;
  followUpStatus: string | null;
  lastReviewDate: number | null;
}

export interface SupervisionReportFilter {
  tenantId: string;
  academicYearId: string;
  semesterId: string;
  supervisorId?: string;
  teacherId?: string;
  type?: string;
  status?: string;
}

export class SupervisionReportingService {
  constructor(
    private supervisionRepo: ISupervisionRepository,
    private followUpRepo: ISupervisionFollowUpRepository
  ) {}

  async getDashboardSummary(filter: SupervisionReportFilter): Promise<Result<SupervisionDashboardSummary>> {
    try {
      const { tenantId, academicYearId, semesterId, supervisorId, teacherId, type, status } = filter;
      
      let sessions = await this.supervisionRepo.findByPeriod(tenantId, academicYearId, semesterId);
      
      if (supervisorId) sessions = sessions.filter(s => s.props.principalId === supervisorId);
      if (teacherId) sessions = sessions.filter(s => s.props.teacherId === teacherId);
      if (type) sessions = sessions.filter(s => s.props.type.value === type);
      if (status) sessions = sessions.filter(s => s.props.status.value === status);

      // Followups (we can just fetch all for tenant and filter in memory since we are getting by supervision anyway, or we fetch all for period)
      // FollowUpRepo doesn't have findByPeriod, but we can get by supervision ids
      
      const sessionIds = sessions.map(s => s.props.id).filter(Boolean) as string[];
      let allFollowUps: SupervisionFollowUp[] = [];
      
      // Since fetching one by one might be N+1, but FollowUpRepo only has findBySupervisionId or findByTeacherId.
      // Alternatively, we could add findByTenant to FollowUpRepo. 
      // For now, we fetch by supervision id concurrently.
      if (sessionIds.length > 0) {
        const followUpPromises = sessionIds.map(id => this.followUpRepo.findBySupervisionId(tenantId, id));
        const followUpResults = await Promise.all(followUpPromises);
        allFollowUps = followUpResults.flat();
      }

      return ok(this.aggregateDashboard(sessions, allFollowUps));
    } catch (error: any) {
      console.error('Error generating dashboard summary', error);
      return fail(ErrorCodes.INTERNAL_ERROR);
    }
  }

  private aggregateDashboard(sessions: SupervisionSession[], followUps: SupervisionFollowUp[]): SupervisionDashboardSummary {
    const overview = { total: 0, scheduled: 0, submitted: 0, underReview: 0, revisionRequired: 0, resubmitted: 0, completed: 0 };
    const score = { average: 0, highest: 0, lowest: 100, categoryDistribution: {} as Record<string, number> };
    const followUpStats = { total: 0, open: 0, inProgress: 0, completed: 0, overdue: 0 };
    
    let totalScoreSum = 0;
    let scoredCount = 0;

    const teacherMap = new Map<string, TeacherPerformanceSummary>();

    sessions.forEach(session => {
      overview.total++;
      const status = session.props.status.value;
      if (status === 'SCHEDULED') overview.scheduled++;
      else if (status === 'SUBMITTED') overview.submitted++;
      else if (status === 'UNDER_REVIEW') overview.underReview++;
      else if (status === 'REVISION_REQUIRED') overview.revisionRequired++;
      else if (status === 'RESUBMITTED') overview.resubmitted++;
      else if (status === 'COMPLETED') overview.completed++;

      const finalResult = session.props.finalResult;
      if (finalResult && status === 'COMPLETED') {
        const pct = finalResult.percentage || 0;
        totalScoreSum += pct;
        scoredCount++;
        if (pct > score.highest) score.highest = pct;
        if (pct < score.lowest) score.lowest = pct;

        const cat = finalResult.category || 'Uncategorized';
        score.categoryDistribution[cat] = (score.categoryDistribution[cat] || 0) + 1;
      }

      const teacherId = session.props.teacherId;
      if (!teacherMap.has(teacherId)) {
        teacherMap.set(teacherId, {
          teacherId,
          supervisionCount: 0,
          latestScore: null,
          latestStatus: status,
          recommendation: null,
          followUpStatus: null,
          lastReviewDate: null
        });
      }
      const tStat = teacherMap.get(teacherId)!;
      tStat.supervisionCount++;
      // If this session is more recently updated or completed
      if (!tStat.lastReviewDate || (session.props.completedAt && session.props.completedAt > tStat.lastReviewDate)) {
        tStat.latestStatus = status;
        tStat.latestScore = finalResult?.percentage ?? null;
        tStat.recommendation = session.props.finalFeedback?.recommendationStatus ?? null;
        tStat.lastReviewDate = session.props.completedAt ?? session.props.updatedAt;
      }
    });

    if (scoredCount > 0) {
      score.average = totalScoreSum / scoredCount;
    } else {
      score.lowest = 0;
    }

    const now = Date.now();
    followUps.forEach(fu => {
      followUpStats.total++;
      const st = fu.props.status;
      if (st === 'OPEN') followUpStats.open++;
      else if (st === 'IN_PROGRESS') followUpStats.inProgress++;
      else if (st === 'COMPLETED') followUpStats.completed++;

      if ((st === 'OPEN' || st === 'IN_PROGRESS') && fu.props.dueDate < now) {
        followUpStats.overdue++;
      }
    });

    // We can merge follow up status to teacher stats (worst case or combined)
    // For simplicity, just check if they have any open/overdue followups
    followUps.forEach(fu => {
      const tStat = teacherMap.get(fu.props.teacherId);
      if (tStat) {
        const st = fu.props.status;
        if (st === 'OPEN' || st === 'IN_PROGRESS') {
           if (fu.props.dueDate < now) tStat.followUpStatus = 'OVERDUE';
           else if (tStat.followUpStatus !== 'OVERDUE') tStat.followUpStatus = st;
        }
      }
    });

    return {
      overview,
      score,
      followUp: followUpStats,
      teacherPerformance: Array.from(teacherMap.values())
    };
  }

  async exportReport(filter: SupervisionReportFilter, format: ExportFormat): Promise<Result<void>> {
      const summaryResult = await this.getDashboardSummary(filter);
      if (!summaryResult.isSuccess) return fail((summaryResult as any).getError() as string);

      const summary = summaryResult.getValue()!;
      
      const config: ReportConfig<TeacherPerformanceSummary> = {
        module: 'teacher',
        title: 'Supervision Summary Report',
        filename: `supervision_report_${filter.academicYearId}_${filter.semesterId}`,
        columns: [
          { header: 'Teacher ID', key: 'teacherId' },
          { header: 'Supervision Count', key: 'supervisionCount' },
          { header: 'Latest Score (%)', key: 'latestScore', render: (row) => row.latestScore != null ? row.latestScore.toFixed(2) : '-' },
          { header: 'Status', key: 'latestStatus' },
          { header: 'Recommendation', key: 'recommendation', render: (row) => row.recommendation || '-' },
          { header: 'Follow-up Status', key: 'followUpStatus', render: (row) => row.followUpStatus || '-' }
        ],
        data: summary.teacherPerformance,
        metadata: {
          'Tenant ID': filter.tenantId,
          'Academic Year': filter.academicYearId,
          'Semester': filter.semesterId,
          'Total Supervisions': summary.overview.total.toString(),
          'Completed': summary.overview.completed.toString(),
          'Average Score': summary.score.average.toFixed(2),
          'Overdue Follow-ups': summary.followUp.overdue.toString()
        }
      };

      return ReportingEngine.exportReport(config, format);
  }
}
