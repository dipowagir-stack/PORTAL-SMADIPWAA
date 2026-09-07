import { ParentStudentRelation, RelationRole, ParentAccessLevel } from '../types';

export class ParentStudentRelationEntity {
  private constructor(public props: ParentStudentRelation) {}

  public static create(
    parentId: string, 
    studentId: string, 
    relationRole: RelationRole, 
    isPrimary: boolean = false,
    accessPermissions: ParentAccessLevel[] = ['view_only']
  ): ParentStudentRelationEntity {
    return new ParentStudentRelationEntity({
      parentId,
      studentId,
      relationRole,
      isPrimary,
      accessPermissions,
      createdAt: Date.now()
    });
  }

  public updatePermissions(permissions: ParentAccessLevel[]) {
    this.props.accessPermissions = permissions;
  }
}
