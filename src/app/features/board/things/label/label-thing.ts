import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { LabelThing, LabelData, LabelStyle } from '../../../../core/models/thing.model';

const STYLE_COLORS: Record<LabelStyle, { bg: string; text: string }> = {
  default: { bg: '#E3F2FD', text: '#1565C0' },
  success: { bg: '#E8F5E9', text: '#2E7D32' },
  warning: { bg: '#FFF8E1', text: '#F57F17' },
  danger:  { bg: '#FFEBEE', text: '#C62828' },
  info:    { bg: '#E8EAF6', text: '#283593' },
  custom:  { bg: '#F5F5F5', text: '#333' },
};

@Component({
  selector: 'app-label-thing',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="label-thing" [style.background]="bgColor" [style.color]="textColor">
      @if (thing.data.icon) {
        <mat-icon class="label-icon" [style.color]="textColor">{{ thing.data.icon }}</mat-icon>
      }
      <span class="label-text">{{ thing.data.text }}</span>
    </div>
  `,
  styles: [`
    .label-thing {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 100px;
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 2px 6px rgba(0,0,0,.1);
      white-space: nowrap;
      height: 100%;
      width: 100%;
      justify-content: center;
    }
    .label-icon { font-size: 18px; width: 18px; height: 18px; }
  `],
})
export class LabelThingComponent {
  @Input({ required: true }) thing!: LabelThing;

  get bgColor(): string {
    if (this.thing.data.style === 'custom') return this.thing.data.bgColor ?? '#F5F5F5';
    return STYLE_COLORS[this.thing.data.style].bg;
  }

  get textColor(): string {
    if (this.thing.data.style === 'custom') return this.thing.data.textColor ?? '#333';
    return STYLE_COLORS[this.thing.data.style].text;
  }
}
