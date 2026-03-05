import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  AfterViewInit,
  OnDestroy,
  Input,
  signal,
  HostListener,
  NgZone,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import Panzoom, { PanzoomObject } from '@panzoom/panzoom';
import { CanvasService } from './canvas.service';
import { Board } from '../../../core/models/board.model';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="canvas-viewport"
      #viewport
      (mousemove)="onMouseMove($event)"
      (click)="canvasClick.emit($event)"
    >
      <!-- Background pattern -->
      <svg class="canvas-bg" aria-hidden="true">
        <defs>
          @if (board?.background === 'dots') {
            <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1.2" fill="rgba(0,0,0,.15)" />
            </pattern>
          }
          @if (board?.background === 'grid') {
            <pattern id="small-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(0,0,0,.1)" stroke-width="0.5"/>
            </pattern>
          }
          @if (board?.background === 'lines') {
            <pattern id="lines" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <line x1="0" y1="24" x2="24" y2="24" stroke="rgba(0,0,0,.1)" stroke-width="0.5" />
            </pattern>
          }
        </defs>
        @if (board?.background === 'dots') {
          <rect width="100%" height="100%" fill="url(#dots)" />
        }
        @if (board?.background === 'grid') {
          <rect width="100%" height="100%" fill="url(#small-grid)" />
        }
        @if (board?.background === 'lines') {
          <rect width="100%" height="100%" fill="url(#lines)" />
        }
      </svg>

      <!-- Panzoom layer — all Things go inside here -->
      <div #panzoom class="panzoom-layer" (pointerdown)="onPanStart()">
        <ng-content />
      </div>
    </div>
  `,
  styleUrl: './canvas.scss',
})
export class CanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('viewport') viewportRef!: ElementRef<HTMLDivElement>;
  @ViewChild('panzoom') panzoomRef!: ElementRef<HTMLDivElement>;

  @Input() board: Board | undefined | null;

  readonly canvasClick = output<MouseEvent>();
  readonly cursorMove = output<{ canvasX: number; canvasY: number }>();

  private canvasService = inject(CanvasService);
  private zone = inject(NgZone);
  private _pz!: PanzoomObject;

  ngAfterViewInit(): void {
    // Init panzoom outside Angular zone for perf
    this.zone.runOutsideAngular(() => {
      this._pz = Panzoom(this.panzoomRef.nativeElement, {
        maxScale: 4,
        minScale: 0.2,
        canvas: true,
        pinchAndPan: true,
        touchAction: 'none',
        excludeClass: 'no-panzoom',
        cursor: 'default',
        animate: false,
      });

      // Wheel zoom
      this.viewportRef.nativeElement.addEventListener(
        'wheel',
        this._pz.zoomWithWheel,
        { passive: false }
      );

      // Sync viewport state into CanvasService
      this.panzoomRef.nativeElement.addEventListener('panzoomchange', (e: any) => {
        const { x, y, scale } = e.detail;
        this.zone.run(() => this.canvasService.updateFromPanzoom(x, y, scale));
      });
    });
  }

  onMouseMove(event: MouseEvent): void {
    const vp = this.viewportRef.nativeElement.getBoundingClientRect();
    const screenX = event.clientX - vp.left;
    const screenY = event.clientY - vp.top;
    const canvas = this.canvasService.screenToCanvas(screenX, screenY);
    this.cursorMove.emit({ canvasX: canvas.x, canvasY: canvas.y });
  }

  onPanStart(): void {
    // called when touch starts on the layer — panzoom handles from here
  }

  getPanzoom(): PanzoomObject {
    return this._pz;
  }

  ngOnDestroy(): void {
    if (this._pz) this._pz.destroy();
  }
}
