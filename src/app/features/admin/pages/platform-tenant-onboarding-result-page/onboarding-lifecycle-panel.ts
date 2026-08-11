import { Component, input } from '@angular/core';

import { LifecycleNodeView } from './onboarding-operation-lifecycle';

@Component({
  selector: 'app-onboarding-lifecycle-panel',
  standalone: true,
  template: `
    <section class="timeline-panel" aria-labelledby="lifecycle-heading">
      <h3 id="lifecycle-heading">Post-submit lifecycle</h3>
      <ol class="lifecycle" aria-label="Post-submit lifecycle status">
        @for (node of nodes(); track node.key) {
          <li
            class="lifecycle-item"
            [class.completed]="node.visual === 'completed'"
            [class.active]="node.visual === 'active'"
            [class.waiting]="node.visual === 'waiting'"
            [class.failed]="node.visual === 'failed'"
          >
            <div class="node-marker" [class.pulse]="node.pulse" aria-hidden="true">
              @if (node.visual === 'completed') { ✓ }
              @else if (node.visual === 'failed') { ! }
              @else if (node.visual === 'active') { ● }
              @else { ○ }
            </div>
            <div class="node-copy">
              <span class="node-label">{{ node.label }}</span>
              <span class="node-state">{{ node.label }} — {{ node.stateText }}</span>
            </div>
          </li>
        }
      </ol>
    </section>
  `,
  styles: `
    .timeline-panel{background:#fff;border:1px solid var(--border-default,#e2e8f0);border-radius:12px;box-shadow:var(--shadow-sm,0 1px 2px rgba(15,23,42,.06));padding:1.1rem 1.25rem}
    h3{margin:0 0 1rem;font-size:.8125rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted,#64748b)}
    .lifecycle{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;list-style:none;margin:0;padding:0}
    .lifecycle-item{position:relative;min-width:0;padding-right:.75rem}
    .lifecycle-item:not(:last-child)::after{content:'';position:absolute;top:1.1rem;left:calc(1.1rem + .5rem);right:0;height:3px;background:var(--border-default,#e2e8f0);z-index:0}
    .lifecycle-item.completed:not(:last-child)::after{background:var(--status-success,#10b981)}
    .lifecycle-item.active:not(:last-child)::after{background:linear-gradient(90deg,var(--primary,#0b5cff) 50%,var(--border-default,#e2e8f0) 50%)}
    .lifecycle-item.failed:not(:last-child)::after{background:#fecaca}
    .node-marker{position:relative;z-index:1;width:2.2rem;height:2.2rem;border-radius:50%;display:grid;place-items:center;border:2px solid var(--border-default,#e2e8f0);background:var(--bg-surface-secondary,#f1f5f9);color:var(--text-muted,#64748b);font-size:.75rem;font-weight:800}
    .lifecycle-item.completed .node-marker{background:var(--status-success-bg,#ecfdf5);border-color:var(--status-success-text,#047857);color:var(--status-success-text,#047857)}
    .lifecycle-item.active .node-marker{background:var(--status-info-bg,#eff6ff);border-color:var(--primary,#0b5cff);color:var(--primary,#0b5cff);box-shadow:var(--shadow-focus,0 0 0 4px rgba(11,92,255,.15))}
    .lifecycle-item.failed .node-marker{background:var(--status-danger-bg,#fef2f2);border-color:var(--status-danger-text,#b91c1c);color:var(--status-danger-text,#b91c1c)}
    .node-marker.pulse{animation:pulse 1.8s ease-in-out infinite}
    .node-copy{display:grid;gap:.2rem;margin-top:.35rem}
    .node-label{font-size:.8125rem;font-weight:700;color:var(--text-primary,#0f172a)}
    .node-state{font-size:.75rem;color:var(--text-muted,#64748b)}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}
    @media(max-width:1024px){.lifecycle{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:1rem}.lifecycle-item:not(:last-child)::after{display:none}}
    @media(max-width:768px){.lifecycle{grid-template-columns:1fr}.lifecycle-item{display:grid;grid-template-columns:auto 1fr;gap:.75rem;padding-right:0}.lifecycle-item:not(:last-child)::after{display:block;top:2.4rem;left:1.05rem;width:3px;height:calc(100% - .5rem);right:auto}.node-copy{grid-column:2;margin-top:0}.node-marker{grid-row:1/span 2}}
    @media(prefers-reduced-motion:reduce){.node-marker.pulse{animation:none}}
  `
})
export class OnboardingLifecyclePanel {
  readonly nodes = input.required<LifecycleNodeView[]>();
}
