import re

with open("src/pages/Login.tsx", "r") as f:
    content = f.read()

replacement = """
  return (
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

pattern = r"""  return \(\n    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">\n      <div className="sm:mx-auto sm:w-full sm:max-w-md">\n        <div className="flex justify-center mb-8">\n          <Link to="/ppdb" className="text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-1.5 rounded-full transition-colors flex items-center">\n            <GraduationCap className="w-4 h-4 mr-2" />\n            Portal PPDB 2026/2027\n          </Link>\n        </div>\n        <div className="flex justify-center">\n          <div className="h-20 w-20 bg-blue-600 rounded-2xl shadow-lg flex items-center justify-center">\n            <span className="text-white font-bold text-4xl">S</span>\n          </div>\n        </div>\n        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">\n          School<span className="text-blue-600">SaaS</span> Login\n        </h2>\n        <p className="mt-2 text-center text-sm text-gray-600">\n          Masuk ke akun sekolah Anda\n        </p>\n      </div>\n      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">\n        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">\n          <div className="space-y-6">\n            <div>\n              <p className="text-sm text-gray-500 text-center mb-6">\n                Silahkan login menggunakan akun Google Anda yang terdaftar pada sekolah Anda.\n              </p>\n            </div>"""

new_content = re.sub(pattern, replacement, content, count=1)
if new_content == content:
    print("Replace failed")
else:
    with open("src/pages/Login.tsx", "w") as f:
        f.write(new_content)
    print("Replace success")
