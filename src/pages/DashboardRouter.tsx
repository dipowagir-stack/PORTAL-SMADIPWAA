import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../foundation/tenant/TenantContext';
import StudentDashboard from './student/StudentDashboard';
import TeacherDashboard from './teacher/TeacherDashboard';
import CurriculumDashboard from './curriculum/CurriculumDashboard';
import AdminDashboard from './admin/AdminDashboard';
import SuperAdminDashboard from './superadmin/SuperAdminDashboard';
import TUDashboard from './tu/TUDashboard';
import BendaharaDashboard from './bendahara/BendaharaDashboard';
import ParentDashboard from './parent/ParentDashboard';
import Layout from '../components/Layout';
import { PermissionGuard } from '../components/PermissionGuard';
import { ModuleGuard } from '../components/ModuleGuard';

export default function DashboardRouter() {
  const { profile, activeRole, hasPermission } = useAuth();
  const { activeTenant, loading } = useTenant();
  
  if (!profile) return <Navigate to="/setup-profile" replace />;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-gray-500 font-medium">Memuat konteks aplikasi...</div>
        </div>
      </Layout>
    );
  }

  const isPlatformUser = false; // Platform users should go to platform-hub, if they are here, they are acting as school admins and must have a tenant
  const isSuperAdmin = activeRole === 'super_admin';

  if (!isPlatformUser && !isSuperAdmin && !activeTenant) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 pt-16">
          <h2 className="text-2xl font-bold text-gray-800">Tenant Belum Ditentukan</h2>
          <p className="text-gray-600">Anda tidak tergabung ke dalam instansi / sekolah (Tenant) manapun yang aktif.</p>
          <p className="text-sm text-gray-500">Silakan hubungi administrator sistem untuk mendapatkan akses.</p>
        </div>
      </Layout>
    );
  }

  const getDashboardByRole = () => {
    switch (activeRole) {
      case 'student': 
        return (
          <PermissionGuard permission="dashboard:access" fallback={<div>Akses Ditolak</div>}>
            <ModuleGuard moduleCode="student"><StudentDashboard /></ModuleGuard>
          </PermissionGuard>
        );
      case 'teacher': 
        return (
          <PermissionGuard permission="dashboard:access" fallback={<div>Akses Ditolak</div>}>
            <ModuleGuard moduleCode="teacher"><TeacherDashboard /></ModuleGuard>
          </PermissionGuard>
        );
      case 'curriculum': 
        return (
          <PermissionGuard permission="dashboard:access" fallback={<div>Akses Ditolak</div>}>
            <ModuleGuard moduleCode="academic"><CurriculumDashboard /></ModuleGuard>
          </PermissionGuard>
        );
      case 'admin': 
      case 'admission_staff':
        return (
          <PermissionGuard permission="dashboard:access" fallback={<div>Akses Ditolak</div>}>
            <AdminDashboard />
          </PermissionGuard>
        );
      case 'tu': 
        return (
          <PermissionGuard permission="dashboard:access" fallback={<div>Akses Ditolak</div>}>
            <TUDashboard />
          </PermissionGuard>
        );
      case 'parent': 
         return (
          <PermissionGuard permission="dashboard:access" fallback={<div>Akses Ditolak</div>}>
            <ModuleGuard moduleCode="parent"><ParentDashboard /></ModuleGuard>
          </PermissionGuard>
        );

      case 'bendahara': 
        return (
          <PermissionGuard permission="dashboard:access" fallback={<div>Akses Ditolak</div>}>
            <ModuleGuard moduleCode="finance"><BendaharaDashboard /></ModuleGuard>
          </PermissionGuard>
        );
      case 'super_admin': 
        return <SuperAdminDashboard />;

      default: return <div>Role not recognized</div>;
    }
  };

  return (
    <Layout>
      <Routes>
        <Route path="/" element={getDashboardByRole()} />
        {/* Add more nested routes for specific roles if needed here */}
      </Routes>
    </Layout>
  );
}
