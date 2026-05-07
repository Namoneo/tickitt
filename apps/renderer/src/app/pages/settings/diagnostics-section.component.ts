import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { AppInfo, KeychainProbeResult } from '@tickitt/shared-types';
import { TRPC } from '../../core/ipc/trpc.token';

@Component({
  selector: 'tk-diagnostics-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h3>Diagnostics</h3>
      <button (click)="loadInfo()">Load app info</button>
      <button (click)="probeKeychain()">Probe keychain</button>
      @if (info(); as i) {
        <pre>{{ formatted() }}</pre>
      }
      @if (keychain(); as k) {
        <p>Keychain: {{ k.ok ? 'OK' : 'FAIL — ' + (k.error ?? '') }}</p>
      }
    </section>
  `,
  styles: [`
    section { margin: 16px 0 32px; padding: 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-elev); }
    h3 { margin-top: 0; }
    button { margin-right: 8px; }
    pre { font-size: 12px; color: var(--fg-dim); white-space: pre-wrap; word-break: break-all; }
  `],
})
export class DiagnosticsSectionComponent {
  private readonly trpc = inject(TRPC);
  protected readonly info = signal<AppInfo | null>(null);
  protected readonly keychain = signal<KeychainProbeResult | null>(null);
  protected readonly formatted = computed(() => JSON.stringify(this.info(), null, 2));

  protected async loadInfo(): Promise<void> {
    this.info.set(await this.trpc.system.appInfo.query());
  }

  protected async probeKeychain(): Promise<void> {
    this.keychain.set(await this.trpc.system.keychainProbe.mutate());
  }
}