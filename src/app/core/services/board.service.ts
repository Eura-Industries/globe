import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  collectionData,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { Board, Collaborator } from '../models/board.model';

@Injectable({ providedIn: 'root' })
export class BoardService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  /** Watch all boards the current user owns or is a collaborator on. */
  watchMyBoards(): Observable<Board[]> {
    const uid = this.auth.getCurrentUid();
    if (!uid) return of([]);

    const boardsRef = collection(this.firestore, 'boards');

    const owned$ = collectionData(
      query(boardsRef, where('ownerId', '==', uid), orderBy('updatedAt', 'desc')),
      { idField: 'id' }
    ) as Observable<Board[]>;

    const collab$ = collectionData(
      query(
        boardsRef,
        where('collaborators', 'array-contains', uid),
        orderBy('updatedAt', 'desc')
      ),
      { idField: 'id' }
    ) as Observable<Board[]>;

    return combineLatest([owned$, collab$]).pipe(
      map(([owned, collab]) => {
        const seen = new Set<string>();
        return [...owned, ...collab].filter((b) => {
          if (seen.has(b.id)) return false;
          seen.add(b.id);
          return true;
        });
      })
    );
  }

  /** Watch a single board in real-time. */
  watchBoard(boardId: string): Observable<Board | undefined> {
    const ref = doc(this.firestore, `boards/${boardId}`);
    return docData(ref, { idField: 'id' }) as Observable<Board | undefined>;
  }

  async createBoard(name: string, emoji = '🌍'): Promise<string> {
    const uid = this.auth.getCurrentUid()!;
    const user = this.auth.getCurrentUser()!;
    const boardsRef = collection(this.firestore, 'boards');
    const now = Date.now();
    const docRef = await addDoc(boardsRef, {
      name,
      emoji,
      ownerId: uid,
      collaborators: [] as Collaborator[],
      pendingInvites: [] as string[],
      background: 'dots',
      createdAt: now,
      updatedAt: now,
    } satisfies Omit<Board, 'id'>);
    return docRef.id;
  }

  async renameBoard(boardId: string, name: string): Promise<void> {
    await updateDoc(doc(this.firestore, `boards/${boardId}`), {
      name,
      updatedAt: Date.now(),
    });
  }

  async deleteBoard(boardId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `boards/${boardId}`));
  }

  async inviteByEmail(boardId: string, email: string): Promise<void> {
    const boardRef = doc(this.firestore, `boards/${boardId}`);
    const snap = await import('@angular/fire/firestore').then(({ getDoc }) =>
      getDoc(boardRef)
    );
    const data = snap.data() as Board;
    const pending: string[] = data.pendingInvites ?? [];
    if (pending.includes(email)) return;
    await updateDoc(boardRef, {
      pendingInvites: [...pending, email],
      updatedAt: Date.now(),
    });
  }

  async removeCollaborator(boardId: string, uid: string): Promise<void> {
    const boardRef = doc(this.firestore, `boards/${boardId}`);
    const snap = await import('@angular/fire/firestore').then(({ getDoc }) =>
      getDoc(boardRef)
    );
    const data = snap.data() as Board;
    const collabs = (data.collaborators ?? []).filter((c) => c.uid !== uid);
    await updateDoc(boardRef, { collaborators: collabs, updatedAt: Date.now() });
  }

  async updateBackground(
    boardId: string,
    background: Board['background']
  ): Promise<void> {
    await updateDoc(doc(this.firestore, `boards/${boardId}`), {
      background,
      updatedAt: Date.now(),
    });
  }
}
