import { Injectable, signal } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PlatformTenantSearchService {
  private readonly searchChanges = new Subject<string>();

  readonly searchTerm = signal('');

  readonly searchChanged$ = this.searchChanges.pipe(
    debounceTime(300),
    distinctUntilChanged()
  );

  setSearch(value: string): void {
    this.searchTerm.set(value);
    this.searchChanges.next(value);
  }

  clearSearch(): void {
    this.setSearch('');
  }
}
