import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FormField } from './form-field';

describe('FormField', () => {
  let fixture: ComponentFixture<FormField>;
  let component: FormField;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormField]
    }).compileComponents();

    fixture = TestBed.createComponent(FormField);
    component = fixture.componentInstance;
  });

  it('renders label and handles associated element id', () => {
    fixture.componentRef.setInput('id', 'username-field');
    fixture.componentRef.setInput('label', 'Username');
    fixture.detectChanges();

    const labelEl = fixture.nativeElement.querySelector('label');
    expect(labelEl?.textContent?.trim()).toBe('Username');
    expect(labelEl?.getAttribute('for')).toBe('username-field');
  });

  it('shows required marker when required input is true', () => {
    fixture.componentRef.setInput('label', 'Email Address');
    fixture.componentRef.setInput('required', true);
    fixture.detectChanges();

    const requiredMarker = fixture.nativeElement.querySelector('.required');
    expect(requiredMarker).toBeTruthy();
    expect(requiredMarker.textContent).toContain('*');
  });

  it('displays helper text when no error is present', () => {
    fixture.componentRef.setInput('helperText', 'Must be a valid email');
    fixture.detectChanges();

    const helperEl = fixture.nativeElement.querySelector('.helper-text');
    expect(helperEl?.textContent).toBe('Must be a valid email');
    expect(fixture.nativeElement.querySelector('.error-text')).toBeNull();
  });

  it('displays error text and suppresses helper text when error is present', () => {
    fixture.componentRef.setInput('helperText', 'Must be a valid email');
    fixture.componentRef.setInput('error', 'Email is required');
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('.error-text');
    expect(errorEl?.textContent).toBe('Email is required');
    expect(fixture.nativeElement.querySelector('.helper-text')).toBeNull();
  });
});
