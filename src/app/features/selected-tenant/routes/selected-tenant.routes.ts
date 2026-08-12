import { Routes } from '@angular/router';

import { platformPermissions } from '../../../core/config/permission-keys';

export const selectedTenantRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('../pages/setup-hub-page/setup-hub-page').then((m) => m.SetupHubPage),
    data: {
      title: 'Configure Tenant',
      requiredPermission: platformPermissions.tenantsBootstrapAccess
    }
  },
  {
    path: 'outlets/create',
    loadComponent: () =>
      import('../pages/create-outlet-page/create-outlet-page').then((m) => m.CreateOutletPage),
    data: {
      title: 'Create Outlet',
      requiredPermission: platformPermissions.tenantsBootstrapOutletsManage
    }
  },
  {
    path: 'tills/create',
    loadComponent: () =>
      import('../pages/create-till-page/create-till-page').then((m) => m.CreateTillPage),
    data: {
      title: 'Create Till',
      requiredPermission: platformPermissions.tenantsBootstrapTillsManage
    }
  },
  {
    path: 'roles/create',
    loadComponent: () =>
      import('../pages/create-role-page/create-role-page').then((m) => m.CreateRolePage),
    data: {
      title: 'Create Role',
      requiredPermission: platformPermissions.tenantsBootstrapRolesManage
    }
  },
  {
    path: 'users/create',
    loadComponent: () =>
      import('../pages/create-user-page/create-user-page').then((m) => m.CreateUserPage),
    data: {
      title: 'Add User',
      requiredPermission: platformPermissions.tenantsBootstrapUsersManage
    }
  },
  {
    path: 'products/manual',
    loadComponent: () =>
      import('../pages/product-manual-page/product-manual-page').then((m) => m.ProductManualPage),
    data: {
      title: 'Add Product',
      requiredPermission: platformPermissions.tenantsBootstrapProductsManage
    }
  },
  {
    path: 'products/import',
    loadComponent: () =>
      import('../pages/product-import-page/product-import-page').then((m) => m.ProductImportPage),
    data: {
      title: 'Import Products',
      requiredPermission: platformPermissions.tenantsBootstrapProductsImport
    }
  },
  {
    path: 'online-store',
    loadComponent: () =>
      import('../pages/online-store-page/online-store-page').then((m) => m.OnlineStorePage),
    data: {
      title: 'Online Store',
      requiredPermission: platformPermissions.tenantsBootstrapOnlineStoreManage
    }
  }
];
