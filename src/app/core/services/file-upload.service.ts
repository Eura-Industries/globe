import { Injectable, inject } from '@angular/core';
import {
  Storage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from '@angular/fire/storage';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export interface UploadProgress {
  progress: number; // 0–100
  downloadUrl?: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class FileUploadService {
  private storage = inject(Storage);
  private auth = inject(AuthService);

  upload(boardId: string, file: File): Observable<UploadProgress> {
    return new Observable((obs) => {
      const uid = this.auth.getCurrentUid()!;
      const path = `boards/${boardId}/files/${uid}_${Date.now()}_${file.name}`;
      const storageRef = ref(this.storage, path);
      const task = uploadBytesResumable(storageRef, file);

      task.on(
        'state_changed',
        (snap) => {
          obs.next({
            progress: Math.round((snap.bytesTransferred / snap.totalBytes) * 100),
          });
        },
        (err) => obs.next({ progress: 0, error: err.message }),
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          obs.next({ progress: 100, downloadUrl: url });
          obs.complete();
        }
      );
    });
  }

  async deleteFile(storageUrl: string): Promise<void> {
    const storageRef = ref(this.storage, storageUrl);
    await deleteObject(storageRef).catch(() => {/* already deleted */});
  }
}
