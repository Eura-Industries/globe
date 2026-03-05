import { Component, inject, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasService } from '../canvas/canvas.service';
import { CursorPresence } from '../../../core/services/presence.service';

@Component({
  selector: 'app-cursor-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg class="cursor-svg" aria-hidden="true">
      @for (cursor of cursors; track cursor.uid) {
        @if (screenPos(cursor); as pos) {
          <g [attr.transform]="'translate(' + pos.x + ',' + pos.y + ')'">
            <!-- Cursor arrow -->
            <path d="M 0 0 L 0 14 L 4 11 L 7 17 L 9 16 L 6 10 L 11 10 Z"
                  [attr.fill]="cursor.color" stroke="white" stroke-width="1" />
            <!-- Name label -->
            <rect x="12" y="2" [attr.width]="cursor.displayName.length * 7 + 12" height="20"
                  [attr.fill]="cursor.color" rx="4" />
            <text x="18" y="15" fill="white" font-size="11" font-family="Roboto, sans-serif">
              {{ cursor.displayName }}
            </text>
          </g>
        }
      }
    </svg>
  `,
  styles: [`
    .cursor-svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
    }
  `],
})
export class CursorOverlayComponent {
  @Input() cursors: CursorPresence[] = [];

  private canvasService = inject(CanvasService);

  screenPos(cursor: CursorPresence): { x: number; y: number } {
    return this.canvasService.canvasToScreen(cursor.x, cursor.y);
  }
}
