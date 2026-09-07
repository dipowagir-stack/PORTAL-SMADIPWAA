import sys
content = open('src/pages/public/website/PublicWebsiteLayout.tsx').read()
content = content.replace("const basePath = isPreview ? `/school/${location.pathname.split('/')[2]}` : '';", "const basePath = location.pathname.startsWith('/s/') ? `/s/${location.pathname.split('/')[2]}` : location.pathname.startsWith('/school/') ? `/school/${location.pathname.split('/')[2]}` : '';")
open('src/pages/public/website/PublicWebsiteLayout.tsx', 'w').write(content)
