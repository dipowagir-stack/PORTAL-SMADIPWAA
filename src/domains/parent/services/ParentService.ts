import { IParentRepository, IParentStudentRelationRepository } from '../repositories/IParentRepository';
import { ParentRepositoryImpl, ParentStudentRelationRepositoryImpl } from '../repositories/ParentRepositoryImpl';
import { ParentEntity } from '../entities/ParentEntity';
import { ParentStudentRelationEntity } from '../entities/ParentStudentRelationEntity';
import { CreateParentProfileDTO, UpdateParentProfileDTO, LinkStudentDTO } from '../dtos/ParentDTO';
import { ParentValidators } from '../validators/ParentValidators';
import { Result, ok, fail } from '../../../foundation/core/Result';
import { ErrorCodes } from '../../../foundation/shared/ErrorCatalog';
import { ParentStudentRelation, Parent, ParentAccessLevel } from '../types';

const parentRepo: IParentRepository = new ParentRepositoryImpl();
const relationRepo: IParentStudentRelationRepository = new ParentStudentRelationRepositoryImpl();

export class ParentService {
  
  static async createProfile(dto: CreateParentProfileDTO): Promise<Result<Parent>> {
    const validation = ParentValidators.validateCreateProfile(dto);
    if (validation.isFailure) return fail(validation.getError());

    const existing = await parentRepo.findByUserId(dto.userId);
    if (existing) return fail(ErrorCodes.VALIDATION_ERROR);

    const entity = ParentEntity.create({
      userId: dto.userId,
      fullName: dto.fullName,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      address: dto.address
    });
    const saved = await parentRepo.save(entity.props);
    return ok(saved);
  }

  static async getProfileByUserId(userId: string): Promise<Result<Parent>> {
    const profile = await parentRepo.findByUserId(userId);
    if (!profile) return fail(ErrorCodes.NOT_FOUND);
    return ok(profile);
  }

  static async getParentProfileByPhoneNumber(phoneNumber: string): Promise<Result<Parent>> {
    const profile = await parentRepo.findByPhoneNumber(phoneNumber);
    if (!profile) return fail(ErrorCodes.NOT_FOUND);
    return ok(profile);
  }

  static async updateProfile(parentId: string, dto: UpdateParentProfileDTO): Promise<Result<Parent>> {
    const profile = await parentRepo.findById(parentId);
    if (!profile) return fail(ErrorCodes.NOT_FOUND);
    const entity = ParentEntity.create(profile as any); 
    entity.updateProfile(dto.fullName, dto.phoneNumber, dto.address);
    
    if (dto.email) entity.props.email = dto.email;
    const saved = await parentRepo.save(entity.props);
    return ok(saved);
  }

  static async linkStudent(dto: LinkStudentDTO): Promise<Result<ParentStudentRelation>> {
    const parent = await parentRepo.findById(dto.parentId);
    if (!parent) return fail(ErrorCodes.NOT_FOUND);

    const existingRelations = await relationRepo.findRelationsByParentId(dto.parentId);
    if (existingRelations.some(r => r.studentId === dto.studentId)) {
       return fail(ErrorCodes.VALIDATION_ERROR);
    }

    const relation = ParentStudentRelationEntity.create(
      dto.parentId, 
      dto.studentId, 
      dto.relationRole, 
      dto.isPrimary || false,
      dto.accessPermissions || ['view_only', 'attendance_read', 'grade_read']
    );

    const saved = await relationRepo.save(relation.props);
    return ok(saved);
  }

  static async getRelationsByParentId(parentId: string): Promise<Result<ParentStudentRelation[]>> {
    try {
      const relations = await relationRepo.findRelationsByParentId(parentId);
      return ok(relations);
    } catch (e) {
      return fail(ErrorCodes.DATABASE_ERROR);
    }
  }

  static async checkParentAccess(parentId: string, studentId: string, requiredAccess?: ParentAccessLevel): Promise<boolean> {
    const relations = await relationRepo.findRelationsByParentId(parentId);
    const relation = relations.find(r => r.studentId === studentId);
    if (!relation) return false;
    if (!requiredAccess) return true;
    return relation.accessPermissions.includes(requiredAccess);
  }
}
