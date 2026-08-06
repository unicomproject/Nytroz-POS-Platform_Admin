import { Component, computed, input } from '@angular/core';

import { presentManualPaymentStatus } from '../../mappers/manual-payment.mapper';

@Component({
  selector: 'app-manual-payment-status-badge',
  standalone: true,
  template: `<span class="status" [class]="'status ' + presentation().tone" [attr.data-status]="presentation().raw">
    {{ presentation().label }}
    @if (!presentation().known && presentation().raw) { <span class="sr-only">({{ presentation().raw }})</span> }
  </span>`,
  styles: `
    .status{border:1px solid #d0d5dd;border-radius:999px;display:inline-flex;font-size:.75rem;font-weight:700;padding:.28rem .55rem;white-space:nowrap}
    .neutral{background:#f2f4f7;color:#344054}.info{background:#eff8ff;border-color:#b2ddff;color:#175cd3}
    .warning{background:#fffaeb;border-color:#fedf89;color:#b54708}.success{background:#ecfdf3;border-color:#abefc6;color:#067647}
    .danger{background:#fef3f2;border-color:#fecdca;color:#b42318}.sr-only{clip:rect(0,0,0,0);clip-path:inset(50%);height:1px;overflow:hidden;position:absolute;width:1px}
  `
})
export class ManualPaymentStatusBadge {
  readonly status = input<string | null>();
  readonly presentation = computed(() => presentManualPaymentStatus(this.status()));
}
