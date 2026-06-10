import { Component } from '@angular/core';

import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { PageHeader } from '../../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-product-list-page',
  standalone: true,
  imports: [EmptyState, PageHeader],
  template: `
    <app-page-header
      title="Products"
      description="Tenant-context catalog setup with backend pagination, filtering, sorting, permission checks, and feature entitlement."
    />
    <app-empty-state />
  `
})
export class ProductListPage {}
