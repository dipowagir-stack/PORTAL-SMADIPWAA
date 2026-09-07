const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

rules = rules.replace(/match \/tenants\/\{tenantId\} \{\s+allow read: if request\.auth != null && canAccessTenant\(tenantId\);\s+allow write: if request\.auth != null && isPlatformAdmin\(\);\s+\}/, `match /tenants/{tenantId} {
      allow read: if request.auth != null && canAccessTenant(tenantId);
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && isPlatformAdmin();
    }`);

rules = rules.replace(/match \/tenant_memberships\/\{membershipId\} \{\s+allow read: if request\.auth != null && \(resource\.data\.userId == request\.auth\.uid \|\| isPlatformAdmin\(\) \|\| \(hasAnyRole\(\['admin', 'super_admin'\]\) && canAccessTenant\(resource\.data\.tenantId\)\)\);\s+allow write: if request\.auth != null && isPlatformAdmin\(\);\s+\}/, `match /tenant_memberships/{membershipId} {
      allow read: if request.auth != null && (resource.data.userId == request.auth.uid || isPlatformAdmin() || (hasAnyRole(['admin', 'super_admin']) && canAccessTenant(resource.data.tenantId)));
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && isPlatformAdmin();
    }`);

rules = rules.replace(/match \/tenant_public_profiles\/\{tenantId\} \{\s+allow read: if true;\s+allow write: if request\.auth != null && canAccessTenant\(tenantId\) && \(hasPermission\('website:manage'\) \|\| hasAnyRole\(\['super_admin', 'admin'\]\)\);\s+\}/, `match /tenant_public_profiles/{tenantId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && canAccessTenant(tenantId) && (hasPermission('website:manage') || hasAnyRole(['super_admin', 'admin']));
    }`);

fs.writeFileSync('firestore.rules', rules);
