import { Component, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { RouteAccessData } from '../../../../core/models/route-access.model';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { PageHeader } from '../../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-admin-section-page',
  standalone: true,
  imports: [EmptyState, PageHeader],
  template: `
    <app-page-header [title]="data().title ?? 'Platform Admin'" [description]="data().description" />
    <app-empty-state
      title="Real API integration point"
      message="This TM-EPOS MVP page is ready for its feature service, typed API service, pagination, filters, loading, empty, error, permission, and entitlement states."
    />
  `
})
export class AdminSectionPage {
  readonly data = computed(() => this.route.snapshot.data as RouteAccessData);

  constructor(private readonly route: ActivatedRoute) {}
}
