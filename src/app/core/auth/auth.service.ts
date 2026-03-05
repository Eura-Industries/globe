import { Injectable, inject, signal, computed } from '@angular/core';
import {
  Auth,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  user,
  User,
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, switchMap, of } from 'rxjs';
import { GlobeUser } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  // Reactive user stream from Firebase Auth
  private firebaseUser$ = user(this.auth);
  firebaseUser = toSignal(this.firebaseUser$, { initialValue: null });

  isLoggedIn = computed(() => !!this.firebaseUser());

  // ─── Sign-in methods ──────────────────────────────────────────────────────

  async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(this.auth, provider);
    await this._upsertUserDoc(cred.user);
    await this._acceptPendingInvites(cred.user);
    await this.router.navigate(['/dashboard']);
  }

  async signInWithGithub(): Promise<void> {
    const provider = new GithubAuthProvider();
    const cred = await signInWithPopup(this.auth, provider);
    await this._upsertUserDoc(cred.user);
    await this._acceptPendingInvites(cred.user);
    await this.router.navigate(['/dashboard']);
  }

  async signInWithEmail(email: string, password: string): Promise<void> {
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    await this._upsertUserDoc(cred.user);
    await this._acceptPendingInvites(cred.user);
    await this.router.navigate(['/dashboard']);
  }

  async registerWithEmail(
    email: string,
    password: string,
    displayName: string
  ): Promise<void> {
    const cred = await createUserWithEmailAndPassword(
      this.auth,
      email,
      password
    );
    await updateProfile(cred.user, { displayName });
    await this._upsertUserDoc(cred.user);
    await this.router.navigate(['/dashboard']);
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
    await this.router.navigate(['/login']);
  }

  getCurrentUid(): string | null {
    return this.auth.currentUser?.uid ?? null;
  }

  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  // ─── Internal helpers ─────────────────────────────────────────────────────

  private async _upsertUserDoc(firebaseUser: User): Promise<void> {
    const ref = doc(this.firestore, `users/${firebaseUser.uid}`);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName ?? 'Traveller',
        email: firebaseUser.email ?? '',
        photoURL: firebaseUser.photoURL ?? null,
        createdAt: Date.now(),
      } satisfies GlobeUser);
    } else {
      // Keep displayName/photo in sync
      await updateDoc(ref, {
        displayName: firebaseUser.displayName ?? snap.data()['displayName'],
        photoURL: firebaseUser.photoURL ?? snap.data()['photoURL'],
      });
    }
  }

  /** Auto-accept pending board invites for the signed-in user's email. */
  private async _acceptPendingInvites(firebaseUser: User): Promise<void> {
    if (!firebaseUser.email) return;
    const boardsRef = collection(this.firestore, 'boards');
    const q = query(
      boardsRef,
      where('pendingInvites', 'array-contains', firebaseUser.email)
    );
    const snap = await getDocs(q);
    const updates = snap.docs.map((d) =>
      updateDoc(d.ref, {
        pendingInvites: (d.data()['pendingInvites'] as string[]).filter(
          (e) => e !== firebaseUser.email
        ),
        collaborators: [
          ...(d.data()['collaborators'] ?? []),
          {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName ?? 'Traveller',
            photoURL: firebaseUser.photoURL ?? null,
            role: 'editor',
          },
        ],
      })
    );
    await Promise.all(updates);
  }
}
