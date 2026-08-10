import { TestBed, ComponentFixture } from '@angular/core/testing';
import { LoadingSkeleton } from './loading-skeleton';

describe('LoadingSkeleton', () => {
  let fixture: ComponentFixture<LoadingSkeleton>;
  let component: LoadingSkeleton;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingSkeleton]
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingSkeleton);
    component = fixture.componentInstance;
  });

  it('renders standard number of rows (3)', () => {
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.skeleton-row');
    expect(rows.length).toBe(3);
  });

  it('customizes rows based on input', () => {
    fixture.componentRef.setInput('rows', 5);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.skeleton-row');
    expect(rows.length).toBe(5);
  });

  it('shows avatar elements when avatar input is true', () => {
    fixture.componentRef.setInput('avatar', true);
    fixture.detectChanges();
    const avatars = fixture.nativeElement.querySelectorAll('.skeleton-avatar:not(.hidden)');
    expect(avatars.length).toBe(3);
  });

  it('adds pulse animation class when animate input is true', () => {
    fixture.detectChanges();
    const container = fixture.nativeElement.querySelector('.loading-skeleton');
    expect(container.className).toContain('animate');
  });
});
