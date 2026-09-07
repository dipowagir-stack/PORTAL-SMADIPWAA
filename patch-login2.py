with open("src/pages/Login.tsx", "r") as f:
    content = f.read()

start_marker = '  return (\n    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">'
end_marker = '            {error && (\n              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">\n                {error}\n              </div>\n            )}'

if start_marker in content and end_marker in content:
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)
    
    replacement = """  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Only show PPDB for global SchoolSaaS login if needed, or hide if tenantProfile exists */}
        {!tenantProfile && (
          <div className="flex justify-center mb-8">
            <Link to="/ppdb" className="text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-1.5 rounded-full transition-colors flex items-center">
              <GraduationCap className="w-4 h-4 mr-2" />
              Portal PPDB 2026/2027
            </Link>
          </div>
        )}
        
        <div className="flex justify-center">
          {tenantProfile?.logoUrl ? (
            <img src={tenantProfile.logoUrl} alt={tenantProfile.shortName} className="h-20 w-auto object-contain" />
          ) : (
            <div className="h-20 w-20 rounded-2xl shadow-lg flex items-center justify-center" style={{ backgroundColor: tenantProfile?.primaryColor || '#2563eb' }}>
              <span className="text-white font-bold text-4xl">
                {tenantProfile ? tenantProfile.shortName.substring(0, 1) : 'S'}
              </span>
            </div>
          )}
        </div>
        
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          {tenantProfile ? (
            <>Login <span style={{ color: tenantProfile.primaryColor }}>{tenantProfile.shortName}</span></>
          ) : (
            <>School<span className="text-blue-600">SaaS</span> Login</>
          )}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {tenantProfile ? `Masuk ke akun ${tenantProfile.schoolName} Anda` : 'Masuk ke akun sekolah Anda'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-500 text-center mb-6">
                Silahkan login menggunakan akun Google Anda yang terdaftar pada sekolah Anda.
              </p>
            </div>
"""
    new_content = content[:start_idx] + replacement + content[end_idx:]
    with open("src/pages/Login.tsx", "w") as f:
        f.write(new_content)
    print("Replace success")
else:
    print("Markers not found")
    print("Start:", start_marker in content)
    print("End:", end_marker in content)
