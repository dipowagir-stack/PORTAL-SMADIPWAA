import { enqueueNotification } from '../../notification/services';

export class SupervisionNotificationService {
  static async sendAssignedNotification(tenantId: string, supervisionId: string, teacherId: string, supervisorId: string) {
    return enqueueNotification({
      userId: teacherId,
      category: 'task',
      channels: ['in_app'],
      priority: 'normal',
      payload: {
        title: 'Supervisi Baru Ditugaskan',
        body: 'Anda telah ditugaskan untuk melakukan supervisi administrasi.',
        data: { tenantId, supervisionId, eventType: 'SupervisionAssigned', targetUserId: teacherId, supervisorId }
      }
    });
  }

  static async sendEvidenceSubmittedNotification(tenantId: string, supervisionId: string, teacherId: string, supervisorId: string) {
    return enqueueNotification({
      userId: supervisorId,
      category: 'task',
      channels: ['in_app'],
      priority: 'normal',
      payload: {
        title: 'Evidence Baru Disubmit',
        body: 'Seorang guru telah mengirimkan bukti administrasi untuk direview.',
        data: { tenantId, supervisionId, eventType: 'EvidenceSubmitted', targetUserId: supervisorId, teacherId }
      }
    });
  }

  static async sendRevisionRequiredNotification(tenantId: string, supervisionId: string, teacherId: string, supervisorId: string) {
    return enqueueNotification({
      userId: teacherId,
      category: 'task',
      channels: ['in_app'],
      priority: 'high',
      payload: {
        title: 'Revisi Diperlukan',
        body: 'Beberapa bukti administrasi Anda memerlukan revisi. Silakan cek catatan reviewer.',
        data: { tenantId, supervisionId, eventType: 'RevisionRequired', targetUserId: teacherId, supervisorId }
      }
    });
  }

  static async sendEvidenceResubmittedNotification(tenantId: string, supervisionId: string, teacherId: string, supervisorId: string) {
    return enqueueNotification({
      userId: supervisorId,
      category: 'task',
      channels: ['in_app'],
      priority: 'normal',
      payload: {
        title: 'Evidence Diperbaiki (Resubmit)',
        body: 'Guru telah mengirimkan ulang bukti administrasi setelah revisi.',
        data: { tenantId, supervisionId, eventType: 'EvidenceResubmitted', targetUserId: supervisorId, teacherId }
      }
    });
  }

  static async sendReviewCompletedNotification(tenantId: string, supervisionId: string, teacherId: string, supervisorId: string) {
    return enqueueNotification({
      userId: teacherId,
      category: 'announcement',
      channels: ['in_app'],
      priority: 'normal',
      payload: {
        title: 'Supervisi Selesai',
        body: 'Review administrasi Anda telah diselesaikan oleh Kepala Sekolah.',
        data: { tenantId, supervisionId, eventType: 'SupervisionCompleted', targetUserId: teacherId, supervisorId }
      }
    });
  }
}
