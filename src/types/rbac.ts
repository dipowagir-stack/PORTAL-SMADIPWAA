export interface Role {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

export interface Permission {
  id: string;
  name: string;
  module: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  createdAt: number;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  createdAt: number;
}
