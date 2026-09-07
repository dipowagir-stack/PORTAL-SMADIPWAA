import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { platformHubService } from '../../../domains/platform/services';
import { SaasWebsiteConfig } from '../../../domains/platform/types';

const DEFAULT_CONFIG: SaasWebsiteConfig = {
  hero: {
    headline: 'Transformasi Digital Sekolah Anda dalam <span class="text-blue-600">Satu Platform</span>',
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

export default function SaasLanding() {
  const [config, setConfig] = useState<SaasWebsiteConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      const result = await platformHubService.getSaasWebsiteConfig();
      if (result.isSuccess) {
        setConfig(result.getValue());
      }
      setLoading(false);
    };
    loadConfig();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900">School<span className="text-blue-600">SaaS</span></span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#fitur" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Fitur</a>
              <a href="#modul" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Modul</a>
              <a href="#harga" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Harga</a>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                Masuk
              </Link>
              <Link to="/subscribe" className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-colors shadow-sm">
                Coba Gratis
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden bg-white pt-24 pb-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto">
              <h1 
                className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 mb-6 leading-tight"
                dangerouslySetInnerHTML={{ __html: config.hero.headline }}
              />
              <p className="text-lg md:text-xl text-gray-600 mb-10 leading-relaxed">
                {config.hero.subheadline}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                <Link to={config.hero.ctaLink} className="w-full sm:w-auto text-base font-semibold bg-blue-600 text-white px-8 py-3.5 rounded-full hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20">
                  {config.hero.ctaText}
                </Link>
                <a href={config.hero.secondaryCtaLink} className="w-full sm:w-auto text-base font-semibold bg-white text-gray-700 px-8 py-3.5 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors">
                  {config.hero.secondaryCtaText}
                </a>
              </div>
            </div>
          </div>
          
          {/* Decorative background element */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-50 rounded-full blur-3xl opacity-50 -z-10"></div>
        </section>

        {/* Feature Highlights */}
        <section id="fitur" className="py-24 bg-gray-50 border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Mengapa Memilih Kami?</h2>
              <p className="text-gray-600 text-lg">Platform kami didesain khusus untuk memenuhi kebutuhan manajerial sekolah modern dengan arsitektur multi-tenant yang aman.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {config.features.map((f, i) => (
                <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="text-4xl mb-4">{f.icon}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing/Subscription Teaser */}
        <section id="harga" className="py-24 bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Paket Berlangganan</h2>
              <p className="text-gray-600 text-lg">Pilih paket yang paling sesuai dengan skala dan kebutuhan sekolah Anda.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {config.pricing.map((p, i) => (
                <div key={i} className={`bg-white rounded-3xl p-8 border ${p.popular ? 'border-blue-500 shadow-xl shadow-blue-500/10 relative' : 'border-gray-200 shadow-sm'}`}>
                  {p.popular && <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-bold tracking-wide">PALING POPULER</span>}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{p.name}</h3>
                  <p className="text-gray-500 mb-6 min-h-[48px]">{p.desc}</p>
                  <div className="mb-8">
                    <span className="text-4xl font-extrabold text-gray-900">{p.price}</span>
                    <span className="text-gray-500 font-medium ml-2">{p.period}</span>
                  </div>
                  <ul className="space-y-4 mb-8">
                    {p.features.map((f, j) => (
                      <li key={j} className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-3 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        <span className="text-gray-600">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to={`/subscribe?plan=${p.name.toLowerCase()}`} className={`block w-full text-center py-3 rounded-xl font-semibold transition-colors ${p.popular ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-50 text-gray-900 hover:bg-gray-100'}`}>
                    Pilih Paket
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-white">School<span className="text-blue-400">SaaS</span></span>
            </div>
            <p className="text-gray-400 max-w-sm">
              Memberdayakan institusi pendidikan melalui teknologi manajemen sekolah yang modern, aman, dan terjangkau.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-bold mb-4">Produk</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#fitur" className="hover:text-white transition-colors">Fitur</a></li>
              <li><a href="#modul" className="hover:text-white transition-colors">Modul</a></li>
              <li><a href="#harga" className="hover:text-white transition-colors">Harga</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-bold mb-4">Perusahaan</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Tentang Kami</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Kontak</a></li>
              <li><Link to="/platform/login" className="hover:text-white transition-colors">Admin Platform</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-gray-800 text-gray-500 text-sm text-center">
          &copy; {new Date().getFullYear()} SchoolSaaS Platform. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
