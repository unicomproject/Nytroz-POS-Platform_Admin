import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmationDialog } from './confirmation-dialog';

describe('ConfirmationDialog', () => {
  let fixture: ComponentFixture<ConfirmationDialog>;
  let component: ConfirmationDialog;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmationDialog]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmationDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function openDialog(overrides: Record<string, unknown> = {}): void {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('title', 'Delete Record');
    fixture.componentRef.setInput('message', 'Are you sure?');
    fixture.componentRef.setInput('confirmLabel', 'Delete Now');
    fixture.componentRef.setInput('cancelLabel', 'Go Back');
    for (const [key, value] of Object.entries(overrides)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
  }

  function buttonByText(text: string): HTMLButtonElement | undefined {
    return Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find((button) =>
      button.textContent?.includes(text)
    );
  }

  it('should create the dialog', () => {
    expect(component).toBeTruthy();
  });

  it('should not render anything when isOpen is false', () => {
    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders title and message when isOpen is true', () => {
    openDialog();

    expect(fixture.nativeElement.querySelector('h2')?.textContent).toContain('Delete Record');
    expect(fixture.nativeElement.querySelector('.dialog-body p')?.textContent).toContain('Are you sure?');
    expect(buttonByText('Delete Now')).toBeTruthy();
    expect(buttonByText('Go Back')).toBeTruthy();
  });

  it('uses destructive confirm styling when variant is destructive', () => {
    openDialog({ variant: 'destructive' });

    const confirmBtn = buttonByText('Delete Now');
    expect(confirmBtn?.className).toContain('destructive');
  });

  it('emits confirm output when confirm button is clicked', () => {
    openDialog();

    let emitted = false;
    component.confirm.subscribe(() => {
      emitted = true;
    });

    buttonByText('Delete Now')?.click();
    expect(emitted).toBe(true);
  });

  it('emits cancel output when cancel button is clicked', () => {
    openDialog();

    let emitted = false;
    component.cancel.subscribe(() => {
      emitted = true;
    });

    buttonByText('Go Back')?.click();
    expect(emitted).toBe(true);
  });

  it('disables actions and shows loading label while loading', () => {
    openDialog({ isLoading: true, loadingLabel: 'Working...' });

    const confirmBtn = buttonByText('Working...');
    const cancelBtn = buttonByText('Go Back');
    expect(confirmBtn?.disabled).toBe(true);
    expect(cancelBtn?.disabled).toBe(true);
  });

  it('exposes dialog accessibility semantics', () => {
    openDialog();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
    expect(dialog.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('emits cancel when Escape is pressed', () => {
    openDialog();

    let emitted = false;
    component.cancel.subscribe(() => {
      emitted = true;
    });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(emitted).toBe(true);
  });
});
