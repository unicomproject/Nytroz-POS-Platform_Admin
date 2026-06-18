import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { PlatformSubscriptionPlanApiService } from '../../services/platform-subscription-plan-api.service';
import { PlatformCreateSubscriptionPlanPage } from './platform-create-subscription-plan-page';

describe('PlatformCreateSubscriptionPlanPage', () => {
  let api: {
    getModules: ReturnType<typeof vi.fn>;
    getFeatures: ReturnType<typeof vi.fn>;
    saveDraft: ReturnType<typeof vi.fn>;
    publish: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    api = {
      getModules: vi.fn().mockReturnValue(of([])),
      getFeatures: vi.fn().mockReturnValue(of([])),
      saveDraft: vi.fn().mockReturnValue(of({ id: 'draft-1' })),
      publish: vi.fn().mockReturnValue(of(undefined))
    };

    await TestBed.configureTestingModule({
      imports: [PlatformCreateSubscriptionPlanPage],
      providers: [
        provideRouter([]),
        { provide: PlatformSubscriptionPlanApiService, useValue: api }
      ]
    }).compileComponents();
  });

  it('renders wizard steps and Save Draft button', () => {
    const fixture = TestBed.createComponent(PlatformCreateSubscriptionPlanPage);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Create Subscription Plan');
    expect(text).toContain('Basics');
    expect(text).toContain('Review & Publish');
    expect(text).toContain('Save Draft');
    expect(text).toContain('Draft Summary');
  });

  it('opens publish confirmation modal', () => {
    const fixture = TestBed.createComponent(PlatformCreateSubscriptionPlanPage);
    const component = fixture.componentInstance;
    component.currentStep.set('review');
    fixture.detectChanges();

    const publishButton = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Publish Plan'));

    publishButton?.click();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Publish subscription plan?');
  });
});
