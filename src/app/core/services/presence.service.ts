import { Injectable, inject } from '@angular/core';
import { Database, ref, set, onValue, remove, onDisconnect, serverTimestamp } from '@angular/fire/database';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export interface CursorPresence {
  uid: string;
  displayName: string;
  photoURL: string | null;
  color: string;
  x: number; // canvas coords
  y: number;
  selectedThingId?: string;
  lastSeen: number;
}

// Palette of distinct cursor colors
const CURSOR_COLORS = [
  '#E53935', '#8E24AA', '#1E88E5', '#00897B',
  '#F4511E', '#6D4C41', '#039BE5', '#43A047',
];

@Injectable({ providedIn: 'root' })
export class PresenceService {
  private db = inject(Database);
  private auth = inject(AuthService);

  private _boardId: string | null = null;
  private _cursorRef: ReturnType<typeof ref> | null = null;
  private _throttleTimer: ReturnType<typeof setTimeout> | null = null;
  private _color: string = CURSOR_COLORS[0];

  join(boardId: string): void {
    const user = this.auth.getCurrentUser();
    if (!user) return;

    this._boardId = boardId;
    this._color = this._pickColor(user.uid);
    this._cursorRef = ref(
      this.db,
      `presence/${boardId}/${user.uid}`
    );

    const initialData: CursorPresence = {
      uid: user.uid,
      displayName: user.displayName ?? 'Traveller',
      photoURL: user.photoURL ?? null,
      color: this._color,
      x: 0,
      y: 0,
      lastSeen: Date.now(),
    };

    set(this._cursorRef, initialData);
    // Auto-remove on disconnect
    onDisconnect(this._cursorRef).remove();
  }

  updateCursor(canvasX: number, canvasY: number, selectedThingId?: string): void {
    if (!this._cursorRef) return;
    // Throttle to 50ms
    if (this._throttleTimer) return;
    this._throttleTimer = setTimeout(() => {
      this._throttleTimer = null;
      set(this._cursorRef!, {
        uid: this.auth.getCurrentUid()!,
        displayName: this.auth.getCurrentUser()?.displayName ?? 'Traveller',
        photoURL: this.auth.getCurrentUser()?.photoURL ?? null,
        color: this._color,
        x: canvasX,
        y: canvasY,
        selectedThingId,
        lastSeen: Date.now(),
      } satisfies CursorPresence);
    }, 50);
  }

  watchPresence(boardId: string): Observable<Record<string, CursorPresence>> {
    return new Observable((obs) => {
      const presenceRef = ref(this.db, `presence/${boardId}`);
      const unsub = onValue(presenceRef, (snap) => {
        obs.next((snap.val() as Record<string, CursorPresence>) ?? {});
      });
      return () => unsub();
    });
  }

  leave(): void {
    if (this._cursorRef) {
      remove(this._cursorRef);
      this._cursorRef = null;
    }
  }

  getMyColor(): string { return this._color; }

  private _pickColor(uid: string): string {
    let hash = 0;
    for (let i = 0; i < uid.length; i++) hash = uid.charCodeAt(i) + ((hash << 5) - hash);
    return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
  }
}
