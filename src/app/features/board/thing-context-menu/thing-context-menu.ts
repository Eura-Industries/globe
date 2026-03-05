import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { Thing } from '../../../core/models/thing.model';

export type ContextAction =
  | 'delete'
  | 'duplicate'
  | 'lock'
  | 'unlock'
  | 'bringToFront'
  | 'sendToBack'
  | 'edit';

@Component({
  selector: 'app-thing-context-menu',
  standalone: true,
  imports: [CommonModule, MatMenuModule, MatIconModule, MatDividerModule, MatButtonModule],
  template: `
    <!-- Hidden trigger div for programmatic open -->
    <div
      #menuTrigger="matMenuTrigger"
      [matMenuTriggerFor]="ctxMenu"
      [style.position]="'fixed'"
      [style.left.px]="x"
      [style.top.px]="y"
    ></div>

    <mat-menu #ctxMenu="matMenu">
      <button mat-menu-item (click)="action.emit('edit')">
        <mat-icon>edit</mat-icon> Edit
      </button>
      <button mat-menu-item (click)="action.emit('duplicate')">
        <mat-icon>content_copy</mat-icon> Duplicate
      </button>
      <mat-divider />
      <button mat-menu-item (click)="action.emit('bringToFront')">
        <mat-icon>flip_to_front</mat-icon> Bring to Front
      </button>
      <button mat-menu-item (click)="action.emit('sendToBack')">
        <mat-icon>flip_to_back</mat-icon> Send to Back
      </button>
      <mat-divider />
      @if (thing?.locked) {
        <button mat-menu-item (click)="action.emit('unlock')">
          <mat-icon>lock_open</mat-icon> Unlock
        </button>
      } @else {
        <button mat-menu-item (click)="action.emit('lock')">
          <mat-icon>lock</mat-icon> Lock
        </button>
      }
      <mat-divider />
      <button mat-menu-item class="danger-item" (click)="action.emit('delete')">
        <mat-icon color="warn">delete</mat-icon> Delete
      </button>
    </mat-menu>
  `,
  styles: [`.danger-item { color: #d32f2f; }`],
})
export class ThingContextMenuComponent {
  @Input() thing: Thing | null = null;
  @Input() x = 0;
  @Input() y = 0;
  @Output() action = new EventEmitter<ContextAction>();
}
