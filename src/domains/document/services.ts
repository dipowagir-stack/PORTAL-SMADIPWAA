import { ok, fail, Result } from '../../foundation/core/Result';
import { where, orderBy } from 'firebase/firestore';
import { DocumentItem, DocumentTemplate, DocumentSignature } from './types';
import { FirestoreRepository, FirebaseStorageRepository } from './repositories';
import { GenericDocumentService, DocumentStorageService } from './coreServices';
import { ErrorCodes, AppError } from '../../foundation/shared/ErrorCatalog';

// Repositories
const documentRepo = new FirestoreRepository<DocumentItem>('doc_items');
const templateRepo = new FirestoreRepository<DocumentTemplate>('doc_templates');
const signatureRepo = new FirestoreRepository<DocumentSignature>('doc_signatures');
const storageRepo = new FirebaseStorageRepository();

// Services (Foundation Layer)
const documentService = new GenericDocumentService<DocumentItem>(documentRepo);
const templateService = new GenericDocumentService<DocumentTemplate>(templateRepo);
const signatureService = new GenericDocumentService<DocumentSignature>(signatureRepo);
export const storageService = new DocumentStorageService(storageRepo);

// Helper to unwrap Result<T> to keep backward compatibility

// 1. Documents
export async function getDocumentsByOwner(ownerId: string, ownerType: string): Promise<Result<DocumentItem[]>> {
  const constraints = [
    where('ownerId', '==', ownerId),
    where('ownerType', '==', ownerType)
  ];
  return await documentService.findWithConstraintsResult(constraints);
}

export async function createDocument(docItem: Partial<DocumentItem>): Promise<Result<string>> {
  const resResult = await documentService.createResult({
    ...docItem,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  if (resResult.isFailure) return fail(resResult.getError());
  return ok(resResult.getValue().id!);
}

export async function updateDocument(id: string, updates: Partial<DocumentItem>): Promise<Result<DocumentItem>> {
  return await documentService.updateResult(id, { ...updates, updatedAt: Date.now() });
}

// 2. Templates
export async function getTemplates(): Promise<Result<DocumentTemplate[]>> {
  const constraints = [
    orderBy('createdAt', 'desc')
  ];
  return await templateService.findWithConstraintsResult(constraints);
}

export async function createTemplate(template: Partial<DocumentTemplate>): Promise<Result<string>> {
  const resResult = await templateService.createResult({
    ...template,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  if (resResult.isFailure) return fail(resResult.getError());
  return ok(resResult.getValue().id!);
}

// 3. Signatures
export async function signDocument(documentId: string, signerId: string, signerName: string): Promise<Result<string>> {
  const signatureHash = 'sha256-' + Math.random().toString(36).substring(2, 15) + Date.now();
  
  const resResult = await signatureService.createResult({
    documentId,
    signerId,
    signerName,
    signedAt: Date.now(),
    signatureHash,
    status: 'valid'
  });
  if (resResult.isFailure) return fail(resResult.getError());
  await updateDocument(documentId, { isSigned: true });
  return ok(resResult.getValue().id!);
}

export async function getSignatures(documentId: string): Promise<Result<DocumentSignature[]>> {
  return await signatureService.getByFieldResult('documentId', documentId);
}


export async function getDocumentById(id: string): Promise<Result<DocumentItem>> {
  const doc = await documentService.getById(id);
  if (!doc) return fail(ErrorCodes.NOT_FOUND);
  return ok(doc);
}
