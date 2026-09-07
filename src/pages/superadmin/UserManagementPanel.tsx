import React, { useState, useEffect, useMemo } from 'react';
import { Users, Shield, FileText, Search, Edit, Trash2, CheckCircle, AlertTriangle, Key } from 'lucide-react';
import { collection, getDocs, query, orderBy, doc, deleteDoc, addDoc, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth, UserProfile, UserRole } from '../../contexts/AuthContext';
import { useVirtualMode } from '../../contexts/VirtualModeContext';
import { roleManagementService } from '../../domains/admin/services/RoleManagementService';
import { getAllUserPermissions } from '../../lib/rbac';

export default function UserManagementPanel() {
  const { user: currentUser } = useAuth();
  const { isVirtualMode, vUsers, setVUsers } = useVirtualMode();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userPermissions, setUserPermissions] = useState<Record<string, string[]>>({});
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isManagingRoles, setIsManagingRoles] = useState(false);
  
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (isVirtualMode) {
      setUsers(vUsers);
      setLoading(false);
    } else {
      fetchUsers();
    }
  }, [isVirtualMode, vUsers]);

  const handleSyncMemberships = async () => {
    setIsSyncing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      let syncCount = 0;
      for (const u of users) {
        if (!u.role) continue;
        const q = query(collection(db, 'tenant_memberships'), where('userId', '==', u.uid), where('tenantId', '==', 'smas-diponegoro'));
        const snap = await getDocs(q);
        if (snap.empty) {
           await addDoc(collection(db, 'tenant_memberships'), {
             userId: u.uid,
             tenantId: 'smas-diponegoro',
             roles: [u.role],
             permissions: [],
             status: 'ACTIVE',
             joinedAt: Date.now()
           });
           syncCount++;
        }
      }
      setActionSuccess(`Berhasil mensinkronisasi ${syncCount} pengguna ke tenant smas-diponegoro.`);
    } catch (err: any) {
      setActionError('Gagal sinkronisasi: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const usersList: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        usersList.push(doc.data() as UserProfile);
      });
      
      setUsers(usersList);
      
      // Fetch permissions only when needed to save Firebase read quota
      // const permsMap: Record<string, string[]> = {};
      // await Promise.all(usersList.map(async (u) => {
      //    const perms = await getAllUserPermissions(u.uid);
      //    permsMap[u.uid] = perms;
      // }));
      // setUserPermissions(permsMap);

    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async (targetUser: UserProfile, role: UserRole) => {
    if (!currentUser) return;
    try {
      if (!isVirtualMode) {
        const res = await roleManagementService.assignRole(currentUser.uid, targetUser.uid, role);
        if (res.isFailure) {
           setActionError(res.getError()!);
           return;
        }
      }
      setActionSuccess(`Role ${role} berhasil ditambahkan.`);
      fetchUsers(); // Refresh
    } catch (error: any) {
      setActionError(error.message || 'Gagal menambahkan peran.');
    }
  };

  const handleRevokeRole = async (targetUser: UserProfile, role: UserRole) => {
    if (!currentUser) return;
    try {
      if (!isVirtualMode) {
        const res = await roleManagementService.revokeRole(currentUser.uid, targetUser.uid, role);
        if (res.isFailure) {
           setActionError(res.getError()!);
           return;
        }
      }
      setActionSuccess(`Role ${role} berhasil dicabut.`);
      fetchUsers(); // Refresh
    } catch (error: any) {
      setActionError(error.message || 'Gagal mencabut peran.');
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = u.name.toLowerCase().includes(search) || 
         u.email.toLowerCase().includes(search) ||
        (u.role && u.role.toLowerCase().includes(search));
        
      let matchesRole = false;
      if (roleFilter === 'all') matchesRole = true;
      else if (roleFilter === 'admission_staff') {
         matchesRole = u.role === 'admission_staff' || (u.additionalRoles && u.additionalRoles.includes('admission_staff')) || (userPermissions[u.uid] && userPermissions[u.uid].includes('admission:read'));
      }
      else {
         matchesRole = u.role === roleFilter;
      }
      
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter, userPermissions]);

  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const admissionStaffCount = users.filter(u => u.role === 'admission_staff' || (u.additionalRoles && u.additionalRoles.includes('admission_staff'))).length;

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-lg flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" /> {actionError}
        </div>
      )}
      {actionSuccess && (
        <div className="p-4 bg-green-50 text-green-800 border border-green-200 rounded-lg flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" /> {actionSuccess}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-gray-900">Manajemen Pengguna & Peran</h3>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleSyncMemberships}
              disabled={isSyncing}
              className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
            >
              {isSyncing ? 'Sinkronisasi...' : 'Sinkronisasi Keanggotaan'}
            </button>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">Semua Peran</option>
              <option value="admission_staff">Panitia PPDB</option>
              <option value="student">Siswa</option>
              <option value="teacher">Guru</option>
              <option value="admin">Kepala Sekolah</option>
              <option value="super_admin">Admin Sistem</option>
              <option value="curriculum">Kurikulum</option>
              <option value="parent">Orang Tua</option>
            </select>
            
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Cari nama, email..." 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="p-10 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Profil</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Peran & Akses</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                          <div className="text-xs text-gray-400 mt-1">Last Login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('id-ID') : '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                          Primary: {user.role}
                        </span>
                        {user.additionalRoles?.map(ar => (
                          <span key={ar} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                            + {ar}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500 flex flex-wrap gap-1">
                         {userPermissions[user.uid]?.length > 0 ? (
                           userPermissions[user.uid].slice(0, 5).map(p => (
                             <span key={p} className="bg-gray-50 border border-gray-200 rounded px-1">{p}</span>
                           ))
                         ) : <span>No explicit permissions</span>}
                         {userPermissions[user.uid]?.length > 5 && <span>+{userPermissions[user.uid].length - 5} more</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button 
                        onClick={() => { setSelectedUser(user); setIsManagingRoles(true); setActionError(null); setActionSuccess(null); }}
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center inline-flex"
                      >
                        <Shield className="w-4 h-4 mr-1.5" /> Kelola Akses
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {!loading && filteredUsers.length > itemsPerPage && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <span className="text-sm text-gray-500">
              Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredUsers.length)} dari {filteredUsers.length} pengguna
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Sebelumnya
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredUsers.length / itemsPerPage)))}
                disabled={currentPage >= Math.ceil(filteredUsers.length / itemsPerPage)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {isManagingRoles && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Shield className="w-6 h-6 mr-2 text-blue-600" />
                Kelola Akses Pengguna
              </h2>
              <button onClick={() => setIsManagingRoles(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
               <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-bold text-gray-900">{selectedUser.name}</h4>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
               </div>

               <div>
                 <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wider">Additional Roles</h4>
                 <div className="space-y-3">
                   <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                     <div>
                       <div className="font-bold text-gray-900">Panitia PPDB (admission_staff)</div>
                       <div className="text-xs text-gray-500">Mendapatkan akses operasional Penerimaan Peserta Didik Baru</div>
                     </div>
                     {selectedUser.additionalRoles?.includes('admission_staff') ? (
                       <button 
                         onClick={() => {
                           if (window.confirm('Cabut akses Panitia PPDB dari pengguna ini?')) {
                             handleRevokeRole(selectedUser, 'admission_staff');
                           }
                         }}
                         className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-md text-sm font-medium transition-colors"
                       >
                         Cabut Akses
                       </button>
                     ) : (
                       <button 
                         onClick={() => {
                           if (window.confirm('Berikan akses Panitia PPDB kepada pengguna ini? Pengguna akan mendapatkan permission: admission:read, admission:verify, admission:select, admission:result:publish')) {
                             handleAssignRole(selectedUser, 'admission_staff');
                           }
                         }}
                         className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-md text-sm font-medium transition-colors"
                       >
                         Berikan Akses
                       </button>
                     )}
                   </div>
                 </div>
               </div>

               <div>
                 <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wider">Active Permissions</h4>
                 <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                   {userPermissions[selectedUser.uid]?.length > 0 ? (
                     <div className="flex flex-wrap gap-2">
                       {userPermissions[selectedUser.uid].map(p => (
                         <span key={p} className="inline-flex items-center px-2.5 py-1 rounded border border-gray-300 bg-gray-50 text-gray-700 text-xs font-mono">
                           <Key className="w-3 h-3 mr-1 text-gray-400" /> {p}
                         </span>
                       ))}
                     </div>
                   ) : (
                     <p className="text-sm text-gray-500">Tidak ada permission spesifik.</p>
                   )}
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
