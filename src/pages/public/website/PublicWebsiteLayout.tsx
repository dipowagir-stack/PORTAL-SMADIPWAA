import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { TenantPublicProfile } from '../../../domains/website/types';
import { Menu, X, Facebook, Instagram, Twitter, Youtube, Mail, Phone, Globe, ArrowRight } from 'lucide-react';

export default function PublicWebsiteLayout({ profile }: { profile: TenantPublicProfile }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isPreview = location.pathname.startsWith('/s/') || location.pathname.startsWith('/school/');
  const basePath = location.pathname.startsWith('/s/') ? `/s/${location.pathname.split('/')[2]}` : location.pathname.startsWith('/school/') ? `/school/${location.pathname.split('/')[2]}` : '';

  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', profile.primaryColor);
    document.documentElement.style.setProperty('--color-secondary', profile.secondaryColor);
    document.documentElement.style.setProperty('--color-accent', profile.accentColor);
    
    if (profile.seoConfig?.title) {
      document.title = profile.seoConfig.title;
    }

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [profile]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: 'Beranda', path: `${basePath}/` },
    { name: 'Profil', path: `${basePath}/halaman/profil` },
    { name: 'Program', path: `${basePath}/halaman/program` },
    { name: 'Fasilitas', path: `${basePath}/halaman/fasilitas` },
    { name: 'Berita', path: `${basePath}/berita/index` },
    { name: 'Acara', path: `${basePath}/acara` },
    { name: 'PPDB', path: `${basePath}/ppdb` },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-50/30">
      <header 
        className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md py-0' : 'bg-white shadow-sm py-1'}`} 
        style={{ borderBottomColor: profile.primaryColor, borderBottomWidth: '4px' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <Link to={basePath || '/'} className="flex items-center space-x-4 flex-shrink-0 group">
              {profile.logoUrl ? (
                <img src={profile.logoUrl} alt={profile.shortName} className="h-12 w-auto object-contain transition-transform group-hover:scale-105" />
              ) : (
                <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-sm" style={{ backgroundColor: profile.primaryColor }}>
                  {profile.shortName.substring(0, 2)}
                </div>
              )}
              <div className="hidden sm:block">
                <h1 className="text-xl font-extrabold text-gray-900 leading-tight tracking-tight line-clamp-1">{profile.schoolName}</h1>
                <p className="text-xs text-gray-500 font-medium line-clamp-1 tracking-wide uppercase">{profile.officialName}</p>
              </div>
            </Link>
            
            <nav className="hidden lg:flex space-x-8 items-center">
              {navLinks.map((link, idx) => (
                <Link 
                  key={idx} 
                  to={link.path} 
                  className={`text-sm font-semibold transition-colors ${location.pathname === link.path ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  {link.name}
                </Link>
              ))}
              <div className="pl-6 border-l border-gray-200">
                <Link 
                  to={`${basePath}/login`} 
                  className="inline-flex items-center px-5 py-2.5 text-sm font-bold text-white rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95" 
                  style={{ backgroundColor: profile.primaryColor }}
                >
                  Portal Login
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </div>
            </nav>

            <div className="flex items-center lg:hidden space-x-4">
              <Link 
                to={`${basePath}/login`} 
                className="px-4 py-2 text-xs font-bold text-white rounded-lg shadow-sm" 
                style={{ backgroundColor: profile.primaryColor }}
              >
                Login
              </Link>
              <button
                type="button"
                className="text-gray-600 hover:text-gray-900 p-2 -mr-2 focus:outline-none rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-expanded={mobileMenuOpen}
              >
                <span className="sr-only">Buka menu utama</span>
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-gray-100 absolute w-full shadow-xl shadow-gray-900/5 origin-top animate-in fade-in slide-in-from-top-4">
            <div className="px-4 pt-2 pb-6 space-y-1">
              {navLinks.map((link, idx) => (
                <Link
                  key={idx}
                  to={link.path}
                  className={`block px-4 py-3 rounded-lg text-base font-semibold ${location.pathname === link.path ? 'bg-gray-50 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow">
        <Outlet context={{ profile, basePath }} />
      </main>

      <footer className="bg-gray-900 text-gray-300 pt-20 pb-10 border-t-4" style={{ borderTopColor: profile.primaryColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16">
          <div className="md:col-span-5 lg:col-span-4">
            <div className="flex items-center space-x-4 mb-6">
              {profile.logoUrl && <img src={profile.logoUrl} alt={profile.shortName} className="h-12 w-auto bg-white rounded-lg p-1.5" />}
              <div>
                 <h3 className="text-2xl font-extrabold text-white tracking-tight">{profile.schoolName}</h3>
                 <p className="text-sm text-gray-400 font-medium uppercase tracking-wider mt-1">{profile.officialName}</p>
              </div>
            </div>
            <p className="text-gray-400 mb-8 leading-relaxed max-w-sm">{profile.address}</p>
            <div className="flex space-x-5">
               {profile.socialLinks?.facebook && <a href={profile.socialLinks.facebook} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-white transition-colors"><Facebook className="w-5 h-5" /></a>}
               {profile.socialLinks?.instagram && <a href={profile.socialLinks.instagram} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-white transition-colors"><Instagram className="w-5 h-5" /></a>}
               {profile.socialLinks?.twitter && <a href={profile.socialLinks.twitter} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-white transition-colors"><Twitter className="w-5 h-5" /></a>}
               {profile.socialLinks?.youtube && <a href={profile.socialLinks.youtube} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-white transition-colors"><Youtube className="w-5 h-5" /></a>}
            </div>
          </div>
          
          <div className="md:col-span-3 lg:col-span-4">
            <h4 className="font-bold text-lg mb-6 text-white">Tautan Cepat</h4>
            <ul className="space-y-4">
              <li><Link to={`${basePath}/`} className="hover:text-white font-medium transition-colors">Beranda</Link></li>
              <li><Link to={`${basePath}/halaman/profil`} className="hover:text-white font-medium transition-colors">Profil Sekolah</Link></li>
              <li><Link to={`${basePath}/ppdb`} className="hover:text-white font-medium transition-colors">Pendaftaran PPDB</Link></li>
              <li><Link to={`${basePath}/login`} className="hover:text-white font-medium transition-colors">Portal Warga Sekolah</Link></li>
            </ul>
          </div>
          
          <div className="md:col-span-4 lg:col-span-4">
            <h4 className="font-bold text-lg mb-6 text-white">Hubungi Kami</h4>
            <ul className="space-y-5">
              <li className="flex items-start">
                <Phone className="w-5 h-5 mr-3 text-gray-500 flex-shrink-0" />
                <a href={`tel:${profile.phone}`} className="hover:text-white font-medium transition-colors mt-0.5">{profile.phone}</a>
              </li>
              <li className="flex items-start">
                <Mail className="w-5 h-5 mr-3 text-gray-500 flex-shrink-0" />
                <a href={`mailto:${profile.email}`} className="hover:text-white font-medium transition-colors break-all mt-0.5">{profile.email}</a>
              </li>
              {profile.website && (
                <li className="flex items-start">
                  <Globe className="w-5 h-5 mr-3 text-gray-500 flex-shrink-0" />
                  <a href={profile.website} target="_blank" rel="noreferrer" className="hover:text-white font-medium transition-colors break-all mt-0.5">{profile.website}</a>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-8 border-t border-gray-800/50 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm font-medium">
          <p>&copy; {new Date().getFullYear()} {profile.officialName}. Hak Cipta Dilindungi.</p>
          <p className="mt-2 md:mt-0">Diberdayakan oleh EduOS Platform</p>
        </div>
      </footer>
    </div>
  );
}
