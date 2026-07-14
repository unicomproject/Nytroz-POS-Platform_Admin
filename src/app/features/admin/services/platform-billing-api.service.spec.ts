import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BillingInvoice, BillingQuery } from '../models/platform-billing.model';
import { PlatformBillingApiService } from './platform-billing-api.service';

describe('PlatformBillingApiService', () => {
  let service: PlatformBillingApiService; let http: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]}); service=TestBed.inject(PlatformBillingApiService); http=TestBed.inject(HttpTestingController); });
  afterEach(() => http.verify());

  it('loads summary and paged invoices with server-side filters', () => {
    service.load(query()).subscribe();
    const summary=http.expectOne(r=>r.url==='/api/v1/platform-admin/billing/summary');
    const invoices=http.expectOne(r=>r.url==='/api/v1/platform-admin/billing/invoices');
    expect(summary.request.params.get('status')).toBe('OVERDUE');
    expect(invoices.request.params.get('pageNumber')).toBe('2');
    summary.flush({success:true,message:'ok',data:{currencies:[],totalInvoices:0,generatedAt:'2026-07-13T00:00:00Z'}});
    invoices.flush({success:true,message:'ok',data:{items:[],pageNumber:2,pageSize:25,totalCount:0,totalPages:0}});
  });

  it('sends the concurrency value when issuing an invoice', () => {
    service.issue(invoice()).subscribe();
    const request=http.expectOne('/api/v1/platform-admin/billing/invoices/i1/issue');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({expectedUpdatedAt:'2026-07-13T00:00:00Z'});
    request.flush({success:true,message:'ok',data:invoice()});
  });
});

function query():BillingQuery{return{pageNumber:2,pageSize:25,status:'OVERDUE',dateField:'dueAt',sortBy:'dueAt',sortDirection:'asc'}}
function invoice():BillingInvoice{return{id:'i1',invoiceNumber:'INV-1',tenantId:'t1',tenantCode:'TEN',tenantName:'Tenant',subscriptionId:'s1',subscriptionStatus:'ACTIVE',planId:'p1',planCode:'PRO',planName:'Pro',currencyCode:'LKR',totalAmount:100,paidAmount:0,balanceDue:100,storedStatus:'DRAFT',displayStatus:'DRAFT',issuedAt:null,dueAt:null,paidAt:null,createdAt:'2026-07-13T00:00:00Z',updatedAt:'2026-07-13T00:00:00Z',canIssue:true,canMarkPaid:false}}
