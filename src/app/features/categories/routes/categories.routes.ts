import { Routes } from '@angular/router';

import { featureKeys } from '../../../core/config/feature-keys';
import { catalogPermissions } from '../../../core/config/permission-keys';

export const categoriesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('../pages/category-list-page/category-list-page').then((m) => m.CategoryListPage),
    data: {
      title: 'Categories',
      requiresTenant: true,
      requiredPermission: catalogPermissions.categoryView,
      requiredFeature: featureKeys.categories
    }
  }
];
