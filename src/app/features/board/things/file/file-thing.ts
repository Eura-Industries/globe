import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FileThing, FileData } from '../../../../core/models/thing.model';
import { FileUploadService } from '../../../../core/services/file-upload.service';

@Component({
  selector: 'app-file-thing',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatProgressBarModule],
  template: `
    <div
      class="file-thing"
      [class.drag-over]="dragOver"
      (dragover)="onDragOver($event)"
      (dragleave)="dragOver = false"
      (drop)="onDrop($event)"
    >
      @if (!thing.data.storageUrl) {
        <!-- Upload zone -->
        <div class="upload-zone">
          <mat-icon class="upload-icon">cloud_upload</mat-icon>
          <p>Drag & drop a file here</p>
          <label class="upload-label">
            <input type="file" class="file-input" (change)="onFileSelected($event)" />
            Browse
          </label>
          @if (uploadProgress > 0 && uploadProgress < 100) {
            <mat-progress-bar mode="determinate" [value]="uploadProgress" />
          }
        </div>
      } @else {
        <!-- File preview -->
        <div class="file-preview">
          @if (isImage) {
            <img [src]="thing.data.storageUrl" [alt]="thing.data.fileName" class="file-img" />
          } @else {
            <div class="file-icon-wrapper">
              <mat-icon class="file-icon">{{ fileIcon }}</mat-icon>
            </div>
          }
          <div class="file-meta">
            <span class="file-name" [title]="thing.data.fileName">{{ thing.data.fileName }}</span>
            <small class="file-size">{{ formatSize(thing.data.fileSize) }}</small>
          </div>
          <a [href]="thing.data.storageUrl" target="_blank" mat-icon-button download>
            <mat-icon>download</mat-icon>
          </a>
        </div>
      }
    </div>
  `,
  styleUrl: './file-thing.scss',
})
export class FileThingComponent {
  @Input({ required: true }) thing!: FileThing;
  @Output() dataChanged = new EventEmitter<Partial<FileData>>();

  private fileUploadService = inject(FileUploadService);

  dragOver = false;
  uploadProgress = 0;

  get isImage(): boolean {
    return this.thing.data.fileType?.startsWith('image/') ?? false;
  }

  get fileIcon(): string {
    const t = this.thing.data.fileType ?? '';
    if (t.includes('pdf')) return 'picture_as_pdf';
    if (t.includes('video')) return 'videocam';
    if (t.includes('audio')) return 'audio_file';
    if (t.includes('zip') || t.includes('archive')) return 'folder_zip';
    return 'insert_drive_file';
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragOver = true;
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver = false;
    const file = e.dataTransfer?.files[0];
    if (file) this._upload(file);
  }

  onFileSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this._upload(file);
  }

  private _upload(file: File): void {
    this.fileUploadService.upload(this.thing.boardId, file).subscribe((progress) => {
      this.uploadProgress = progress.progress;
      if (progress.downloadUrl) {
        this.dataChanged.emit({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          storageUrl: progress.downloadUrl,
        });
      }
    });
  }

  formatSize(bytes: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
