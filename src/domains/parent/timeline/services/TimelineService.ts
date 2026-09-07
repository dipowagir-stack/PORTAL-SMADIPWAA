import { TimelineEvent, TimelineFilterPeriod, TimelineEventCategory } from '../types';
import { GetTimelineDTO } from '../dtos';
import { TimelineValidators } from '../validators';
import { Result, ok, fail } from '../../../../foundation/core/Result';
import { ErrorCodes } from '../../../../foundation/shared/ErrorCatalog';

// Existing Services
import { ParentApprovalService } from '../../approval/services/ApprovalService';
import { ParentCommunicationService } from '../../communication/services/CommunicationService';
import { ParentNotificationService } from '../../notification/services/ParentNotificationService';
import { getPaymentsByStudentResult } from '../../../finance/services';
import { getReportCards } from '../../../academic/services';

// Reporting Existing
import { ReportingEngine } from '../../../reporting/services';
import { ExportFormat, ReportConfig } from '../../../reporting/types';

export class ParentTimelineService {
  
  static async getTimeline(dto: GetTimelineDTO): Promise<Result<TimelineEvent[]>> {
    try {
      const validation = TimelineValidators.validateGetTimeline(dto);
      if (validation.isFailure) return fail(validation.getError());

      let events: TimelineEvent[] = [];
      const promises: Promise<void>[] = [];

      // 1. Approvals
      if (!dto.categories || dto.categories.includes('Approval')) {
        promises.push(
          ParentApprovalService.getParentApprovals(dto.parentId).then(res => {
            if (res.isSuccess) {
              const approvals = res.getValue();
              approvals.forEach(a => {
                if (!dto.studentId || a.studentId === dto.studentId) {
                  events.push({
                    id: a.id || `app-${Date.now()}`,
                    category: 'Approval',
                    title: `Pengajuan ${a.type}`,
                    description: `Status: ${a.status}`,
                    timestamp: a.updatedAt || a.createdAt,
                    studentId: a.studentId,
                    metadata: a
                  });
                }
              });
            }
          })
        );
      }

      // 2. Communications (Threads)
      if (!dto.categories || dto.categories.includes('Communication')) {
        promises.push(
          ParentCommunicationService.getParentThreads(dto.parentId).then(res => {
            if (res.isSuccess) {
              const threads = res.getValue();
              threads.forEach(t => {
                if (!dto.studentId || t.studentId === dto.studentId) {
                  events.push({
                    id: t.id || `com-${Date.now()}`,
                    category: 'Communication',
                    title: `Percakapan: ${t.subject}`,
                    description: `Status: ${t.status}`,
                    timestamp: t.updatedAt || t.createdAt,
                    studentId: t.studentId,
                    metadata: t
                  });
                }
              });
            }
          })
        );
      }

      // 3. Notifications
      if (!dto.categories || dto.categories.includes('Notification')) {
        promises.push(
          ParentNotificationService.getActiveNotifications(dto.parentId, 100).then(res => {
            if (res.isSuccess) {
              const notifs = res.getValue();
              notifs.forEach(n => {
                events.push({
                  id: n.id || `notif-${Date.now()}`,
                  category: 'Notification',
                  title: n.payload.title,
                  description: n.payload.body,
                  timestamp: n.createdAt,
                  metadata: n
                });
              });
            }
          })
        );
      }

      // 4. Finance (Payments)
      if (!dto.categories || dto.categories.includes('Finance')) {
        if (dto.studentId) {
          promises.push(
            getPaymentsByStudentResult(dto.studentId).then(res => {
              if (res.isSuccess) {
                const payments = res.getValue();
                payments.forEach(p => {
                  events.push({
                    id: p.id || `pay-${Date.now()}`,
                    category: 'Finance',
                    title: `Pembayaran Sebesar Rp${p.amount}`,
                    description: `Metode: ${p.method}, Status: ${p.status}`,
                    timestamp: p.updatedAt || p.createdAt,
                    studentId: p.studentId,
                    metadata: p
                  });
                });
              }
            })
          );
        }
      }

      // 5. Academic (Report Cards)
      if (!dto.categories || dto.categories.includes('Academic')) {
        if (dto.studentId) {
          promises.push(
            getReportCards(dto.studentId).then(res => {
              if (res.isSuccess) {
                const reports = res.getValue();
                reports.forEach(r => {
                  events.push({
                    id: r.id || `rep-${Date.now()}`,
                    category: 'Academic',
                    title: `Rapor Kelas ${r.className}`,
                    description: `Semester ID: ${r.semesterId}, Nilai Rata-rata: ${r.averageScore}`,
                    // Assuming report card doesn't have a createdAt in the schema shown, fake it or use Date.now for demo
                    timestamp: (r as any).createdAt || Date.now(), 
                    studentId: r.studentId,
                    metadata: r
                  });
                });
              }
            })
          );
        }
      }

      await Promise.all(promises);

      // Filtering by period
      const now = Date.now();
      const ONE_DAY = 24 * 60 * 60 * 1000;
      if (dto.period && dto.period !== 'all') {
        events = events.filter(e => {
          if (dto.period === 'today') {
            return now - e.timestamp < ONE_DAY;
          } else if (dto.period === 'yesterday') {
            return now - e.timestamp >= ONE_DAY && now - e.timestamp < 2 * ONE_DAY;
          } else if (dto.period === 'this_week') {
            return now - e.timestamp < 7 * ONE_DAY;
          } else if (dto.period === 'this_month') {
            return now - e.timestamp < 30 * ONE_DAY;
          }
          return true;
        });
      }

      // Keyword search
      if (dto.keyword) {
        const lowerKw = dto.keyword.toLowerCase();
        events = events.filter(e => 
          e.title.toLowerCase().includes(lowerKw) || 
          e.description.toLowerCase().includes(lowerKw)
        );
      }

      // Sort by timestamp descending
      events.sort((a, b) => b.timestamp - a.timestamp);

      // Pagination
      const offset = dto.offset || 0;
      const limit = dto.limit || 50;
      const paginated = events.slice(offset, offset + limit);

      return ok(paginated);
    } catch (error) {
      return fail(ErrorCodes.INTERNAL_ERROR);
    }
  }

  static async exportTimeline(dto: GetTimelineDTO, format: ExportFormat): Promise<Result<void>> {
    try {
      // Fetch full timeline for export
      const reqDto = { ...dto, limit: 10000, offset: 0 };
      const timelineRes = await this.getTimeline(reqDto);
      
      if (timelineRes.isFailure) return fail(timelineRes.getError());
      
      const events = timelineRes.getValue();

      const reportConfig: ReportConfig<TimelineEvent> = {
        module: 'student',
        title: 'Timeline Aktivitas Anak',
        filename: `timeline_export_${Date.now()}`,
        columns: [
          { header: 'Kategori', key: 'category' },
          { header: 'Tanggal', key: 'timestamp', render: (row) => new Date(row.timestamp).toLocaleString() },
          { header: 'Judul', key: 'title' },
          { header: 'Deskripsi', key: 'description' }
        ],
        data: events,
        metadata: {
          'Periode': dto.period || 'Semua Waktu',
          'Siswa': dto.studentId || 'Semua Siswa',
          'Tanggal Cetak': new Date().toLocaleString()
        }
      };

      return await ReportingEngine.exportReport(reportConfig, format);
    } catch (error) {
      return fail(ErrorCodes.INTERNAL_ERROR);
    }
  }
}
