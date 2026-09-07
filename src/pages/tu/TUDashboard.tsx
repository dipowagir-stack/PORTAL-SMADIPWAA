import ParentDataPanel from './ParentDataPanel';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Briefcase, QrCode, ClipboardList, FileText, Plus, FileEdit, Trash2, Mail, Download, Search, Settings, Sparkles, Upload, FileUp, Printer } from 'lucide-react';
import { useRef } from 'react';
import { collection, query, getDocs, orderBy, doc, addDoc, updateDoc, serverTimestamp, deleteDoc, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ExamPrintCenter } from '../curriculum/ExamManagementPanel';

export default function TUDashboard() {
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin';
  const [activeTab, setActiveTab] = useState<'overview' | 'letters' | 'templates' | 'students' | 'parents' | 'exam_print'>('overview');

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-600 to-orange-800 p-6 md:p-8">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center p-1 border-2 border-orange-200">
              <Briefcase className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Tata Usaha (TU)</h1>
              <p className="text-orange-100 text-sm md:text-base">
                Manajemen Administrasi, Persuratan & Data Siswa {isSuperAdmin ? '(Mode Uji Coba Super Admin)' : ''}
              </p>
            </div>
          </div>
        </div>
        <div className="flex overflow-x-auto border-b border-gray-100 scrollbar-hide">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'overview' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('students')}
            className={`px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'students' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Data Siswa & Wali
          </button>
          <button 
            onClick={() => setActiveTab('exam_print')}
            className={`px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'exam_print' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Printer className="w-4 h-4" /> Cetak Ujian
          </button>
          <button 
            onClick={() => setActiveTab('letters')}
            className={`px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'letters' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Surat Keluar
          </button>
          <button 
            onClick={() => setActiveTab('templates')}
            className={`px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'templates' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Template Surat
          </button>
          <button 
            onClick={() => setActiveTab('parents')}
            className={`px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'parents' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Data Orang Tua
          </button>
        </div>
      </div>

      {activeTab === 'overview' && <OverviewPanel />}
      {activeTab === 'students' && <StudentDataPanel />}
      {activeTab === 'exam_print' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Printer className="w-6 h-6 text-orange-600" />
              Pusat Cetak Dokumen Ujian
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Cetak kelengkapan ujian (Berita Acara, Denah, Jadwal Ruang, Label Meja) berdasarkan data jadwal yang telah disusun oleh Kurikulum.
            </p>
          </div>
          <ExamPrintCenter />
        </div>
      )}
      {activeTab === 'letters' && <LettersPanel />}
      {activeTab === 'templates' && <TemplatesPanel />}
      {activeTab === 'parents' && <ParentDataPanel />}
    </div>
  );
}

function OverviewPanel() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
          <QrCode className="w-5 h-5 text-orange-600" />
          <span>Scanner Presensi QR</span>
        </h3>
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl h-48 flex flex-col items-center justify-center text-center p-6">
           <QrCode className="w-12 h-12 text-gray-400 mb-3" />
           <p className="text-sm font-medium text-gray-600">Fitur Scanner Sedang Dikembangkan</p>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
          <ClipboardList className="w-5 h-5 text-orange-600" />
          <span>Laporan Kedatangan</span>
        </h3>
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl h-48 flex flex-col items-center justify-center text-center p-6">
           <ClipboardList className="w-12 h-12 text-gray-400 mb-3" />
           <p className="text-sm font-medium text-gray-600">Modul Rekapitulasi Sedang Dikembangkan</p>
        </div>
      </div>
    </div>
  );
}

function TemplatesPanel() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', content: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsGenerating(true);
    setShowForm(true);

    try {
      let payload = {};
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        const base64Promise = new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target?.result);
          reader.readAsDataURL(file);
        });
        const result = await base64Promise as string;
        const base64Data = result.split(',')[1];
        payload = { imageBase64: base64Data, mimeType: file.type };
      } else {
        const text = await file.text();
        payload = { textContent: text };
      }

      const response = await fetch('/api/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (data.success && data.data) {
        setFormData({
          name: data.data.name || '',
          description: data.data.description || '',
          content: data.data.content || ''
        });
      } else {
        alert("Gagal menganalisis dokumen: " + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan sistem saat menganalisis dokumen.");
    } finally {
      setIsGenerating(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const q = query(collection(db, 'letter_templates'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setTemplates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error(error);
      setTemplates([]);
    }
  };

  const handleSave = async () => {
    if (!formData.name) return;
    try {
      await addDoc(collection(db, 'letter_templates'), {
        ...formData,
        createdAt: serverTimestamp()
      });
      setShowForm(false);
      setFormData({ name: '', description: '', content: '' });
      fetchTemplates();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900">Manajemen Template Surat</h3>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          accept="image/*,.txt,.md,.rtf" 
          className="hidden" 
        />
        <div className="flex space-x-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isGenerating}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isGenerating ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-1"></div> : <Sparkles className="w-4 h-4 mr-1" />}
            {isGenerating ? 'AI Menganalisis...' : 'Auto Template (AI)'}
          </button>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-orange-700 transition-colors"
          >
            {showForm ? 'Batal' : <><Plus className="w-4 h-4 mr-1" /> Tambah Template</>}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h4 className="font-bold text-gray-900">Template Baru</h4>
          <p className="text-sm text-gray-500">Gunakan tag seperti {'{{nama_siswa}}'} untuk variabel yang akan diisi nanti.</p>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Surat (Misl. Surat Keterangan)</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi Singkat</label>
              <input 
                type="text" 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Format / Isi Surat</label>
              <textarea 
                rows={8}
                value={formData.content}
                onChange={e => setFormData({...formData, content: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-orange-500 focus:border-orange-500 outline-none font-mono text-sm"
                placeholder="Yang bertanda tangan di bawah ini..."
              />
            </div>
            <div className="flex justify-end pt-2">
              <button 
                onClick={handleSave}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-700 transition-colors"
              >
                Simpan Template
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(tpl => (
          <div key={tpl.id} className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-gray-900">{tpl.name}</h4>
              <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
                <Settings className="w-4 h-4" />
              </div>
            </div>
            <p className="text-sm text-gray-500 flex-grow mb-4">{tpl.description}</p>
            <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs text-gray-400 font-mono line-clamp-1">{tpl.content?.substring(0, 30)}...</span>
              <button className="text-orange-600 text-sm font-medium hover:text-orange-800">Edit</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LettersPanel() {
  const [letters, setLetters] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  

  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [letterData, setLetterData] = useState<{tujuan: string, nomor: string, variables: Record<string, string>}>({
    tujuan: '', nomor: '', variables: {}
  });

  useEffect(() => {
    fetchLetters();
    fetchTemplates();
  }, []);

  const fetchLetters = async () => {
    try {
      const q = query(collection(db, 'letters'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setLetters(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error(error);
      setLetters([]);
    }
  };

  const fetchTemplates = async () => {
    try {
      const q = query(collection(db, 'letter_templates'));
      const snap = await getDocs(q);
      setTemplates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error(error);
      setTemplates([]);
    }
  };

  const handleSelectTemplate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tpl = templates.find(t => t.id === e.target.value);
    setSelectedTemplate(tpl || null);
    
    if (tpl && tpl.content) {
      // Extract variables like {{nama}}
      const matches = tpl.content.match(/\{\{([^}]+)\}\}/g) || [];
      const vars: Record<string, string> = {};
      matches.forEach((m: string) => {
        const cleanName = m.replace(/[{}]/g, '');
        vars[cleanName] = '';
      });
      setLetterData({ ...letterData, variables: vars });
    }
  };

  const generateLetter = async () => {
    if (!selectedTemplate || !letterData.tujuan) return;
    
    let generatedContent = selectedTemplate.content;
    Object.entries(letterData.variables).forEach(([key, val]) => {
      generatedContent = generatedContent.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
    });
    
    try {
      await addDoc(collection(db, 'letters'), {
        nomor: letterData.nomor,
        title: selectedTemplate.name,
        tujuan: letterData.tujuan,
        content: generatedContent,
        createdAt: serverTimestamp()
      });
      setShowForm(false);
      setSelectedTemplate(null);
      setLetterData({ tujuan: '', nomor: '', variables: {} });
      fetchLetters();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Cari arsip surat..." 
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-orange-700 transition-colors"
        >
          {showForm ? 'Batal' : <><Mail className="w-4 h-4 mr-1" /> Buat Surat Baru</>}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h4 className="font-bold text-gray-900 text-lg border-b pb-2">Buat Surat Baru</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Template</label>
              <select 
                value={selectedTemplate?.id || ''}
                onChange={handleSelectTemplate}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              >
                <option value="">-- Pilih Template --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Surat (Opsional)</label>
              <input 
                type="text" 
                value={letterData.nomor}
                onChange={e => setLetterData({...letterData, nomor: e.target.value})}
                placeholder="422/..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tujuan / Kepada Yth.</label>
              <input 
                type="text" 
                value={letterData.tujuan}
                onChange={e => setLetterData({...letterData, tujuan: e.target.value})}
                placeholder="Bpk. Ahmad / Universitas Brawijaya"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
            </div>
          </div>

          {selectedTemplate && Object.keys(letterData.variables).length > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <h5 className="font-semibold text-gray-900 mb-3">Isi Variabel Surat</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(letterData.variables).map(key => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{key.replace(/_/g, ' ')}</label>
                    <input 
                      type="text" 
                      value={letterData.variables[key]}
                      onChange={e => setLetterData({
                        ...letterData, 
                        variables: { ...letterData.variables, [key]: e.target.value }
                      })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button 
              onClick={generateLetter}
              disabled={!selectedTemplate || !letterData.tujuan}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              Simpan & Cetak
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-600">Tanggal</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Nomor Surat</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Jenis / Perihal</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Tujuan</th>
              <th className="px-4 py-3 font-semibold text-gray-600 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {letters.map(letter => (
              <tr key={letter.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">
                  {new Date(letter.createdAt?.seconds ? letter.createdAt.toDate() : letter.date || Date.now()).toLocaleDateString('id-ID')}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{letter.nomor || '-'}</td>
                <td className="px-4 py-3 text-gray-700">{letter.title}</td>
                <td className="px-4 py-3 text-gray-700">{letter.tujuan}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end space-x-2">
                    <button className="p-1.5 text-orange-600 hover:bg-orange-50 rounded" title="Download PDF">
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {letters.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">Belum ada arsip surat.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StudentDataPanel() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [waNumber, setWaNumber] = useState('');
  const [waParentNumber, setWaParentNumber] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showAddForm, setShowAddForm] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', nisn: '', className: '', waNumber: '', waParentNumber: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'student'));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStudents(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const handleEdit = (student: any) => {
    setEditingId(student.id);
    setWaNumber(student.waNumber || '');
    setWaParentNumber(student.waParentNumber || '');
  };

  const handleSave = async (id: string) => {
    try {
      await updateDoc(doc(db, 'users', id), { waNumber, waParentNumber });
      setStudents(students.map(s => s.id === id ? { ...s, waNumber, waParentNumber } : s));
      setEditingId(null);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan data');
    }
  };

  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.nisn) {
      alert('Nama dan NISN wajib diisi');
      return;
    }
    setIsSubmitting(true);
    // Generate activation code (6 char random)
    const activationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    try {
      const docRef = await addDoc(collection(db, 'users'), {
        name: newStudent.name.toUpperCase(),
        nisn: newStudent.nisn,
        className: newStudent.className,
        waNumber: newStudent.waNumber,
        waParentNumber: newStudent.waParentNumber,
        role: 'student',
        isOfflineAccount: true,
        activationCode,
        createdAt: Date.now()
      });
      
      const newRecord = {
        id: docRef.id,
        name: newStudent.name.toUpperCase(),
        nisn: newStudent.nisn,
        className: newStudent.className,
        waNumber: newStudent.waNumber,
        waParentNumber: newStudent.waParentNumber,
        role: 'student',
        isOfflineAccount: true,
        activationCode
      };
      
      setStudents([newRecord, ...students]);
      setShowAddForm(false);
      setNewStudent({ name: '', nisn: '', className: '', waNumber: '', waParentNumber: '' });
      alert(`Berhasil menambahkan siswa manual.\nKode Aktivasi untuk diklaim siswa: ${activationCode}`);
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan saat menambah siswa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.nisn?.includes(searchTerm)
  );

  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Data Kontak Siswa & Orang Tua</h2>
          <p className="text-sm text-gray-500">Kelola nomor WhatsApp untuk keperluan tautan akun orang tua.</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Cari nama/NISN..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-orange-500 outline-none"
            />
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
          >
            {showAddForm ? 'Batal' : '+ Tambah Manual'}
          </button>
        </div>
      </div>
      
      {showAddForm && (
        <div className="bg-orange-50 p-6 border-b border-orange-100">
          <h3 className="font-bold text-orange-900 mb-4">Pendaftaran Siswa Offline (Manual)</h3>
          <form onSubmit={handleAddStudentSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap *</label>
              <input type="text" required value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm uppercase" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NISN *</label>
              <input type="text" required value={newStudent.nisn} onChange={e => setNewStudent({...newStudent, nisn: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
              <input type="text" value={newStudent.className} onChange={e => setNewStudent({...newStudent, className: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WA Siswa</label>
              <input type="tel" value={newStudent.waNumber} onChange={e => setNewStudent({...newStudent, waNumber: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WA Orang Tua</label>
              <input type="tel" value={newStudent.waParentNumber} onChange={e => setNewStudent({...newStudent, waParentNumber: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div className="flex items-end">
              <button disabled={isSubmitting} type="submit" className="bg-orange-600 text-white px-6 py-2 rounded font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 w-full">
                {isSubmitting ? 'Menyimpan...' : 'Simpan & Buat PIN'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Siswa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WA Siswa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WA Orang Tua</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Memuat data...</td></tr>
            ) : paginatedStudents.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Data tidak ditemukan</td></tr>
            ) : (
              paginatedStudents.map(student => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{student.name}</div>
                    <div className="text-xs text-gray-500">NISN: {student.nisn || '-'} | Kelas: {student.className || '-'}</div>
                    {student.isOfflineAccount && !student.isClaimed && (
                      <div className="text-xs text-orange-600 font-medium mt-1">PIN Klaim: {student.activationCode}</div>
                    )}
                    {student.isOfflineAccount && student.isClaimed && (
                      <div className="text-xs text-green-600 font-medium mt-1">Status: Aktif (Diklaim)</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === student.id ? (
                      <input 
                        type="text" 
                        value={waNumber} 
                        onChange={(e) => setWaNumber(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-32"
                      />
                    ) : (
                      <span className="text-sm text-gray-700">{student.waNumber || '-'}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === student.id ? (
                      <input 
                        type="text" 
                        value={waParentNumber} 
                        onChange={(e) => setWaParentNumber(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-32"
                      />
                    ) : (
                      <span className="text-sm text-gray-700">{student.waParentNumber || '-'}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {editingId === student.id ? (
                      <div className="flex justify-end space-x-2">
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-gray-700">Batal</button>
                        <button onClick={() => handleSave(student.id)} className="text-xs text-orange-600 font-medium hover:text-orange-800">Simpan</button>
                      </div>
                    ) : (
                      <button onClick={() => handleEdit(student)} className="text-xs text-orange-600 font-medium hover:text-orange-800">
                        <FileEdit className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {!loading && filteredStudents.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
          <span className="text-sm text-gray-500">
            Menampilkan <span className="font-medium text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> hingga <span className="font-medium text-gray-900">{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</span> dari <span className="font-medium text-gray-900">{filteredStudents.length}</span> siswa
          </span>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sebelumnya
            </button>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredStudents.length / itemsPerPage)))}
              disabled={currentPage === Math.ceil(filteredStudents.length / itemsPerPage)}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
