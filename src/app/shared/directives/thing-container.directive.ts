import {
  Directive,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  inject,
  OnInit,
  OnDestroy,
  signal,
  HostListener,
} from '@angular/core';
import interact from 'interactjs';
import { CanvasService } from '../../features/board/canvas/canvas.service';
import { Thing } from '../../core/models/thing.model';

export interface ThingMoveEvent {
  id: string;
  boardId: string;
  x: number;
  y: number;
}

export interface ThingResizeEvent {
  id: string;
  boardId: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

@Directive({
  selector: '[thingContainer]',
  standalone: true,
  host: {
    class: 'no-panzoom', // prevents panzoom from capturing these events
    '[class.thing-selected]': 'selected',
    '[style.position]': '"absolute"',
    '[style.left.px]': 'thing.x',
    '[style.top.px]': 'thing.y',
    '[style.width.px]': 'thing.width',
    '[style.height.px]': 'thing.height',
    '[style.z-index]': 'thing.zIndex',
    '[style.transform]': 'thing.rotation ? "rotate(" + thing.rotation + "deg)" : null',
    '[style.cursor]': 'thing.locked ? "default" : "move"',
  },
})
export class ThingContainerDirective implements OnInit, OnDestroy {
  @Input({ required: true }) thing!: Thing;
  @Input() selected = false;

  @Output() moved = new EventEmitter<ThingMoveEvent>();
  @Output() resized = new EventEmitter<ThingResizeEvent>();
  @Output() selected$ = new EventEmitter<Thing>();
  @Output() contextMenu$ = new EventEmitter<{ event: MouseEvent; thing: Thing }>();

  private el = inject(ElementRef<HTMLElement>);
  private canvasService = inject(CanvasService);
  private _interact: ReturnType<typeof interact> | null = null;

  ngOnInit(): void {
    if (this.thing.locked) return;

    this._interact = interact(this.el.nativeElement)
      .draggable({
        listeners: {
          move: (event: any) => {
            const scale = this.canvasService.scale();
            // Convert drag delta from screen px to canvas px
            const dx = event.dx / scale;
            const dy = event.dy / scale;
            const newX = this.thing.x + dx;
            const newY = this.thing.y + dy;

            // Visual update (immediate)
            this.el.nativeElement.style.left = `${newX}px`;
            this.el.nativeElement.style.top = `${newY}px`;

            this.moved.emit({
              id: this.thing.id,
              boardId: this.thing.boardId,
              x: newX,
              y: newY,
            });
          },
        },
        inertia: false,
        modifiers: [],
      })
      .resizable({
        edges: { right: true, bottom: true, left: true, top: false },
        listeners: {
          move: (event: any) => {
            const scale = this.canvasService.scale();
            const newWidth = event.rect.width / scale;
            const newHeight = event.rect.height / scale;
            const dx = event.deltaRect.left / scale;

            const newX = this.thing.x + dx;

            this.el.nativeElement.style.width = `${newWidth}px`;
            this.el.nativeElement.style.height = `${newHeight}px`;
            this.el.nativeElement.style.left = `${newX}px`;

            this.resized.emit({
              id: this.thing.id,
              boardId: this.thing.boardId,
              width: newWidth,
              height: newHeight,
              x: newX,
              y: this.thing.y,
            });
          },
        },
        modifiers: [
          interact.modifiers.restrictSize({ min: { width: 80, height: 40 } }),
        ],
      });
  }

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    event.stopPropagation(); // don't bubble to panzoom
    this.selected$.emit(this.thing);
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    this.contextMenu$.emit({ event, thing: this.thing });
  }

  ngOnDestroy(): void {
    this._interact?.unset();
  }
}
