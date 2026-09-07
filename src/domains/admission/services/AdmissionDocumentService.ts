import { getAllUserPermissions } from '../../../lib/rbac';
import { usersService } from '../../academic/services';
import { admissionAuditService } from './AdmissionAuditService';
import { Result, ok, fail } from '../../../foundation/core/Result';
import { ErrorCodes } from '../../../foundation/shared/ErrorCatalog';
import { AdmissionDocumentRequirement } from '../entities/AdmissionDocumentRequirement';
import { documentRequirementRepo } from '../repositories';
import { DocumentItem, DocumentStatus } from '../../document/types';
import { createDocument, updateDocument, storageService, getDocumentsByOwner, getDocumentById } from '../../document/services';
import { GenericAdmissionService } from './GenericAdmissionService';
import { applicantService } from './ApplicantService';
import { where, QueryConstraint } from 'firebase/firestore';

export interface AdmissionDocumentUploadDTO {
  applicantId: string;
  requirementId: string;
  file: File;
}

export interface VerificationDTO {
  documentId: string;
  status: DocumentStatus;
  verificationNotes: string;
}

class AdmissionDocumentService extends GenericAdmissionService<AdmissionDocumentRequirement> {
  async getDocumentsForApplicant(applicantId: string): Promise<Result<DocumentItem[]>> {
    return await getDocumentsByOwner(applicantId, 'applicant');
  }

  async getRequirementsForApplicant(applicantId: string): Promise<Result<AdmissionDocumentRequirement[]>> {
    const applicantRes = await applicantService.getById(applicantId);
    if (!applicantRes) return fail(ErrorCodes.NOT_FOUND);
    
    // In a real app, query by waveId, academicYear, and applicantType
    const constraints: QueryConstraint[] = [
      where('waveId', '==', applicantRes.waveId),
      where('academicYear', '==', applicantRes.academicYear)
    ];
    
    const reqsRes = await this.findWithConstraintsResult(constraints);
    if (reqsRes.isFailure) return reqsRes;
    
    const reqs = reqsRes.getValue().filter(r => !r.applicantType || r.applicantType === applicantRes.applicantType);
    return ok(reqs);
  }

  async uploadDocument(dto: AdmissionDocumentUploadDTO, userId: string): Promise<Result<string>> {
    const applicantRes = await applicantService.getById(dto.applicantId);
    if (!applicantRes) return fail(ErrorCodes.NOT_FOUND);
    if (applicantRes.createdBy !== userId) return fail(ErrorCodes.UNAUTHORIZED);

    const reqRes = await this.getById(dto.requirementId);
    if (!reqRes) return fail(ErrorCodes.NOT_FOUND);

    // Upload file
    const uploadRes = await storageService.uploadDocument(userId, dto.file, dto.file.name);
    if (uploadRes.isFailure) return fail(uploadRes.getError());

    // Create DocumentItem in document domain
    const docItem: Partial<DocumentItem> = {
      title: reqRes.documentName,
      type: 'other', // Or infer from extension
      category: 'admission',
      url: uploadRes.getValue(),
      ownerId: applicantRes.id!,
      ownerType: 'applicant',
      isSigned: false,
      status: 'UNDER_REVIEW',
      metadata: {
        requirementId: dto.requirementId,
        applicantId: applicantRes.id,
      }
    };
    return await createDocument(docItem);
  }

  async replaceDocument(documentId: string, dto: AdmissionDocumentUploadDTO, userId: string): Promise<Result<string>> {
    const applicantRes = await applicantService.getById(dto.applicantId);
    if (!applicantRes) return fail(ErrorCodes.NOT_FOUND);
    if (applicantRes.createdBy !== userId) return fail(ErrorCodes.UNAUTHORIZED);

    // Needs to fetch existing document, verify status, then replace
    // To keep it simple, we can just upload new and update existing DocumentItem url and status
    const uploadRes = await storageService.uploadDocument(userId, dto.file, dto.file.name);
    if (uploadRes.isFailure) return fail(uploadRes.getError());
    
    const updateRes = await updateDocument(documentId, {
      url: uploadRes.getValue(),
      status: 'UNDER_REVIEW',
      verificationNotes: ''
    });

    if (updateRes.isFailure) return fail(updateRes.getError());
    return ok(updateRes.getValue().id!);
  }

  async getDocumentCompleteness(applicantId: string): Promise<Result<{
    totalRequired: number;
    submitted: number;
    approved: number;
    rejected: number;
    pending: number;
    missing: number;
    overallStatus: 'INCOMPLETE' | 'UNDER_REVIEW' | 'REVISION_REQUIRED' | 'COMPLETE';
  }>> {
    const [reqsRes, docsRes] = await Promise.all([
      this.getRequirementsForApplicant(applicantId),
      this.getDocumentsForApplicant(applicantId)
    ]);

    if (reqsRes.isFailure) return fail(reqsRes.getError());
    if (docsRes.isFailure) return fail(docsRes.getError());

    const requirements = reqsRes.getValue();
    const documents = docsRes.getValue();

    const requiredReqs = requirements.filter(r => r.isRequired);
    const totalRequired = requiredReqs.length;
    
    let submitted = 0;
    let approved = 0;
    let rejected = 0;
    let pending = 0;
    let missing = 0;
    let revisionRequired = 0;

    requiredReqs.forEach(req => {
      const doc = documents.find(d => d.metadata?.requirementId === req.id);
      if (!doc) {
        missing++;
      } else {
        submitted++;
        if (doc.status === 'APPROVED') approved++;
        else if (doc.status === 'REJECTED') rejected++;
        else if (doc.status === 'REVISION_REQUIRED') revisionRequired++;
        else pending++;
      }
    });

    let overallStatus: 'INCOMPLETE' | 'UNDER_REVIEW' | 'REVISION_REQUIRED' | 'COMPLETE' = 'INCOMPLETE';
    
    if (missing > 0 || rejected > 0) {
      overallStatus = 'INCOMPLETE';
    } else if (revisionRequired > 0) {
      overallStatus = 'REVISION_REQUIRED';
    } else if (pending > 0) {
      overallStatus = 'UNDER_REVIEW';
    } else if (approved === totalRequired && totalRequired > 0) {
      overallStatus = 'COMPLETE';
    } else if (totalRequired === 0) {
      overallStatus = 'COMPLETE';
    }

    return ok({
      totalRequired,
      submitted,
      approved,
      rejected,
      pending,
      missing: missing + rejected, // missing or needs new upload
      overallStatus
    });
  }

  async verifyDocument(dto: VerificationDTO, adminUserId: string): Promise<Result<DocumentItem>> {
    // 1. Authorization Validation
    const permissions = await getAllUserPermissions(adminUserId);
    if (!permissions.includes('admission:verify') && adminUserId !== 'super_admin') {
      const adminUserRes = await usersService.getByIdResult(adminUserId);
      if (adminUserRes.isFailure || adminUserRes.getValue()?.role !== 'super_admin') {
         return fail('Akses ditolak: Anda tidak memiliki izin untuk melakukan verifikasi.');
      }
    }

    // Fetch the document to get applicantId
    const docRes = await getDocumentById(dto.documentId);
    if (docRes.isFailure) return fail(docRes.getError());
    const docItem = docRes.getValue();
    const applicantId = docItem.ownerId; // assuming ownerId is applicantId

    const updateRes = await updateDocument(dto.documentId, {
      status: dto.status,
      verificationNotes: dto.verificationNotes,
      verifiedBy: adminUserId,
      verifiedAt: Date.now()
    });

    if (updateRes.isSuccess) {
      let actionName = 'Document Updated';
      if (dto.status === 'APPROVED') actionName = 'DOCUMENT_APPROVED';
      else if (dto.status === 'REJECTED') actionName = 'DOCUMENT_REJECTED';
      else if (dto.status === 'REVISION_REQUIRED') actionName = 'REVISION_REQUESTED';
      
      await admissionAuditService.log(
        applicantId, 
        actionName, 
        adminUserId, 
        dto.verificationNotes || 'Dokumen diverifikasi',
        { documentId: dto.documentId }
      );
    }
    
    return updateRes;
  }
}

export const admissionDocumentService = new AdmissionDocumentService(documentRequirementRepo);
