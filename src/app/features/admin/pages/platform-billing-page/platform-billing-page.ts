import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { platformPermissions } from '../../../../core/config/permission-keys';
import { AccessControlService } from '../../../../core/services/access-control.service';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { BillingFilterOptions, BillingInvoice, BillingInvoiceDetail, BillingInvoiceList, BillingQuery, BillingSummary } from '../../models/platform-billing.model';
import { PlatformBillingApiService } from '../../services/platform-billing-api.service';

@Component({
  selector: 'app-platform-billing-page', standalone: true, imports: [FormsModule, DatePipe, CurrencyPipe],
  template: `
    <section class="billing-page">
      <header><div><h1>Billing</h1><p>Manage subscription invoices and payment status.</p></div><button class="refresh" (click)="load()">↻ Refresh</button></header>

      @if (loading() && !list()) { <div class="state">Loading billing data…</div> }
      @else if (error() && !list()) { <div class="state error"><strong>Billing could not be loaded</strong><span>{{ error() }}</span><button (click)="load()">Try again</button></div> }
      @else {
        <section class="kpis">
          <article><i class="blue">$</i><div><span>Paid Revenue</span>@for (x of summary()?.currencies ?? []; track x.currencyCode) { <strong>{{ x.paidRevenue | currency:x.currencyCode:'symbol':'1.2-2' }}</strong> } @if (!summary()?.currencies?.length) { <strong>—</strong> }</div></article>
          <article><i class="orange">◷</i><div><span>Outstanding</span>@for (x of summary()?.currencies ?? []; track x.currencyCode) { <strong>{{ x.outstandingAmount | currency:x.currencyCode:'symbol':'1.2-2' }}</strong> } @if (!summary()?.currencies?.length) { <strong>—</strong> }</div></article>
          <article><i class="red">!</i><div><span>Overdue</span>@for (x of summary()?.currencies ?? []; track x.currencyCode) { <strong>{{ x.overdueAmount | currency:x.currencyCode:'symbol':'1.2-2' }}</strong> } @if (!summary()?.currencies?.length) { <strong>—</strong> }</div></article>
          <article><i class="violet">▤</i><div><span>Total Invoices</span><strong>{{ summary()?.totalInvoices ?? 0 }}</strong></div></article>
        </section>

        <section class="filters">
          <input aria-label="Search invoices" placeholder="Search invoice or tenant…" [(ngModel)]="search" (ngModelChange)="queueSearch()" />
          <select aria-label="Tenant" [(ngModel)]="tenantId" (change)="applyFilters()"><option value="">All tenants</option>@for (t of options().tenants; track t.id) { <option [value]="t.id">{{ t.name }}</option> }</select>
          <select aria-label="Status" [(ngModel)]="status" (change)="applyFilters()"><option value="">All statuses</option>@for (s of options().statuses; track s) { <option [value]="s">{{ label(s) }}</option> }</select>
          <select aria-label="Date field" [(ngModel)]="dateField" (change)="applyFilters()"><option value="issuedAt">Issue date</option><option value="dueAt">Due date</option></select>
          <input aria-label="From date" type="date" [(ngModel)]="dateFrom" (change)="applyFilters()" />
          <input aria-label="To date" type="date" [(ngModel)]="dateTo" (change)="applyFilters()" />
          <button class="clear" (click)="clearFilters()">Clear</button>
        </section>

        @if (error()) { <div class="inline-error">{{ error() }}</div> }
        <section class="table-card" [class.busy]="loading()">
          <div class="table-scroll"><table><thead><tr>
            <th><button (click)="sort('invoiceNumber')">Invoice # {{ arrow('invoiceNumber') }}</button></th>
            <th><button (click)="sort('tenant')">Tenant {{ arrow('tenant') }}</button></th><th>Plan</th>
            <th><button (click)="sort('amount')">Amount {{ arrow('amount') }}</button></th>
            <th><button (click)="sort('status')">Status {{ arrow('status') }}</button></th>
            <th><button (click)="sort('issuedAt')">Issue date {{ arrow('issuedAt') }}</button></th>
            <th><button (click)="sort('dueAt')">Due date {{ arrow('dueAt') }}</button></th><th>Actions</th>
          </tr></thead><tbody>
            @for (invoice of list()?.items ?? []; track invoice.id) { <tr>
              <td><button class="link" (click)="open(invoice)">{{ invoice.invoiceNumber }}</button></td>
              <td><strong>{{ invoice.tenantName }}</strong><small>{{ invoice.tenantCode }}</small></td><td>{{ invoice.planName }}</td>
              <td>{{ invoice.totalAmount | currency:invoice.currencyCode:'symbol':'1.2-2' }}</td><td><span class="badge" [class]="'badge '+invoice.displayStatus.toLowerCase()">{{ label(invoice.displayStatus) }}</span></td>
              <td>{{ invoice.issuedAt ? (invoice.issuedAt | date:'mediumDate') : '—' }}</td><td>{{ invoice.dueAt ? (invoice.dueAt | date:'mediumDate') : '—' }}</td>
              <td class="actions"><button (click)="open(invoice)">View</button>@if (canManage && invoice.canIssue) { <button (click)="transition(invoice, 'issue')">Issue</button> }@if (canManage && invoice.canMarkPaid) { <button (click)="transition(invoice, 'paid')">Mark paid</button> }</td>
            </tr> } @empty { <tr><td colspan="8" class="empty">No invoices match these filters.</td></tr> }
          </tbody></table></div>
          <footer><span>Showing {{ rangeStart() }}–{{ rangeEnd() }} of {{ list()?.totalCount ?? 0 }}</span><div><button [disabled]="page === 1" (click)="go(page-1)">‹</button><b>{{ page }} / {{ list()?.totalPages || 1 }}</b><button [disabled]="page >= (list()?.totalPages || 1)" (click)="go(page+1)">›</button><select [(ngModel)]="pageSize" (change)="applyFilters()"><option [value]="10">10 / page</option><option [value]="25">25 / page</option><option [value]="50">50 / page</option></select></div></footer>
        </section>
      }
    </section>

    @if (detailLoading() || detailError() || detail()) { <div class="backdrop" (click)="close()"></div><aside class="drawer">
      @if (detailLoading()) { <div class="state">Loading invoice…</div> }
      @else if (detailError()) { <header><h2>Invoice could not be loaded</h2><button aria-label="Close" (click)="close()">×</button></header><div class="state error"><span>{{ detailError() }}</span><button (click)="retryDetail()">Try again</button></div> }
      @else if (detail(); as d) {
      <header><div><small>INVOICE</small><h2>{{ d.invoice.invoiceNumber }}</h2><span class="badge" [class]="'badge '+d.invoice.displayStatus.toLowerCase()">{{ label(d.invoice.displayStatus) }}</span></div><button aria-label="Close" (click)="close()">×</button></header>
      <section class="detail-grid"><div><span>Tenant</span><strong>{{ d.invoice.tenantName }}</strong></div><div><span>Plan</span><strong>{{ d.invoice.planName }}</strong></div><div><span>Total</span><strong>{{ d.invoice.totalAmount | currency:d.invoice.currencyCode }}</strong></div><div><span>Balance due</span><strong>{{ d.invoice.balanceDue | currency:d.invoice.currencyCode }}</strong></div><div><span>Issued</span><strong>{{ d.invoice.issuedAt ? (d.invoice.issuedAt | date:'medium') : '—' }}</strong></div><div><span>Due</span><strong>{{ d.invoice.dueAt ? (d.invoice.dueAt | date:'medium') : '—' }}</strong></div></section>
      <h3>Invoice lines</h3>@for (line of d.lines; track line.id) { <div class="detail-row"><div><strong>{{ line.description }}</strong><small>{{ line.quantity }} × {{ line.unitPrice | currency:d.invoice.currencyCode }}</small></div><b>{{ line.lineTotal | currency:d.invoice.currencyCode }}</b></div> } @empty { <p class="muted">No line items recorded.</p> }
      <h3>Payment history</h3>@for (payment of d.payments; track payment.id) { <div class="detail-row"><div><strong>{{ payment.providerName || 'Payment' }}</strong><small>{{ payment.status }} · {{ payment.createdAt | date:'medium' }}</small></div><b>{{ payment.amount | currency:payment.currencyCode }}</b></div> } @empty { <p class="muted">No payment transactions recorded.</p> }
      @if (canManage && (d.invoice.canIssue || d.invoice.canMarkPaid)) { <footer>@if (d.invoice.canIssue) { <button (click)="transition(d.invoice, 'issue')">Issue invoice</button> }@if (d.invoice.canMarkPaid) { <button (click)="transition(d.invoice, 'paid')">Mark as paid</button> }</footer> }
      }
    </aside> }
  `,
  styles: [`
    :host{display:block;color:#172342}.billing-page{padding:8px 10px 30px}header{display:flex;align-items:center;justify-content:space-between}h1{font-size:30px;margin:0 0 7px}h2,h3{margin:0}header p{margin:0;color:#63708d}.refresh,.clear,.actions button,.table-card footer button,.drawer footer button,.state button{border:1px solid #dbe2ee;background:#fff;border-radius:8px;padding:10px 14px;color:#263756;cursor:pointer}.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;margin:28px 0}.kpis article{display:flex;gap:16px;align-items:flex-start;min-height:105px;padding:22px;border:1px solid #dfe5ef;border-radius:14px;background:#fff;box-shadow:0 2px 6px #15284a0a}.kpis i{display:grid;place-items:center;width:54px;height:54px;border-radius:50%;font-size:25px;font-style:normal}.kpis div{display:flex;flex-direction:column;gap:6px}.kpis span,.detail-grid span{color:#63708d}.kpis strong{font-size:21px}.blue{background:#eaf3ff;color:#0867e8}.orange{background:#fff4e5;color:#d87900}.red{background:#ffeded;color:#e12d39}.violet{background:#f1ebff;color:#7048e8}.filters{display:grid;grid-template-columns:minmax(210px,1.5fr) repeat(3,minmax(130px,.8fr)) 150px 150px auto;gap:12px;margin-bottom:18px}.filters input,.filters select,.table-card select{border:1px solid #d9e1ed;border-radius:8px;background:#fff;padding:11px;color:#263756}.table-card{border:1px solid #dfe5ef;border-radius:14px;background:#fff;overflow:hidden}.table-card.busy{opacity:.65}.table-scroll{overflow:auto}table{width:100%;border-collapse:collapse;min-width:1050px}th,td{text-align:left;padding:16px 18px;border-bottom:1px solid #e7ebf2;white-space:nowrap}th{font-size:12px;background:#fafbfc}th button,.link{border:0;background:none;color:inherit;font-weight:700;cursor:pointer}.link{color:#0867e8;padding:0}td small{display:block;color:#7b879e;margin-top:4px}.badge{display:inline-block;padding:5px 9px;border-radius:6px;font-size:12px;background:#eef2f7}.badge.paid{background:#e7f8ed;color:#16823b}.badge.pending{background:#fff3df;color:#b76500}.badge.overdue{background:#ffe9e9;color:#d12634}.badge.draft{background:#eef1f6;color:#58667d}.actions{display:flex;gap:6px}.actions button{padding:7px 9px}.empty{text-align:center;color:#7b879e;padding:42px}.table-card>footer{display:flex;justify-content:space-between;align-items:center;padding:14px 18px}.table-card footer div{display:flex;align-items:center;gap:9px}.table-card footer button{padding:7px 11px}.state{display:flex;flex-direction:column;align-items:center;gap:12px;padding:70px;border:1px solid #e0e6ef;border-radius:14px;margin-top:28px}.error,.inline-error{color:#b4232e}.inline-error{background:#fff0f0;border:1px solid #ffcfd2;padding:11px;border-radius:8px;margin-bottom:12px}.backdrop{position:fixed;inset:0;background:#14213d55;z-index:20}.drawer{position:fixed;right:0;top:0;bottom:0;width:min(520px,92vw);z-index:21;background:#fff;box-shadow:-10px 0 30px #17234222;padding:26px;overflow:auto}.drawer>header{border-bottom:1px solid #e5e9f0;padding-bottom:20px}.drawer>header>button{border:0;background:none;font-size:30px;cursor:pointer}.drawer header small{color:#7b879e}.drawer header h2{margin:5px 0 9px}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:24px 0}.detail-grid div{display:flex;flex-direction:column;gap:5px}.drawer h3{font-size:15px;margin:18px 0 8px}.detail-row{display:flex;justify-content:space-between;gap:15px;padding:13px 0;border-bottom:1px solid #edf0f5}.detail-row small{display:block;color:#7b879e;margin-top:4px}.muted{color:#7b879e}.drawer>footer{position:sticky;bottom:-26px;background:#fff;border-top:1px solid #e5e9f0;padding:18px 0 8px;display:flex;gap:10px}.drawer>footer button{background:#0867e8;color:#fff;border-color:#0867e8}@media(max-width:1150px){.kpis{grid-template-columns:1fr 1fr}.filters{grid-template-columns:1fr 1fr 1fr}}@media(max-width:680px){.kpis{grid-template-columns:1fr}.filters{grid-template-columns:1fr}.table-card>footer{align-items:flex-start;gap:12px;flex-direction:column}}
  `]
})
export class PlatformBillingPage implements OnInit {
  private readonly api = inject(PlatformBillingApiService); private readonly errors = inject(ApiErrorService); private readonly access = inject(AccessControlService); private readonly route = inject(ActivatedRoute); private readonly router = inject(Router);
  readonly loading = signal(false); readonly error = signal(''); readonly summary = signal<BillingSummary | null>(null); readonly list = signal<BillingInvoiceList | null>(null); readonly detail = signal<BillingInvoiceDetail | null>(null); readonly detailLoading = signal(false); readonly detailError = signal(''); readonly options = signal<BillingFilterOptions>({ tenants: [], statuses: [] }); private detailId='';
  search=''; tenantId=''; status=''; dateField: 'issuedAt'|'dueAt'='issuedAt'; dateFrom=''; dateTo=''; sortBy='createdAt'; sortDirection: 'asc'|'desc'='desc'; page=1; pageSize=10; private searchTimer?: ReturnType<typeof setTimeout>;
  get canManage(){ return this.access.hasPermission(platformPermissions.billingManage); }
  ngOnInit(){ this.api.filters().subscribe({next:x=>this.options.set(x),error:e=>this.error.set(this.errors.toSafeMessage(e))}); this.load(); this.route.paramMap.subscribe(params=>{const id=params.get('invoiceId');if(id)this.loadDetail(id);else{this.detail.set(null);this.detailError.set('');this.detailLoading.set(false)}}); }
  load(){ this.loading.set(true); this.error.set(''); this.api.load(this.query()).subscribe({next:r=>{this.summary.set(r.summary);this.list.set(r.list);this.loading.set(false)},error:e=>{this.error.set(this.errors.toSafeMessage(e));this.loading.set(false)}}); }
  applyFilters(){ this.page=1; this.load(); } queueSearch(){ clearTimeout(this.searchTimer); this.searchTimer=setTimeout(()=>this.applyFilters(),350); }
  clearFilters(){ this.search='';this.tenantId='';this.status='';this.dateFrom='';this.dateTo='';this.dateField='issuedAt';this.applyFilters(); }
  go(page:number){this.page=page;this.load()} sort(field:string){if(this.sortBy===field)this.sortDirection=this.sortDirection==='asc'?'desc':'asc';else{this.sortBy=field;this.sortDirection='asc'}this.load()} arrow(field:string){return this.sortBy===field?(this.sortDirection==='asc'?'↑':'↓'):''}
  open(invoice:BillingInvoice){void this.router.navigate(['/admin/billing/invoices',invoice.id])} close(){void this.router.navigate(['/admin/billing'])} retryDetail(){if(this.detailId)this.loadDetail(this.detailId)}
  transition(invoice:BillingInvoice, action:'issue'|'paid'){const text=action==='issue'?'Issue this invoice?':'Mark this invoice as paid?';if(!confirm(text))return;const call=action==='issue'?this.api.issue(invoice):this.api.markPaid(invoice);call.subscribe({next:updated=>{this.load();this.loadDetail(updated.id)},error:e=>{const message=this.errors.toSafeMessage(e);this.error.set(message);this.detailError.set(message)}})}
  label(value:string){return value.toLowerCase().replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())} rangeStart(){return (this.list()?.totalCount??0)?(this.page-1)*this.pageSize+1:0} rangeEnd(){return Math.min(this.page*this.pageSize,this.list()?.totalCount??0)}
  private query():BillingQuery{return{pageNumber:this.page,pageSize:Number(this.pageSize),search:this.search||undefined,tenantId:this.tenantId||undefined,status:this.status||undefined,dateFrom:this.dateFrom?new Date(this.dateFrom+'T00:00:00Z').toISOString():undefined,dateTo:this.dateTo?new Date(this.dateTo+'T23:59:59.999Z').toISOString():undefined,dateField:this.dateField,sortBy:this.sortBy,sortDirection:this.sortDirection}}
  private loadDetail(id:string){this.detailId=id;this.detail.set(null);this.detailError.set('');this.detailLoading.set(true);this.api.detail(id).subscribe({next:x=>{this.detail.set(x);this.detailLoading.set(false)},error:e=>{this.detailError.set(this.errors.toSafeMessage(e));this.detailLoading.set(false)}})}
}
