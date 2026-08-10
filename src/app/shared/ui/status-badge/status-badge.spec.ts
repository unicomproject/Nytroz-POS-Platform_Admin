import { TestBed, ComponentFixture } from '@angular/core/testing';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  let fixture: ComponentFixture<StatusBadge>;
  let component: StatusBadge;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusBadge]
    }).compileComponents();

    fixture = TestBed.createComponent(StatusBadge);
    component = fixture.componentInstance;
  });

  it('renders neutral badge by default', () => {
    fixture.detectChanges();
    const badgeEl = fixture.nativeElement.querySelector('.status-badge');
    expect(badgeEl.className).toContain('neutral');
  });

  it('applies semantic state classes correctly', () => {
    fixture.componentRef.setInput('variant', 'success');
    fixture.detectChanges();
    let badgeEl = fixture.nativeElement.querySelector('.status-badge');
    expect(badgeEl.className).toContain('success');

    fixture.componentRef.setInput('variant', 'warning');
    fixture.detectChanges();
    badgeEl = fixture.nativeElement.querySelector('.status-badge');
    expect(badgeEl.className).toContain('warning');

    fixture.componentRef.setInput('variant', 'danger');
    fixture.detectChanges();
    badgeEl = fixture.nativeElement.querySelector('.status-badge');
    expect(badgeEl.className).toContain('danger');

    fixture.componentRef.setInput('variant', 'info');
    fixture.detectChanges();
    badgeEl = fixture.nativeElement.querySelector('.status-badge');
    expect(badgeEl.className).toContain('info');
  });
});
