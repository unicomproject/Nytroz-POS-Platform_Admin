import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Button } from './button';

describe('Button', () => {
  let fixture: ComponentFixture<Button>;
  let component: Button;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Button]
    }).compileComponents();

    fixture = TestBed.createComponent(Button);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the button', () => {
    expect(component).toBeTruthy();
  });

  it('renders default button type and variant classes', () => {
    const buttonEl = fixture.nativeElement.querySelector('button');
    expect(buttonEl.getAttribute('type')).toBe('button');
    expect(buttonEl.className).toContain('primary');
    expect(buttonEl.className).toContain('default');
  });

  it('accepts submit type', () => {
    fixture.componentRef.setInput('type', 'submit');
    fixture.detectChanges();
    const buttonEl = fixture.nativeElement.querySelector('button');
    expect(buttonEl.getAttribute('type')).toBe('submit');
  });

  it('accepts and applies secondary compact styles', () => {
    fixture.componentRef.setInput('variant', 'secondary');
    fixture.componentRef.setInput('size', 'compact');
    fixture.detectChanges();
    const buttonEl = fixture.nativeElement.querySelector('button');
    expect(buttonEl.className).toContain('secondary');
    expect(buttonEl.className).toContain('compact');
  });

  it('disables the button element when input disabled is true', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const buttonEl = fixture.nativeElement.querySelector('button');
    expect(buttonEl.disabled).toBe(true);
  });
});
