import React, { useEffect, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { TenantPublicProfile, CmsContent } from '../../../domains/website/types';
import { websiteService } from '../../../domains/website/services/WebsiteService';
import { ArrowRight, BookOpen, Calendar, Info } from 'lucide-react';

export default function PublicHome() {
  const { profile, basePath, isPpdbActive } = useOutletContext<{ profile: TenantPublicProfile, basePath: string, isPpdbActive: boolean }>();
  const [news, setNews] = useState<CmsContent[]>([]);
  const [programs, setPrograms] = useState<CmsContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [newsRes, progRes] = await Promise.all([
        websiteService.getPublicContents(profile.tenantId, 'ARTICLE'),
        websiteService.getPublicContents(profile.tenantId, 'PROGRAM')
      ]);

      if (newsRes.isSuccess) setNews(newsRes.getValue().slice(0, 3));
      if (progRes.isSuccess) setPrograms(progRes.getValue().slice(0, 4));

      setLoading(false);
    };
    fetchData();
  }, [profile.tenantId]);

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section 
        className="relative bg-gray-900 overflow-hidden flex items-center min-h-[600px] md:min-h-[720px]" 
      >
        {profile.heroImage && (
          <div className="absolute inset-0 z-0">
            <img src={profile.heroImage} alt="Hero" className="w-full h-full object-cover opacity-40 mix-blend-overlay" />
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 to-gray-900/20" />
          </div>
        )}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-24">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-[1.1] tracking-tight">
              {profile.heroTitle}
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl leading-relaxed font-medium">
              {profile.heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
              {isPpdbActive && (
                <Link 
                  to={`${basePath}/ppdb`} 
                  className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-bold text-lg text-white shadow-lg shadow-black/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: profile.primaryColor }}
                >
                  Info Pendaftaran
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              )}
              <Link 
                to={`${basePath}/halaman/profil`} 
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-bold text-lg bg-white/10 text-white backdrop-blur-md hover:bg-white/20 transition-all border border-white/20"
              >
                Profil Sekolah
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Principal Welcome Section */}
      {profile.principalWelcome && (
        <section className="py-24 md:py-32 bg-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, currentColor 0%, transparent 50%)', color: profile.primaryColor }} />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h2 className="text-sm font-bold tracking-widest uppercase mb-4" style={{ color: profile.primaryColor }}>Sambutan Kepala Sekolah</h2>
            <blockquote className="text-2xl md:text-3xl font-medium text-gray-900 leading-relaxed italic">
              "{profile.principalWelcome}"
            </blockquote>
          </div>
        </section>
      )}

      {/* Programs Section */}
      {!loading && programs.length > 0 && (
        <section className="py-24 md:py-32 bg-gray-50/50 border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Program Unggulan</h2>
              <p className="text-gray-600 text-lg md:text-xl">Membangun generasi cerdas dan berkarakter melalui pendidikan komprehensif.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {programs.map(prog => (
                <Link key={prog.id} to={`${basePath}/halaman/${prog.slug}`} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 hover:shadow-xl hover:shadow-black/5 transition-all duration-300 group flex flex-col h-full">
                  <div className="w-12 h-12 rounded-xl mb-6 flex items-center justify-center bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform" style={{ backgroundColor: `${profile.primaryColor}15`, color: profile.primaryColor }}>
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 leading-tight">{prog.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 mb-6 flex-grow">{prog.summary || prog.content.substring(0, 100)}</p>
                  <span className="text-sm font-semibold inline-flex items-center transition-colors" style={{ color: profile.primaryColor }}>
                    Pelajari lebih lanjut <ArrowRight className="ml-1 w-4 h-4" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest News / Announcements Section */}
      <section className="py-24 md:py-32 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-16 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Informasi Terbaru</h2>
              <p className="text-gray-600 text-lg md:text-xl">Berita, kegiatan, dan pengumuman resmi dari sekolah.</p>
            </div>
            <Link 
              to={`${basePath}/berita/index`}
              className="inline-flex items-center text-sm font-bold hover:opacity-80 transition-opacity"
              style={{ color: profile.primaryColor }}
            >
              Lihat Semua Informasi <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          {loading ? (
             <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-gray-200 rounded-full border-t-gray-900"></div></div>
          ) : news.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
              {news.map(item => (
                <Link key={item.id} to={`${basePath}/berita/${item.slug}`} className="flex flex-col group">
                  <div className="rounded-2xl overflow-hidden mb-6 aspect-[4/3] bg-gray-100 relative">
                    {item.featuredImage ? (
                       <img src={item.featuredImage} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <Info className="w-12 h-12 opacity-20" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 mb-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1" /> {new Date(item.publishedAt || item.createdAt).toLocaleDateString('id-ID')}</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 leading-snug group-hover:text-blue-600 transition-colors" style={{ '--tw-text-opacity': '1', color: `var(--color-primary)` } as any}>
                    <span className="text-gray-900 group-hover:opacity-80">{item.title}</span>
                  </h3>
                  <p className="text-gray-600 line-clamp-2 text-base leading-relaxed">{item.summary || item.content.substring(0, 100)}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-3xl border border-gray-100">
              <Info className="w-10 h-10 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Belum ada informasi terbaru saat ini.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
