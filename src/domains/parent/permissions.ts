export const ParentPermissions = {
  READ_PROFILE: 'parent:read',
  UPDATE_PROFILE: 'parent:update',
  READ_STUDENT: 'parent:student:read',
  READ_ATTENDANCE: 'parent:attendance:read',
  READ_GRADE: 'parent:grade:read',
  READ_FINANCE: 'parent:finance:read',
  READ_DOCUMENT: 'parent:document:read',
  READ_NOTIFICATION: 'parent:notification:read',
  WRITE_APPROVAL: 'parent:approval:write',
  WRITE_COMMUNICATION: 'parent:communication:write'
} as const;
