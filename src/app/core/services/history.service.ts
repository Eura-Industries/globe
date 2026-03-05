import { Injectable, signal } from '@angular/core';
import { Thing } from '../models/thing.model';

export type HistoryAction =
  | { type: 'add'; thing: Thing }
  | { type: 'delete'; things: Thing[] }
  | { type: 'move'; id: string; boardId: string; from: { x: number; y: number }; to: { x: number; y: number } }
  | { type: 'resize'; id: string; boardId: string; from: { width: number; height: number }; to: { width: number; height: number } }
  | { type: 'update'; id: string; boardId: string; from: Partial<Thing>; to: Partial<Thing> };

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private undoStack: HistoryAction[] = [];
  private redoStack: HistoryAction[] = [];

  canUndo = signal(false);
  canRedo = signal(false);

  push(action: HistoryAction): void {
    this.undoStack.push(action);
    this.redoStack = [];
    this._updateSignals();
  }

  popUndo(): HistoryAction | undefined {
    const action = this.undoStack.pop();
    if (action) this.redoStack.push(action);
    this._updateSignals();
    return action;
  }

  popRedo(): HistoryAction | undefined {
    const action = this.redoStack.pop();
    if (action) this.undoStack.push(action);
    this._updateSignals();
    return action;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this._updateSignals();
  }

  private _updateSignals(): void {
    this.canUndo.set(this.undoStack.length > 0);
    this.canRedo.set(this.redoStack.length > 0);
  }
}
