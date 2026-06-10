import { Directive, TemplateRef, ViewContainerRef, effect, input } from '@angular/core';

import { AccessControlService } from '../../core/services/access-control.service';

@Directive({
  selector: '[appHasFeature]',
  standalone: true
})
export class HasFeatureDirective {
  readonly appHasFeature = input<string | undefined>();

  constructor(
    private readonly accessControl: AccessControlService,
    private readonly templateRef: TemplateRef<unknown>,
    private readonly viewContainerRef: ViewContainerRef
  ) {
    effect(() => {
      this.viewContainerRef.clear();

      if (this.accessControl.hasFeature(this.appHasFeature())) {
        this.viewContainerRef.createEmbeddedView(this.templateRef);
      }
    });
  }
}
