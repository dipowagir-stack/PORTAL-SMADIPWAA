import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, updateDoc, doc, where, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Shield, UserPlus, Search, Check, X, ShieldAlert, Code, Headphones } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: string;
  photoUrl: string;
}

export default function PlatformTeamPanel() {
  const { profile } = useAuth();
  const isPlatformAdmin = profile?.role === 'platform_admin';

  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<PlatformUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadPlatformTeam = async () => {
    setLoading(true);
    try {
      // Get all users who have a platform_* role
      const usersRef = collection(db, 'users');
      // Note: Firestore requires a composite index if we combine in with orderBy, 
      // but since we only have a few platform users, we can just fetch all or filter client side.
      const q = query(usersRef);
      const snapshot = await getDocs(q);
      
      const allUsers: PlatformUser[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        allUsers.push({
          id: doc.id,
          name: data.name || data.displayName || 'Unnamed User',
          email: data.email || '',
          role: data.role || 'user',
          photoUrl: data.photoUrl || ''
        });
      });
      
      setUsers(allUsers.filter(u => u.role.startsWith('platform_')));
    } catch (err: any) {
      console.error(err);
      setError('Gagal memuat data tim platform.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlatformTeam();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;
    
    setIsSearching(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', searchEmail.trim()));
      const snapshot = await getDocs(q);
      
      const results: PlatformUser[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        results.push({
          id: doc.id,
          name: data.name || data.displayName || 'Unnamed User',
          email: data.email || '',
          role: data.role || 'user',
          photoUrl: data.photoUrl || ''
        });
      });
      
      setSearchResults(results);
    } catch (err: any) {
      console.error(err);
      alert('Gagal mencari user.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!isPlatformAdmin) return;
    
    setUpdatingId(userId);
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole
      });
      // Refresh
      await loadPlatformTeam();
      setSearchResults(searchResults.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err: any) {
      console.error(err);
      alert('Gagal mengupdate role: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const RoleBadge = ({ role }: { role: string }) => {
    if (role === 'platform_admin') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"><ShieldAlert className="w-3 h-3 mr-1"/> Admin</span>;
    if (role === 'platform_engineer') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Code className="w-3 h-3 mr-1"/> Engineer</span>;
    if (role === 'platform_support') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><Headphones className="w-3 h-3 mr-1"/> Support</span>;
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Regular User</span>;
  };

  if (!isPlatformAdmin) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
        <ShieldAlert className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Akses Dibatasi</h3>
        <p>Hanya Platform Admin yang dapat mengelola tim platform.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center mb-4">
          <Shield className="w-5 h-5 text-indigo-600 mr-2" />
          Tim Platform (SaaS Internal)
        </h3>
        
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-100 rounded-lg"></div>
            <div className="h-12 bg-gray-100 rounded-lg"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-sm">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-sm text-gray-500">
                  <th className="pb-3 font-medium">Nama / Email</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="py-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold mr-3 flex-shrink-0">
                          {u.photoUrl ? <img src={u.photoUrl} alt="" className="w-8 h-8 rounded-full" /> : u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{u.name}</div>
                          <div className="text-gray-500 text-xs">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="py-3 text-right">
                      {updatingId === u.id ? (
                         <span className="text-xs text-indigo-500">Updating...</span>
                      ) : (
                        <select 
                          value={u.role}
                          onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                          className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                          <option value="platform_admin">Set as Admin</option>
                          <option value="platform_engineer">Set as Engineer</option>
                          <option value="platform_support">Set as Support</option>
                          <option value="user">Remove Access</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-sm text-gray-500">
                      Belum ada tim platform yang terdaftar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center mb-2">
          <UserPlus className="w-5 h-5 text-indigo-600 mr-2" />
          Undang / Tambah Anggota Tim
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Cari email pengguna yang sudah pernah login ke sistem (melalui halaman SaaS Login). Jika ditemukan, Anda dapat mengangkat mereka menjadi bagian dari Tim Platform.
        </p>

        <form onSubmit={handleSearch} className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="email" 
              required
              placeholder="Masukkan alamat email lengkap..."
              value={searchEmail}
              onChange={e => setSearchEmail(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>
          <button 
            type="submit" 
            disabled={isSearching}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSearching ? 'Mencari...' : 'Cari Pengguna'}
          </button>
        </form>

        {searchResults.length > 0 ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Hasil Pencarian</th>
                  <th className="px-4 py-3 font-medium">Status Saat Ini</th>
                  <th className="px-4 py-3 font-medium text-right">Aksi Angkat Jabatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {searchResults.map(u => (
                  <tr key={u.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold mr-3 flex-shrink-0">
                          {u.photoUrl ? <img src={u.photoUrl} alt="" className="w-8 h-8 rounded-full" /> : u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{u.name}</div>
                          <div className="text-gray-500 text-xs">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {updatingId === u.id ? (
                         <span className="text-xs text-indigo-500">Updating...</span>
                      ) : (
                        <select 
                          value={u.role.startsWith('platform_') ? u.role : ''}
                          onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                          className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                          <option value="" disabled>Pilih Jabatan...</option>
                          <option value="platform_admin">Angkat sbg Admin</option>
                          <option value="platform_engineer">Angkat sbg Engineer</option>
                          <option value="platform_support">Angkat sbg Support</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : searchEmail && !isSearching && (
           <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
             <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6 text-gray-500" />
             </div>
             <h4 className="text-gray-900 font-medium mb-1">Pengguna Tidak Ditemukan</h4>
             <p className="text-gray-500 text-sm mb-4">Email <strong>{searchEmail}</strong> belum pernah terdaftar di sistem sama sekali.</p>
             <button 
                onClick={async () => {
                  try {
                    const { setDoc, doc } = await import('firebase/firestore');
                    await setDoc(doc(db, 'platform_invitations', searchEmail.toLowerCase().trim()), {
                      email: searchEmail.toLowerCase().trim(),
                      role: 'platform_engineer',
                      createdAt: new Date().toISOString()
                    });
                    alert(`Undangan berhasil dibuat! Silakan minta pemilik email ${searchEmail} untuk login.`);
                  } catch (e: any) {
                    alert('Gagal membuat undangan: ' + e.message);
                  }
                }}
                className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200"
             >
                Kirim Undangan Otomatis (Pre-Register)
             </button>
           </div>
        )}
      </div>
    </div>
  );
}
