import { Injectable, signal, computed } from '@angular/core';
import { Thing } from '../core/models/thing.model';

@Injectable({ providedIn: 'root' })
export class SelectionService {
  private _selected = signal<Set<string>>(new Set());

  readonly selectedIds = this._selected.asReadonly();
  readonly hasSelection = computed(() => this._selected().size > 0);
  readonly count = computed(() => this._selected().size);

  select(id: string, additive = false): void {
    if (additive) {
      const next = new Set(this._selected());
      next.add(id);
      this._selected.set(next);
    } else {
      this._selected.set(new Set([id]));
    }
  }

  deselect(id: string): void {
    const next = new Set(this._selected());
    next.delete(id);
    this._selected.set(next);
  }

  selectAll(ids: string[]): void {
    this._selected.set(new Set(ids));
  }

  clearSelection(): void {
    this._selected.set(new Set());
  }

  isSelected(id: string): boolean {
    return this._selected().has(id);
  }

  getSelectedIds(): string[] {
    return Array.from(this._selected());
  }
}
