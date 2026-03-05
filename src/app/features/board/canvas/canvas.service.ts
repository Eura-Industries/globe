import { Injectable, signal, computed } from '@angular/core';

export interface ViewportState {
  x: number;      // pan X (px)
  y: number;      // pan Y (px)
  scale: number;  // zoom level
}

@Injectable({ providedIn: 'root' })
export class CanvasService {
  private _state = signal<ViewportState>({ x: 0, y: 0, scale: 1 });

  readonly state = this._state.asReadonly();
  readonly scale = computed(() => this._state().scale);
  readonly x = computed(() => this._state().x);
  readonly y = computed(() => this._state().y);

  setState(state: ViewportState): void {
    this._state.set(state);
  }

  updateFromPanzoom(x: number, y: number, scale: number): void {
    this._state.set({ x, y, scale });
  }

  /** Convert a screen-space position to canvas coordinates */
  screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
    const { x, y, scale } = this._state();
    return {
      x: (screenX - x) / scale,
      y: (screenY - y) / scale,
    };
  }

  /** Convert canvas coordinates to screen-space position */
  canvasToScreen(canvasX: number, canvasY: number): { x: number; y: number } {
    const { x, y, scale } = this._state();
    return {
      x: canvasX * scale + x,
      y: canvasY * scale + y,
    };
  }

  /** Get center of the visible viewport in canvas coords */
  getViewportCenter(viewportWidth: number, viewportHeight: number): { x: number; y: number } {
    return this.screenToCanvas(viewportWidth / 2, viewportHeight / 2);
  }

  reset(): void {
    this._state.set({ x: 0, y: 0, scale: 1 });
  }
}
