import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Board, Collaborator } from '../../../core/models/board.model';

@Component({
  selector: 'app-collaborators-panel',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="panel">
      <div class="panel-header">
        <span>Collaborators ({{ board?.collaborators?.length ?? 0 + 1 }})</span>
        <button mat-icon-button (click)="invite.emit()">
          <mat-icon>person_add</mat-icon>
        </button>
      </div>

      <!-- Owner -->
      <div class="collab-row">
        <div class="collab-avatar" [style.background]="getColor(board?.ownerId ?? '')">
          {{ board?.ownerId?.slice(0,1)?.toUpperCase() }}
        </div>
        <div class="collab-info">
          <span class="collab-name">You (Owner)</span>
        </div>
        @if (onlineUids.has(board?.ownerId ?? '')) {
          <span class="online-dot"></span>
        }
      </div>

      @for (c of board?.collaborators ?? []; track c.uid) {
        <div class="collab-row">
          @if (c.photoURL) {
            <img class="collab-avatar-img" [src]="c.photoURL" [alt]="c.displayName" />
          } @else {
            <div class="collab-avatar" [style.background]="getColor(c.uid)">
              {{ c.displayName.charAt(0).toUpperCase() }}
            </div>
          }
          <div class="collab-info">
            <span class="collab-name">{{ c.displayName }}</span>
            <small class="collab-role">{{ c.role }}</small>
          </div>
          @if (onlineUids.has(c.uid)) {
            <span class="online-dot"></span>
          }
          @if (isOwner) {
            <button mat-icon-button color="warn" (click)="remove.emit(c.uid)" matTooltip="Remove">
              <mat-icon>close</mat-icon>
            </button>
          }
        </div>
      }

      @if ((board?.pendingInvites?.length ?? 0) > 0) {
        <div class="pending-section">
          <small>Pending invites</small>
          @for (email of board?.pendingInvites ?? []; track email) {
            <div class="pending-row">
              <mat-icon class="pending-icon">mail_outline</mat-icon>
              <span>{{ email }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './collaborators-panel.scss',
})
export class CollaboratorsPanelComponent {
  @Input() board: Board | null | undefined;
  @Input() isOwner = false;
  @Input() onlineUids = new Set<string>();

  @Output() invite = new EventEmitter<void>();
  @Output() remove = new EventEmitter<string>();

  getColor(uid: string): string {
    const colors = ['#E53935','#8E24AA','#1E88E5','#00897B','#F4511E','#6D4C41'];
    let h = 0;
    for (let i = 0; i < uid.length; i++) h = uid.charCodeAt(i) + ((h << 5) - h);
    return colors[Math.abs(h) % colors.length];
  }
}
