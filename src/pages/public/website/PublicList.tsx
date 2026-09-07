import React, { useEffect, useState } from 'react';
import { useOutletContext, Link, useLocation } from 'react-router-dom';
import { TenantPublicProfile, CmsContent } from '../../../domains/website/types';
import { websiteService } from '../../../domains/website/services/WebsiteService';

export default function PublicList({ profile, type }: { profile: TenantPublicProfile, type: string }) {
  const { basePath } = useOutletContext<{ basePath: string }>();
  const [contents, setContents] = useState<CmsContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    websiteService.getPublicContents(profile.tenantId, type).then(res => {
      if (res.isSuccess) {
        setContents(res.getValue());
      }
      setLoading(false);
    });
  }, [profile.tenantId, type]);

  let title = '';
  let description = '';
  let detailPath = 'halaman';

  switch (type) {
    case 'ARTICLE':
      title = 'Berita Terbaru';
      description = 'Kabar dan informasi terkini dari sekolah.';
      detailPath = 'berita';
      break;
    case 'EVENT':
      title = 'Agenda Acara';
      description = 'Jadwal kegiatan dan acara sekolah.';
      detailPath = 'acara';
      break;
    case 'ANNOUNCEMENT':
      title = 'Pengumuman';
      description = 'Pengumuman penting untuk warga sekolah dan publik.';
      detailPath = 'pengumuman';
      break;
    case 'PROGRAM':
      title = 'Program Sekolah';
      description = 'Program unggulan dan ekstrakurikuler.';
      detailPath = 'halaman';
      break;
    case 'FACILITY':
      title = 'Fasilitas Sekolah';
      description = 'Sarana dan prasarana pendukung pembelajaran.';
      detailPath = 'halaman';
      break;
  }

  return (
    <div className="bg-gray-50 min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">{title}</h1>
          <p className="text-xl text-gray-500">{description}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-10 w-10 border-4 border-gray-300 rounded-full border-t-blue-600" style={{ borderTopColor: profile.primaryColor }}></div>
          </div>
        ) : contents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {contents.map(item => (
              <Link key={item.id} to={`${basePath}/${detailPath}/${item.slug}`} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow group flex flex-col">
                {item.featuredImage ? (
                  <div className="h-56 overflow-hidden flex-shrink-0">
                    <img src={item.featuredImage} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                ) : (
                  <div className="h-56 bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-400">No Image</span>
                  </div>
                )}
                <div className="p-6 flex-grow flex flex-col">
                  {item.publishedAt && (
                    <p className="text-sm font-medium text-gray-500 mb-3" style={{ color: profile.primaryColor }}>
                      {new Date(item.publishedAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  )}
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">{item.title}</h3>
                  <p className="text-gray-600 line-clamp-3 text-sm flex-grow">{item.summary || item.content.replace(/<[^>]*>?/gm, '').substring(0, 120)}</p>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100 text-sm font-medium" style={{ color: profile.primaryColor }}>
                    Baca selengkapnya &rarr;
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Belum ada data</h3>
            <p className="text-gray-500">Konten untuk kategori ini belum tersedia saat ini.</p>
          </div>
        )}
      </div>
    </div>
  );
}
