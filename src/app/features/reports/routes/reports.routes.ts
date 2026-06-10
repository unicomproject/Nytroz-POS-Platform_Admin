import { Routes } from '@angular/router';

import { featureKeys } from '../../../core/config/feature-keys';
import { reportPermissions } from '../../../core/config/permission-keys';

export const reportsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('../pages/report-list-page/report-list-page').then((m) => m.ReportListPage),
    data: {
      title: 'Reports',
      requiresTenant: true,
      requiredPermission: reportPermissions.reportView,
      requiredFeature: featureKeys.reports
    }
  }
];
