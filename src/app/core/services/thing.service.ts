import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  collectionData,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
} from '@angular/fire/firestore';
import { Observable, Subject } from 'rxjs';
import { debounceTime, bufferTime, filter } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { Thing, ThingType } from '../models/thing.model';

interface PendingWrite {
  id: string;
  boardId: string;
  partial: Partial<Thing>;
}

@Injectable({ providedIn: 'root' })
export class ThingService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  private writeQueue$ = new Subject<PendingWrite>();

  constructor() {
    // Debounced batch writer — prevents flooding Firestore during drag
    this.writeQueue$
      .pipe(
        bufferTime(300),
        filter((batch) => batch.length > 0)
      )
      .subscribe((batch) => this._flushWrites(batch));
  }

  watchThings(boardId: string): Observable<Thing[]> {
    const ref = collection(this.firestore, `boards/${boardId}/things`);
    return collectionData(
      query(ref, orderBy('zIndex', 'asc')),
      { idField: 'id' }
    ) as Observable<Thing[]>;
  }

  async addThing(boardId: string, partial: Omit<Thing, 'id' | 'boardId' | 'createdBy' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const uid = this.auth.getCurrentUid()!;
    const ref = collection(this.firestore, `boards/${boardId}/things`);
    const now = Date.now();
    const docRef = await addDoc(ref, {
      ...partial,
      boardId,
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  }

  /** Debounced — safe to call on every mousemove during drag */
  queueUpdate(boardId: string, id: string, partial: Partial<Thing>): void {
    this.writeQueue$.next({ id, boardId, partial });
  }

  /** Immediate update — use for non-drag changes (content edits, etc.) */
  async updateThing(boardId: string, id: string, partial: Partial<Thing>): Promise<void> {
    await updateDoc(
      doc(this.firestore, `boards/${boardId}/things/${id}`),
      { ...partial, updatedAt: Date.now() }
    );
  }

  async deleteThing(boardId: string, id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `boards/${boardId}/things/${id}`));
  }

  async deleteThings(boardId: string, ids: string[]): Promise<void> {
    const batch = writeBatch(this.firestore);
    ids.forEach((id) =>
      batch.delete(doc(this.firestore, `boards/${boardId}/things/${id}`))
    );
    await batch.commit();
  }

  async bringToFront(boardId: string, id: string, currentMax: number): Promise<void> {
    await this.updateThing(boardId, id, { zIndex: currentMax + 1 } as any);
  }

  async sendToBack(boardId: string, id: string): Promise<void> {
    await this.updateThing(boardId, id, { zIndex: 0 } as any);
  }

  private async _flushWrites(batch: PendingWrite[]): Promise<void> {
    // Deduplicate — keep last write per thing id
    const deduped = new Map<string, PendingWrite>();
    batch.forEach((w) => deduped.set(w.id, w));

    const fb = writeBatch(this.firestore);
    deduped.forEach(({ boardId, id, partial }) => {
      fb.update(doc(this.firestore, `boards/${boardId}/things/${id}`), {
        ...partial,
        updatedAt: Date.now(),
      });
    });
    await fb.commit().catch(console.error);
  }
}
