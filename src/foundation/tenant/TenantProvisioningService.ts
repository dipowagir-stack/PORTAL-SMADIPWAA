import { db } from '../../lib/firebase';
import { Result, ok, fail } from '../core/Result';
import { Tenant, SchoolProfile, TenantMembership, TenantStatus } from './types';
import { doc, setDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import { assignUserRole } from '../../lib/rbac';
import { SecurityContext } from '../security/types';
import { AcademicYear, AcademicSemesterMaster } from '../../domains/academic/types';

export interface ProvisionTenantCommand {
  code: string;
  name: string;
  timezone: string;
  locale: string;
  schoolName: string;
  officialCode?: string;
  adminUserId: string;
}

export class TenantProvisioningService {
  async provision(command: ProvisionTenantCommand, context: SecurityContext): Promise<Result<string>> {
    if (!context.isPlatformAdmin) {
      return fail('Unauthorized: Only Platform Admin can provision a new tenant.');
    }

    const tenantId = `t_${new Date().getTime()}_${command.code}`;

    try {
      // 1. Create Tenant Document (PROVISIONING)
      const tenantDocRef = doc(db, 'tenants', tenantId);
      const tenantData: Tenant = {
        id: tenantId,
        code: command.code,
        name: command.name,
        status: 'PROVISIONING',
        timezone: command.timezone || 'Asia/Jakarta',
        locale: command.locale || 'id',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: context.userId
      };
      await setDoc(tenantDocRef, tenantData);

      // Audit Log for Provisioning Started
      await addDoc(collection(db, 'audit_logs'), {
        action: 'TENANT_PROVISIONING_STARTED',
        tenantId,
        actorId: context.userId,
        timestamp: Date.now()
      });

      // 2. Initial Configuration (School Profile)
      const profileData: SchoolProfile = {
        tenantId,
        schoolName: command.schoolName,
        officialCode: command.officialCode,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const profileDocRef = doc(db, 'school_profiles', tenantId); // 1:1 mapping with tenant
      await setDoc(profileDocRef, profileData);

      // 3. Setup Initial Academic Context (Year and Semester in PLANNING state)
      const currentYear = new Date().getFullYear();
      const yearName = `${currentYear}/${currentYear + 1}`;
      const yearRef = doc(collection(db, 'academic_years'));
      const yearData: AcademicYear & { tenantId: string } = {
        id: yearRef.id,
        name: yearName,
        startDate: new Date(`${currentYear}-07-01`).getTime(),
        endDate: new Date(`${currentYear + 1}-06-30`).getTime(),
        state: 'PLANNING',
        isActive: false, 
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: context.userId,
        tenantId
      };
      await setDoc(yearRef, yearData);

      const semesterRef = doc(collection(db, 'academic_semesters'));
      const semesterData: AcademicSemesterMaster & { tenantId: string } = {
        id: semesterRef.id,
        academicYearId: yearRef.id,
        type: 'GANJIL',
        startDate: yearData.startDate,
        endDate: new Date(`${currentYear}-12-31`).getTime(),
        state: 'PLANNING',
        isActive: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: context.userId,
        tenantId
      };
      await setDoc(semesterRef, semesterData);

      // 4. Create School Admin Membership
      const membershipData: Omit<TenantMembership, 'id'> = {
        userId: command.adminUserId,
        tenantId: tenantId,
        roles: ['school_admin'],
        permissions: ['dashboard:access', 'tenant:admin'],
        status: 'ACTIVE',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await addDoc(collection(db, 'tenant_memberships'), membershipData);

      // Also assign in legacy user_roles for compatibility
      await assignUserRole(command.adminUserId, 'school_admin');

      // 5. Validation and Activation
      if (!profileData.schoolName || !yearData.id) {
         throw new Error("Validation Failed: Required configuration is missing");
      }

      // Mark ACTIVE
      await setDoc(tenantDocRef, { status: 'ACTIVE', updatedAt: Date.now() }, { merge: true });

      // Audit Logging
      await addDoc(collection(db, 'audit_logs'), {
        action: 'TENANT_PROVISIONED_COMPLETED',
        tenantId,
        actorId: context.userId,
        timestamp: Date.now(),
        details: `Tenant ${command.name} provisioned successfully.`
      });

      return ok(tenantId);
    } catch (error: any) {
      console.error("Tenant provisioning failed:", error);
      
      // Audit Logging
      await addDoc(collection(db, 'audit_logs'), {
        action: 'TENANT_PROVISIONING_FAILED',
        tenantId,
        actorId: context.userId,
        timestamp: Date.now(),
        details: error.message
      });

      return fail(error.message || 'Failed to provision tenant');
    }
  }
}
