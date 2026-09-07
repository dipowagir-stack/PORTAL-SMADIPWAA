import React, { useState, useEffect } from 'react';
import { platformHubService } from '../../domains/platform/services';
import { SaasWebsiteConfig, SaasFeature, SaasPricingPlan } from '../../domains/platform/types';
import { Save, Plus, Trash2, Layout, AlertCircle } from 'lucide-react';

const DEFAULT_CONFIG: SaasWebsiteConfig = {
  hero: {
    headline: 'Transformasi Digital Sekolah Anda dalam Satu Platform',
    subheadline: 'Sistem Informasi Manajemen Sekolah (SIMS) berbasis cloud yang terintegrasi. Kelola PPDB, Akademik, Keuangan, hingga Komunikasi Orang Tua dengan mudah.',
    ctaText: 'Mulai Berlangganan Sekarang',
    ctaLink: '/subscribe',
    secondaryCtaText: 'Pelajari Lebih Lanjut',
    secondaryCtaLink: '#fitur',
  },
  features: [
    { id: 'f1', title: 'Data Terisolasi & Aman', desc: 'Setiap sekolah memiliki ruang penyimpanan data yang terisolasi sepenuhnya (Multi-Tenant).', icon: '🔒' },
    { id: 'f2', title: 'Modular & Fleksibel', desc: 'Bayar hanya untuk modul yang Anda butuhkan. Tambah fitur seiring pertumbuhan sekolah.', icon: '🧩' },
    { id: 'f3', title: 'Akses Darimana Saja', desc: 'Berbasis Cloud penuh, kelola sekolah dari laptop, tablet, atau smartphone Anda.', icon: '☁️' }
  ],
  pricing: [
    { id: 'p1', name: 'Basic', price: 'Rp 500k', period: '/ bulan', desc: 'Ideal untuk sekolah kecil yang baru mulai digitalisasi.', features: ['Website Profil Sekolah', 'Manajemen Siswa & Guru', 'Akademik Dasar'], popular: false },
    { id: 'p2', name: 'Professional', price: 'Rp 1.5M', period: '/ bulan', desc: 'Pilihan populer untuk sekolah menengah dengan kebutuhan lengkap.', features: ['Semua fitur Basic', 'Modul PPDB Online', 'Modul Keuangan Dasar', 'Portal Orang Tua'], popular: true },
    { id: 'p3', name: 'Enterprise', price: 'Custom', period: '', desc: 'Untuk yayasan atau sekolah besar dengan kebutuhan khusus.', features: ['Semua fitur Professional', 'Multi-Sekolah (Yayasan)', 'Integrasi API Kustom', 'Dedicated Support'], popular: false }
  ],
  updatedAt: Date.now()
};

export default function SaasWebsitePanel() {
  const [config, setConfig] = useState<SaasWebsiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    const result = await platformHubService.getSaasWebsiteConfig();
    if (result.isSuccess) {
      setConfig(result.getValue());
    } else {
      // If config not found, initialize with default
      setConfig(DEFAULT_CONFIG);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setError('');
    setSuccess('');

    const result = await platformHubService.updateSaasWebsiteConfig(config);
    if (result.isSuccess) {
      setSuccess('Konfigurasi website berhasil disimpan.');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError((result as any).getError());
    }
    setSaving(false);
  };

  const updateHero = (field: keyof typeof config.hero, value: string) => {
    if (!config) return;
    setConfig({ ...config, hero: { ...config.hero, [field]: value } });
  };

  const addFeature = () => {
    if (!config) return;
    setConfig({
      ...config,
      features: [...config.features, { id: Date.now().toString(), title: 'Fitur Baru', desc: 'Deskripsi singkat', icon: '✨' }]
    });
  };

  const updateFeature = (id: string, field: keyof SaasFeature, value: string) => {
    if (!config) return;
    setConfig({
      ...config,
      features: config.features.map(f => f.id === id ? { ...f, [field]: value } : f)
    });
  };

  const removeFeature = (id: string) => {
    if (!config) return;
    setConfig({
      ...config,
      features: config.features.filter(f => f.id !== id)
    });
  };

  const addPricing = () => {
    if (!config) return;
    setConfig({
      ...config,
      pricing: [...config.pricing, { id: Date.now().toString(), name: 'Paket Baru', price: 'Rp 0', period: '/ bulan', desc: '', features: [], popular: false }]
    });
  };

  const updatePricing = (id: string, field: keyof SaasPricingPlan, value: any) => {
    if (!config) return;
    setConfig({
      ...config,
      pricing: config.pricing.map(p => p.id === id ? { ...p, [field]: value } : p)
    });
  };

  const updatePricingFeatures = (id: string, index: number, value: string) => {
    if (!config) return;
    setConfig({
      ...config,
      pricing: config.pricing.map(p => {
        if (p.id === id) {
          const newFeatures = [...p.features];
          newFeatures[index] = value;
          return { ...p, features: newFeatures };
        }
        return p;
      })
    });
  };

  const addPricingFeature = (id: string) => {
    if (!config) return;
    setConfig({
      ...config,
      pricing: config.pricing.map(p => {
        if (p.id === id) {
          return { ...p, features: [...p.features, 'Fitur baru'] };
        }
        return p;
      })
    });
  };

  const removePricingFeature = (id: string, index: number) => {
    if (!config) return;
    setConfig({
      ...config,
      pricing: config.pricing.map(p => {
        if (p.id === id) {
          return { ...p, features: p.features.filter((_, i) => i !== index) };
        }
        return p;
      })
    });
  };

  const removePricing = (id: string) => {
    if (!config) return;
    setConfig({
      ...config,
      pricing: config.pricing.filter(p => p.id !== id)
    });
  };

  if (loading) return <div className="text-center p-8">Memuat konfigurasi...</div>;
  if (!config) return <div className="text-center p-8 text-red-500">Gagal memuat konfigurasi.</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
            <Layout className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Website SaaS CMS</h2>
            <p className="text-sm text-gray-500">Kelola konten landing page publik platform Anda.</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg">
          {success}
        </div>
      )}

      {/* Hero Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Hero Section</h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Headline Utama (Bisa gunakan HTML/Span untuk styling)</label>
            <input
              type="text"
              value={config.hero.headline}
              onChange={e => updateHero('headline', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sub-headline</label>
            <textarea
              value={config.hero.subheadline}
              onChange={e => updateHero('subheadline', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teks Tombol Utama</label>
              <input type="text" value={config.hero.ctaText} onChange={e => updateHero('ctaText', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link Tombol Utama</label>
              <input type="text" value={config.hero.ctaLink} onChange={e => updateHero('ctaLink', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teks Tombol Kedua</label>
              <input type="text" value={config.hero.secondaryCtaText} onChange={e => updateHero('secondaryCtaText', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link Tombol Kedua</label>
              <input type="text" value={config.hero.secondaryCtaLink} onChange={e => updateHero('secondaryCtaLink', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2" />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">Features</h3>
          <button onClick={addFeature} className="text-sm flex items-center text-indigo-600 hover:text-indigo-700 font-medium">
            <Plus className="w-4 h-4 mr-1" /> Tambah Fitur
          </button>
        </div>
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {config.features.map(f => (
              <div key={f.id} className="border border-gray-200 rounded-lg p-4 relative bg-gray-50">
                <button onClick={() => removeFeature(f.id)} className="absolute top-2 right-2 text-red-500 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="space-y-3 mt-2">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Icon/Emoji</label>
                      <input type="text" value={f.icon} onChange={e => updateFeature(f.id, 'icon', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-1.5" />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Judul Fitur</label>
                      <input type="text" value={f.title} onChange={e => updateFeature(f.id, 'title', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-1.5" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Deskripsi</label>
                    <textarea value={f.desc} onChange={e => updateFeature(f.id, 'desc', e.target.value)} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-1.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">Pricing / Subscription Plans</h3>
          <button onClick={addPricing} className="text-sm flex items-center text-indigo-600 hover:text-indigo-700 font-medium">
            <Plus className="w-4 h-4 mr-1" /> Tambah Paket
          </button>
        </div>
        <div className="p-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {config.pricing.map((p) => (
              <div key={p.id} className="border border-gray-200 rounded-lg p-5 relative bg-white shadow-sm">
                <button onClick={() => removePricing(p.id)} className="absolute top-3 right-3 text-red-500 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nama Paket</label>
                    <input type="text" value={p.name} onChange={e => updatePricing(p.id, 'name', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-1.5 font-bold" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Harga</label>
                      <input type="text" value={p.price} onChange={e => updatePricing(p.id, 'price', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-1.5" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Periode</label>
                      <input type="text" value={p.period} onChange={e => updatePricing(p.id, 'period', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-1.5" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Deskripsi Singkat</label>
                    <input type="text" value={p.desc} onChange={e => updatePricing(p.id, 'desc', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-1.5" />
                  </div>
                  
                  <label className="flex items-center gap-2 cursor-pointer mt-2">
                    <input type="checkbox" checked={p.popular} onChange={e => updatePricing(p.id, 'popular', e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-sm font-medium text-gray-700">Tandai sebagai "Paling Populer"</span>
                  </label>

                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-gray-700">Daftar Fitur</label>
                      <button onClick={() => addPricingFeature(p.id)} className="text-xs text-indigo-600 hover:text-indigo-800">
                        + Tambah
                      </button>
                    </div>
                    <div className="space-y-2">
                      {p.features.map((feature, i) => (
                        <div key={i} className="flex gap-2">
                          <input 
                            type="text" 
                            value={feature} 
                            onChange={e => updatePricingFeatures(p.id, i, e.target.value)}
                            className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-sm"
                          />
                          <button onClick={() => removePricingFeature(p.id, i)} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
    </div>
  );
}
