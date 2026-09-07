with open("src/pages/public/website/RootRouter.tsx", "r") as f:
    content = f.read()

content = content.replace(
    '{/* Common Auth Routes */}\n                  <Route path="/login" element={<Login />} />',
    '{/* Common Auth Routes */}\n                  <Route path="/login" element={<Login tenantProfile={customDomainProfile} />} />'
)

content = content.replace(
    '      {/* If a tenant has their own PPDB landing */}\n      <Route path="login" element={<Login />} />',
    '      {/* If a tenant has their own PPDB landing */}\n      <Route path="login" element={<Login tenantProfile={profile} />} />'
)

with open("src/pages/public/website/RootRouter.tsx", "w") as f:
    f.write(content)
print("Router patched")
