import { Component } from '@angular/core';

import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { PageHeader } from '../../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-report-list-page',
  standalone: true,
  imports: [EmptyState, PageHeader],
  template: `
    <app-page-header
      title="Reports"
      description="Tenant-context reports and exports with backend pagination, filters, permission checks, and feature entitlement."
    />
    <app-empty-state />
  `
})
export class ReportListPage {}
