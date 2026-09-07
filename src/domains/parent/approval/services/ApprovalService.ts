import { IApprovalRepository } from '../repositories/IApprovalRepository';
import { ApprovalRepositoryImpl } from '../repositories/ApprovalRepositoryImpl';
import { ParentApproval, ApprovalTrail } from '../types';
import { CreateApprovalDTO, UpdateApprovalDTO, ReviewApprovalDTO, CancelApprovalDTO } from '../dtos';
import { ApprovalValidators } from '../validators';
import { Result, ok, fail } from '../../../../foundation/core/Result';
import { ErrorCodes } from '../../../../foundation/shared/ErrorCatalog';
import { ParentNotificationService } from '../../notification/services/ParentNotificationService';

const repo: IApprovalRepository = new ApprovalRepositoryImpl();

export class ParentApprovalService {
  
  static async createApproval(dto: CreateApprovalDTO): Promise<Result<ParentApproval>> {
    try {
      const validation = ApprovalValidators.validateCreate(dto);
      if (validation.isFailure) return fail(validation.getError());

      const now = Date.now();
      const initialStatus = dto.isDraft ? 'Draft' : 'Submitted';

      const auditTrail: ApprovalTrail[] = [{
        action: 'Create',
        actorId: dto.parentId,
        actorRole: 'parent',
        timestamp: now
      }];

      const approval: ParentApproval = {
        parentId: dto.parentId,
        studentId: dto.studentId,
        type: dto.type,
        status: initialStatus,
        approverId: dto.approverId,
        approverRole: dto.approverRole,
        title: dto.title,
        description: dto.description,
        attachments: dto.attachments || [],
        auditTrail,
        createdAt: now,
        updatedAt: now
      };

      const created = await repo.save(approval);

      if (!dto.isDraft && created.approverId) {
        // Trigger notification to approver
        await ParentNotificationService.sendNotification({
          userId: created.approverId,
          category: 'approval',
          title: `Pengajuan Baru: ${created.title}`,
          body: `Ada pengajuan ${created.type} yang membutuhkan persetujuan Anda.`,
          data: { approvalId: created.id },
          priority: 'high'
        });
      }

      return ok(created);
    } catch (error: any) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  static async updateApproval(dto: UpdateApprovalDTO): Promise<Result<ParentApproval>> {
    try {
      const validation = ApprovalValidators.validateUpdate(dto);
      if (validation.isFailure) return fail(validation.getError());

      const existing = await repo.findById(dto.approvalId);
      if (!existing) return fail(ErrorCodes.NOT_FOUND);

      if (existing.status !== 'Draft' && existing.status !== 'Submitted') {
        return fail(ErrorCodes.VALIDATION_ERROR); // Cannot update if already processed
      }

      const now = Date.now();
      existing.title = dto.title ?? existing.title;
      existing.description = dto.description ?? existing.description;
      existing.attachments = dto.attachments ?? existing.attachments;
      existing.updatedAt = now;

      existing.auditTrail.push({
        action: 'Update',
        actorId: dto.actorId,
        actorRole: dto.actorRole,
        timestamp: now
      });

      const updated = await repo.save(existing);
      return ok(updated);
    } catch (error: any) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  static async reviewApproval(dto: ReviewApprovalDTO): Promise<Result<ParentApproval>> {
    try {
      const validation = ApprovalValidators.validateReview(dto);
      if (validation.isFailure) return fail(validation.getError());

      const existing = await repo.findById(dto.approvalId);
      if (!existing) return fail(ErrorCodes.NOT_FOUND);

      if (existing.status !== 'Submitted' && existing.status !== 'Waiting') {
        return fail(ErrorCodes.VALIDATION_ERROR); // Can only review pending approvals
      }

      const now = Date.now();
      existing.status = dto.action === 'Approve' ? 'Approved' : 'Rejected';
      existing.updatedAt = now;

      existing.auditTrail.push({
        action: dto.action,
        actorId: dto.actorId,
        actorRole: dto.actorRole,
        timestamp: now,
        notes: dto.notes
      });

      const updated = await repo.save(existing);

      // Notify parent about the review result
      await ParentNotificationService.sendNotification({
        userId: existing.parentId,
        category: 'approval',
        title: `Pengajuan ${dto.action === 'Approve' ? 'Disetujui' : 'Ditolak'}: ${existing.title}`,
        body: `Pengajuan Anda telah ${dto.action === 'Approve' ? 'disetujui' : 'ditolak'} oleh pihak sekolah.`,
        data: { approvalId: existing.id },
        priority: 'high'
      });

      return ok(updated);
    } catch (error: any) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  static async cancelApproval(dto: CancelApprovalDTO): Promise<Result<ParentApproval>> {
    try {
      const validation = ApprovalValidators.validateCancel(dto);
      if (validation.isFailure) return fail(validation.getError());

      const existing = await repo.findById(dto.approvalId);
      if (!existing) return fail(ErrorCodes.NOT_FOUND);

      if (existing.status === 'Approved' || existing.status === 'Rejected') {
        return fail(ErrorCodes.VALIDATION_ERROR); // Cannot cancel completed approvals
      }

      const now = Date.now();
      existing.status = 'Cancelled';
      existing.updatedAt = now;

      existing.auditTrail.push({
        action: 'Cancel',
        actorId: dto.actorId,
        actorRole: dto.actorRole,
        timestamp: now,
        notes: dto.notes
      });

      const updated = await repo.save(existing);
      return ok(updated);
    } catch (error: any) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  static async getApprovalById(id: string): Promise<Result<ParentApproval>> {
    try {
      const approval = await repo.findById(id);
      if (!approval) return fail(ErrorCodes.NOT_FOUND);
      return ok(approval);
    } catch (error) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  static async getParentApprovals(parentId: string): Promise<Result<ParentApproval[]>> {
    try {
      const approvals = await repo.findByParentId(parentId);
      return ok(approvals);
    } catch (error) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  static async getApprovalsForReview(approverId: string): Promise<Result<ParentApproval[]>> {
    try {
      const approvals = await repo.findByApproverId(approverId);
      return ok(approvals);
    } catch (error) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }
}
