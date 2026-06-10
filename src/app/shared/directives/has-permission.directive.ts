import { Directive, TemplateRef, ViewContainerRef, effect, input } from '@angular/core';

import { AccessControlService } from '../../core/services/access-control.service';

@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective {
  readonly appHasPermission = input<string | undefined>();

  constructor(
    private readonly accessControl: AccessControlService,
    private readonly templateRef: TemplateRef<unknown>,
    private readonly viewContainerRef: ViewContainerRef
  ) {
    effect(() => {
      this.viewContainerRef.clear();

      if (this.accessControl.hasPermission(this.appHasPermission())) {
        this.viewContainerRef.createEmbeddedView(this.templateRef);
      }
    });
  }
}
