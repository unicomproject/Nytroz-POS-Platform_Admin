import { Routes } from '@angular/router';

import { featureKeys } from '../../../core/config/feature-keys';
import { catalogPermissions } from '../../../core/config/permission-keys';

export const productsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('../pages/product-list-page/product-list-page').then((m) => m.ProductListPage),
    data: {
      title: 'Products',
      requiresTenant: true,
      requiredPermission: catalogPermissions.productView,
      requiredFeature: featureKeys.productCatalog
    }
  }
];
