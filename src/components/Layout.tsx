import React, { useState } from 'react';
import { useAuth, UserRole } from '../contexts/AuthContext';
import { LogOut, ChevronDown, UserSquare2, Menu, X } from 'lucide-react';
import { auth } from "../lib/firebase";
import GlobalPeriodContextBar from './GlobalPeriodContextBar';
import VirtualModeBanner from './VirtualModeBanner';

import UpdatePrompt from './UpdatePrompt';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, activeRole, switchRole, hasPermission } = useAuth();
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    auth.signOut();


  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'student': return 'Siswa';
      case 'teacher': return 'Guru';
      case 'curriculum': return 'Kurikulum';
      case 'admin': return 'Kepala Sekolah';
      case 'tu': return 'Tata Usaha';
      case 'bendahara': return 'Bendahara / Kasir';
      case 'super_admin': return 'Super Admin';
      case 'admission_staff': return 'Panitia PPDB';
      case 'platform_admin': return 'Platform Admin';
      case 'platform_support': return 'Platform Support';
      default: return 'User';
    }
  };

  const allRoles: { id: UserRole, label: string }[] = [
    { id: 'platform_admin', label: 'Platform Admin' },
    { id: 'platform_support', label: 'Platform Support' },
    { id: 'super_admin', label: 'Super Admin' },
    { id: 'admin', label: 'Kepala Sekolah' },
    { id: 'curriculum', label: 'Kurikulum' },
    { id: 'tu', label: 'Tata Usaha' },
    { id: 'admission_staff', label: 'Panitia PPDB' },
    { id: 'bendahara', label: 'Bendahara / Kasir' },
    { id: 'teacher', label: 'Guru' },
    { id: 'student', label: 'Siswa' },
    { id: 'parent', label: 'Orang Tua' },
  ];
  
  const isDevMode = import.meta.env.DEV;
  const isTestModeAllowed = profile?.role === 'super_admin' && isDevMode;
  const isSuperAdmin = profile?.role === 'super_admin';
  const isRoleSwitchAllowed = isSuperAdmin || (profile?.additionalRoles && profile.additionalRoles.length > 0);

  const availableRoles = isSuperAdmin 
    ? allRoles.filter(r => r.id !== 'platform_admin' && r.id !== 'platform_support') 
    : allRoles.filter(r => r.id === profile?.role || (profile?.additionalRoles && profile.additionalRoles.includes(r.id)));


  return (
    <div className="min-h-screen bg-slate-50 flex flex-col print:bg-white print:min-h-0">
      <VirtualModeBanner />
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10 print:hidden">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Logo Sekolah */}
              <div className="h-10 w-10 bg-white rounded-full p-1 shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                <img src="/logo.png" alt="Logo Sekolah" className="h-full w-full object-contain" onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=S+M+A&background=e0f2fe&color=0369a1&font-size=0.4'; }} />
              </div>
              <div className="ml-3 flex flex-col justify-center">
                <span className="font-bold text-gray-900 text-lg leading-tight truncate max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-none">SMAS ISLAM DIPONEGORO WAGIR</span>
                <span className="block text-xs text-blue-600 font-bold tracking-wide uppercase mt-0.5">{getRoleLabel(activeRole)}</span>
              </div>
            </div>
            
            <div className="hidden sm:flex sm:items-center sm:space-x-4">
              {isRoleSwitchAllowed && (
                <div className="relative">
                  <button 
                    onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                    className="flex items-center space-x-2 bg-orange-50 hover:bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg border border-orange-200 transition-colors mr-2"
                  >
                    <UserSquare2 className="w-4 h-4" />
                    <span className="text-sm font-medium">{isTestModeAllowed ? 'Test Mode' : 'Mode'}: {getRoleLabel(activeRole)}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  
                  {isRoleDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-100 py-1 z-50">
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                        {isTestModeAllowed ? 'Switch Role (Test)' : 'Ganti Peran'}
                      </div>
                      {availableRoles.map(role => (
                        <button
                          key={role.id}
                          onClick={() => {
                            switchRole(role.id);
                            setIsRoleDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm ${
                            activeRole === role.id ? 'bg-orange-50 text-orange-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {role.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{profile?.name}</div>
                <div className="text-xs text-gray-500">{profile?.email}</div>
              </div>
              <div className="h-8 w-8 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase border border-gray-200">
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt={profile.name} className="h-full w-full object-cover" />
                ) : (
                  profile?.name?.charAt(0) || 'U'
                )}
              </div>
              <button
                onClick={handleLogout}
                className="ml-4 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="Keluar"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center sm:hidden space-x-2">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                {isMobileMenuOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-200 bg-white">
            <div className="pt-4 pb-3 px-4 flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase text-lg">
                  {profile?.photoUrl ? (
                    <img src={profile.photoUrl} alt={profile.name} className="h-full w-full object-cover" />
                  ) : (
                    profile?.name?.charAt(0) || 'U'
                  )}
                </div>
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">{profile?.name}</div>
                <div className="text-sm font-medium text-gray-500">{profile?.email}</div>
              </div>
            </div>
            
              {isRoleSwitchAllowed && (
              <div className="px-4 py-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{isTestModeAllowed ? 'Switch Role (Test)' : 'Ganti Peran'}</p>
                <div className="grid grid-cols-2 gap-2">
                  {availableRoles.map(role => (
                    <button
                      key={role.id}
                      onClick={() => {
                        switchRole(role.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`text-left px-3 py-2 text-sm rounded-md ${
                        activeRole === role.id ? 'bg-orange-100 text-orange-800 font-medium' : 'bg-gray-50 text-gray-700 border border-gray-200'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-3 space-y-1 pb-3 px-2 border-t border-gray-100 pt-2">
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Keluar
              </button>
            </div>
          </div>
        )}
      </nav>
      <GlobalPeriodContextBar />
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:m-0 print:max-w-none">
        {children}
      </main>
      <UpdatePrompt />
    </div>
  );
}
