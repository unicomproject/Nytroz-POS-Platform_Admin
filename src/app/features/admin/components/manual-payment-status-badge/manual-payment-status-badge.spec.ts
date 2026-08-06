import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManualPaymentStatusBadge } from './manual-payment-status-badge';

describe('ManualPaymentStatusBadge', () => {
  let fixture: ComponentFixture<ManualPaymentStatusBadge>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ManualPaymentStatusBadge] }).compileComponents();
    fixture = TestBed.createComponent(ManualPaymentStatusBadge);
  });

  it('renders a textual known status', () => {
    fixture.componentRef.setInput('status', 'ACTION_REQUIRED'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Action Required');
  });

  it('renders an accessible unknown fallback', () => {
    fixture.componentRef.setInput('status', 'NEW_STATE'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Unknown payment status');
    expect(fixture.nativeElement.textContent).toContain('NEW_STATE');
  });
});
