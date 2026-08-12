import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { PlatformTenantApiService } from '../../../admin/services/platform-tenant-api.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';
import { Button } from '../../../../shared/ui/button/button';
import { SelectedTenantContextService } from '../../services/selected-tenant-context.service';

@Component({
  selector: 'app-selected-tenant-context-band',
  standalone: true,
  imports: [FormsModule, Button, ConfirmationDialog],
  templateUrl: './selected-tenant-context-band.html',
  styleUrl: './selected-tenant-context-band.scss'
})
export class SelectedTenantContextBand {
  private readonly tenantContext = inject(TenantContextService);
  private readonly selectedTenantContext = inject(SelectedTenantContextService);
  private readonly tenantApi = inject(PlatformTenantApiService);
  private readonly apiError = inject(ApiErrorService);
  private readonly router = inject(Router);

  readonly tenantId = input.required<string>();
  readonly tenantName = input.required<string>();
  readonly tenantCode = input<string | null>(null);
  readonly lifecycleStatus = input<string | null>(null);
  readonly planName = input<string | null>(null);
  readonly showSwitch = input(true);
  readonly showExit = input(true);

  readonly exited = output<void>();
  readonly switched = output<string>();

  readonly exitConfirmOpen = signal(false);
  readonly switchOpen = signal(false);
  readonly switchLoading = signal(false);
  readonly switchError = signal<string | null>(null);
  readonly switchSearch = signal('');
  readonly switchOptions = signal<Array<{ id: string; name: string; code: string }>>([]);

  readonly isSuspended = computed(() => {
    const status = (this.lifecycleStatus() ?? '').toUpperCase();
    return status === 'SUSPENDED';
  });

  openSwitch(): void {
    this.switchOpen.set(true);
    this.switchError.set(null);
    this.switchSearch.set('');
    this.loadTenants();
  }

  closeSwitch(): void {
    this.switchOpen.set(false);
  }

  loadTenants(): void {
    this.switchLoading.set(true);
    this.tenantApi
      .getTenants({
        pageNumber: 1,
        pageSize: 25,
        search: this.switchSearch().trim() || undefined,
        sortBy: 'name',
        sortDirection: 'asc'
      })
      .subscribe({
        next: (response) => {
          this.switchOptions.set(
            response.items.map((item) => ({
              id: item.id,
              name: item.name,
              code: item.code
            }))
          );
          this.switchLoading.set(false);
        },
        error: (error) => {
          this.switchError.set(this.apiError.toSafeMessage(error));
          this.switchLoading.set(false);
        }
      });
  }

  selectTenant(tenantId: string, tenantName: string, tenantCode: string): void {
    if (tenantId === this.tenantId()) {
      this.closeSwitch();
      return;
    }

    this.selectedTenantContext.clearForTenantSwitch();
    this.tenantContext.setSelectedTenant({
      tenantId,
      tenantName,
      tenantCode
    });
    this.closeSwitch();
    this.switched.emit(tenantId);
    void this.router.navigate(['/admin/tenants', tenantId, 'configure']);
  }

  confirmExit(): void {
    this.exitConfirmOpen.set(true);
  }

  cancelExit(): void {
    this.exitConfirmOpen.set(false);
  }

  exitContext(): void {
    const tenantId = this.tenantId();
    this.exitConfirmOpen.set(false);
    this.selectedTenantContext.clear();
    this.tenantContext.clearSelectedTenant();
    this.exited.emit();
    void this.router.navigate(tenantId ? ['/admin/tenants', tenantId] : ['/admin/tenants']);
  }
}
