import { Result, ok, fail } from '../../../foundation/core/Result';
import { ErrorCodes } from '../../../foundation/shared/ErrorCatalog';
import { ParentInvitation, CreateInvitationDTO, ClaimInvitationDTO } from '../dtos/ParentInvitationDTO';
import { ParentService } from './ParentService';
import { ParentInvitationRepositoryImpl } from '../repositories/ParentInvitationRepository';

// To generate random tokens
const generateToken = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const repository = new ParentInvitationRepositoryImpl();

export class ParentInvitationService {
  
  static async createInvitation(dto: CreateInvitationDTO): Promise<Result<ParentInvitation>> {
    try {
      // 1. Validation (simple example)
      if (!dto.targetEmail) return fail(ErrorCodes.VALIDATION_ERROR);

      // 2. Check if active invitation already exists
      const existing = await repository.findActiveByEmailAndStudent(dto.targetEmail, dto.studentId);
      if (existing.length > 0) {
        return fail('INVITATION_ALREADY_EXISTS');
      }

      const invitation: ParentInvitation = {
        studentId: dto.studentId,
        relationRole: dto.relationRole,
        targetEmail: dto.targetEmail,
        targetPhone: dto.targetPhone,
        token: generateToken(),
        status: 'Sent', // Skipping Pending for simplicity in this flow
        invitedByUserId: dto.invitedByUserId,
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days expiration
        createdAt: Date.now()
      };

      const saved = await repository.save(invitation);

      // Mock integration with NotificationService:
      // await NotificationService.sendEmail(dto.targetEmail, 'Invitation', `Your token: ${saved.token}`);

      return ok(saved);
    } catch (error) {
      console.error(error);
      return fail(ErrorCodes.INTERNAL_ERROR);
    }
  }

  static async claimInvitation(dto: ClaimInvitationDTO): Promise<Result<boolean>> {
    try {
      // 1. Find the invitation by token
      const invitation = await repository.findByToken(dto.token);
      
      if (!invitation) return fail('INVITATION_NOT_FOUND');
      
      // 2. Validate status and expiration
      if (invitation.status !== 'Sent' && invitation.status !== 'Pending') {
        return fail('INVITATION_INVALID_STATUS');
      }

      if (invitation.expiresAt < Date.now()) {
        return fail('INVITATION_EXPIRED');
      }

      // 3. Create or Get Parent Profile
      let parentId: string;
      const profileRes = await ParentService.getProfileByUserId(dto.parentUserId);
      
      if (profileRes.isSuccess) {
        parentId = profileRes.getValue().id!;
      } else {
        const createRes = await ParentService.createProfile({
          userId: dto.parentUserId,
          fullName: dto.parentFullName,
          email: invitation.targetEmail,
          phoneNumber: invitation.targetPhone || '',
          address: ''
        });
        if (createRes.isFailure) return fail(createRes.getError());
        parentId = createRes.getValue().id!;
      }

      // 4. Link Student
      const linkRes = await ParentService.linkStudent({
        parentId,
        studentId: invitation.studentId,
        relationRole: invitation.relationRole,
        isPrimary: true
      });

      if (linkRes.isFailure && linkRes.getError() !== ErrorCodes.VALIDATION_ERROR) {
        // VALIDATION_ERROR here means already linked, which is fine to proceed
        return fail(linkRes.getError());
      }

      // 5. Assign Role in RBAC
      const { assignUserRole } = await import('../../../lib/rbac');
      await assignUserRole(dto.parentUserId, 'parent');

      // 6. Update Invitation Status
      invitation.status = 'Activated';
      invitation.activatedAt = Date.now();
      await repository.save(invitation);

      return ok(true);
    } catch (error) {
      console.error(error);
      return fail(ErrorCodes.INTERNAL_ERROR);
    }
  }

  static async getInvitationsByStudent(studentId: string): Promise<Result<ParentInvitation[]>> {
     try {
       const results = await repository.findByStudentId(studentId);
       return ok(results);
     } catch (error) {
       console.error(error);
       return fail(ErrorCodes.INTERNAL_ERROR);
     }
  }
}
