with open("firestore.rules", "r") as f:
    lines = f.readlines()

# Find the last two lines which are closing braces
while lines[-1].strip() == "" or lines[-1].strip() == "}":
    lines.pop()

if lines[-1].strip() == "}":
    lines.pop()

with open("firestore.rules", "w") as f:
    f.writelines(lines)
    f.write("""
    // ========================================================================
    // PLATFORM FOUNDATION (MULTI-TENANT)
    // ========================================================================
    match /tenants/{tenantId} {
      allow read: if request.auth != null && canAccessTenant(tenantId);
      allow write: if request.auth != null && isPlatformAdmin();
    }
    match /tenant_memberships/{membershipId} {
      allow read: if request.auth != null && (resource.data.userId == request.auth.uid || isPlatformAdmin() || (hasAnyRole(['admin', 'super_admin']) && canAccessTenant(resource.data.tenantId)));
      allow write: if request.auth != null && isPlatformAdmin();
    }
    match /tenant_subscriptions/{subId} {
      allow read: if request.auth != null && (isPlatformAdmin() || canAccessTenant(resource.data.tenantId));
      allow write: if request.auth != null && isPlatformAdmin();
    }
    match /platform_releases/{releaseId} {
      allow read: if request.auth != null && isPlatformAdmin();
      allow write: if request.auth != null && isPlatformAdmin();
    }
    match /platform_modules/{moduleId} {
      allow read: if request.auth != null && isPlatformAdmin();
      allow write: if request.auth != null && isPlatformAdmin();
    }

    // ========================================================================
    // WEBSITE & CMS DOMAIN
    // ========================================================================
    match /tenant_public_profiles/{tenantId} {
      allow read: if true;
      allow write: if request.auth != null && canAccessTenant(tenantId) && (hasPermission('website:manage') || hasAnyRole(['super_admin', 'admin']));
    }
    match /tenant_cms_contents/{contentId} {
      allow read: if (resource.data.status == 'PUBLISHED') || 
                  (request.auth != null && canAccessTenant(resource.data.tenantId) && (hasPermission('website:read') || hasPermission('website:manage') || hasAnyRole(['super_admin', 'admin'])));
      allow create: if request.auth != null && canAccessTenant(request.resource.data.tenantId) && (hasPermission('website:manage') || hasAnyRole(['super_admin', 'admin']));
      allow update: if request.auth != null && canAccessTenant(resource.data.tenantId) && (hasPermission('website:manage') || hasAnyRole(['super_admin', 'admin'])) && 
                       (request.resource.data.status != 'PUBLISHED' || hasPermission('website:publish') || hasAnyRole(['super_admin', 'admin']));
      allow delete: if request.auth != null && canAccessTenant(resource.data.tenantId) && (hasPermission('website:manage') || hasAnyRole(['super_admin', 'admin']));
    }
  }
}
""")
