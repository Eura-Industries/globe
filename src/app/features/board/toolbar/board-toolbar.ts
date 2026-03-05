import { Component, Input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { ThingType } from '../../../core/models/thing.model';

export interface AddThingEvent {
  type: ThingType;
}

interface ThingOption {
  type: ThingType;
  label: string;
  icon: string;
  emoji?: string;
}

@Component({
  selector: 'app-board-toolbar',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, MatMenuModule],
  template: `
    <div class="toolbar">
      <!-- Add thing button group -->
      @for (opt of thingOptions; track opt.type) {
        <button
          mat-icon-button
          class="toolbar-btn"
          [matTooltip]="opt.label"
          matTooltipPosition="right"
          (click)="add.emit({ type: opt.type })"
        >
          @if (opt.emoji) {
            <span class="tb-emoji">{{ opt.emoji }}</span>
          } @else {
            <mat-icon>{{ opt.icon }}</mat-icon>
          }
        </button>
      }

      <div class="toolbar-divider"></div>

      <!-- Undo/Redo -->
      <button mat-icon-button class="toolbar-btn" matTooltip="Undo (Ctrl+Z)" matTooltipPosition="right"
        [disabled]="!canUndo" (click)="undo.emit()">
        <mat-icon>undo</mat-icon>
      </button>
      <button mat-icon-button class="toolbar-btn" matTooltip="Redo (Ctrl+Y)" matTooltipPosition="right"
        [disabled]="!canRedo" (click)="redo.emit()">
        <mat-icon>redo</mat-icon>
      </button>

      <div class="toolbar-divider"></div>

      <!-- Background picker -->
      <button mat-icon-button class="toolbar-btn" matTooltip="Background" matTooltipPosition="right"
        [matMenuTriggerFor]="bgMenu">
        <mat-icon>grid_4x4</mat-icon>
      </button>
      <mat-menu #bgMenu="matMenu" xPosition="after">
        <button mat-menu-item (click)="background.emit('dots')">· Dots</button>
        <button mat-menu-item (click)="background.emit('grid')">⊞ Grid</button>
        <button mat-menu-item (click)="background.emit('lines')">≡ Lines</button>
        <button mat-menu-item (click)="background.emit('blank')">□ Blank</button>
      </mat-menu>
    </div>
  `,
  styleUrl: './board-toolbar.scss',
})
export class BoardToolbarComponent {
  @Input() canUndo = false;
  @Input() canRedo = false;

  readonly add = output<AddThingEvent>();
  readonly undo = output<void>();
  readonly redo = output<void>();
  readonly background = output<'dots' | 'grid' | 'lines' | 'blank'>();

  thingOptions: ThingOption[] = [
    { type: 'text',   label: 'Text',    icon: 'text_fields' },
    { type: 'label',  label: 'Label',   icon: 'label' },
    { type: 'shape',  label: 'Shape',   icon: 'category' },
    { type: 'file',   label: 'File',    icon: 'attach_file' },
    { type: 'flight', label: 'Flight',  emoji: '✈️', icon: 'flight' },
    { type: 'place',  label: 'Place',   emoji: '📍', icon: 'place' },
    { type: 'routes', label: 'Routes',  emoji: '🗺️', icon: 'map' },
    { type: 'money',  label: 'Money',   emoji: '💰', icon: 'payments' },
  ];
}
