import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ErrorState } from './error-state';

describe('ErrorState', () => {
  let fixture: ComponentFixture<ErrorState>;
  let component: ErrorState;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorState]
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorState);
    component = fixture.componentInstance;
  });

  it('renders default title and message', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')?.textContent).toBe('Something went wrong');
    expect(compiled.querySelector('p')?.textContent).toBe('An error occurred while loading this feature. Please try again.');
  });

  it('hides retry button by default', () => {
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.retry-btn');
    expect(btn).toBeNull();
  });

  it('shows retry button and emits event on click', () => {
    fixture.componentRef.setInput('hasRetry', true);
    fixture.detectChanges();
    
    const btn = fixture.nativeElement.querySelector('.retry-btn');
    expect(btn).toBeTruthy();

    const spy = vi.spyOn(component.retry, 'emit');
    btn.click();
    expect(spy).toHaveBeenCalled();
  });
});
