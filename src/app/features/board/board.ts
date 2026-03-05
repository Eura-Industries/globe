import {
  Component, OnInit, OnDestroy, inject, HostListener,
  signal, computed, ViewChild, ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

import { BoardService } from '../../core/services/board.service';
import { ThingService } from '../../core/services/thing.service';
import { PresenceService } from '../../core/services/presence.service';
import { HistoryService } from '../../core/services/history.service';
import { AuthService } from '../../core/auth/auth.service';
import { SelectionService } from '../../shared/selection.service';
import { CanvasService } from './canvas/canvas.service';

import { Board } from '../../core/models/board.model';
import {
  Thing, ThingType, ThingBase,
  TextThing, LabelThing, ShapeThing, FileThing,
  FlightThing, PlaceThing, RoutesThing, MoneyThing,
} from '../../core/models/thing.model';

import { CanvasComponent } from './canvas/canvas';
import { CursorOverlayComponent } from './cursor-overlay/cursor-overlay';
import { BoardToolbarComponent, AddThingEvent } from './toolbar/board-toolbar';
import { ThingContextMenuComponent, ContextAction } from './thing-context-menu/thing-context-menu';
import { InviteDialogComponent } from './invite-dialog/invite-dialog';
import { CollaboratorsPanelComponent } from './collaborators-panel/collaborators-panel';
import { ThingContainerDirective, ThingMoveEvent, ThingResizeEvent } from '../../shared/directives/thing-container.directive';

import { TextThingComponent } from './things/text/text-thing';
import { LabelThingComponent } from './things/label/label-thing';
import { ShapeThingComponent } from './things/shape/shape-thing';
import { FileThingComponent } from './things/file/file-thing';
import { FlightThingComponent } from './things/flight/flight-thing';
import { PlaceThingComponent } from './things/place/place-thing';
import { RoutesThingComponent } from './things/routes/routes-thing';
import { MoneyThingComponent } from './things/money/money-thing';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule, MatIconModule, MatTooltipModule, MatProgressSpinnerModule,
    CanvasComponent,
    CursorOverlayComponent,
    BoardToolbarComponent,
    ThingContextMenuComponent,
    CollaboratorsPanelComponent,
    ThingContainerDirective,
    TextThingComponent,
    LabelThingComponent,
    ShapeThingComponent,
    FileThingComponent,
    FlightThingComponent,
    PlaceThingComponent,
    RoutesThingComponent,
    MoneyThingComponent,
  ],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class BoardComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private boardService = inject(BoardService);
  private thingService = inject(ThingService);
  private presenceService = inject(PresenceService);
  private historyService = inject(HistoryService);
  protected auth = inject(AuthService);
  private selection = inject(SelectionService);
  private canvasService = inject(CanvasService);
  private snackbar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  board = signal<Board | null>(null);
  things = signal<Thing[]>([]);
  loading = signal(true);
  showCollaborators = signal(false);

  // Context menu state
  ctxMenuThing = signal<Thing | null>(null);
  ctxMenuX = signal(0);
  ctxMenuY = signal(0);

  // Presence — stored as array for cursor-overlay
  remoteCursors = signal<import('../../core/services/presence.service').CursorPresence[]>([]);
  onlineUidSet = signal<Set<string>>(new Set());

  readonly canUndo = this.historyService.canUndo;
  readonly canRedo = this.historyService.canRedo;

  @ViewChild('boardEl') boardElRef?: ElementRef<HTMLElement>;

  private _subs: Subscription[] = [];

  get boardId(): string {
    return this.route.snapshot.paramMap.get('id')!;
  }

  ngOnInit(): void {
    const boardId = this.boardId;

    // Watch board metadata
    this._subs.push(
      this.boardService.watchBoard(boardId).subscribe(b => {
        this.board.set(b ?? null);
        this.loading.set(false);
      })
    );

    // Watch things
    this._subs.push(
      this.thingService.watchThings(boardId).subscribe(ts => this.things.set(ts))
    );

    // Join presence
    this.presenceService.join(boardId);

    // Watch remote cursors
    this._subs.push(
      this.presenceService.watchPresence(boardId).subscribe(presence => {
        const uid = this.auth.getCurrentUid();
        const others = Object.entries(presence)
          .filter(([k]) => k !== uid)
          .map(([, v]) => v);
        this.remoteCursors.set(others);
        this.onlineUidSet.set(new Set(Object.keys(presence)));
      })
    );
  }

  ngOnDestroy(): void {
    this._subs.forEach(s => s.unsubscribe());
    this.historyService.clear();
    this.selection.clearSelection();
  }

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); this.undo(); }
    if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); this.redo(); }
    if (ctrl && e.key === 'a') { e.preventDefault(); this.selection.selectAll(this.things().map(t => t.id)); }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
        this._deleteSelected();
      }
    }
    if (e.key === 'Escape') this.selection.clearSelection();
  }

  // ── Canvas events ───────────────────────────────────────────────────────────
  onCanvasClick(_: MouseEvent): void {
    this.selection.clearSelection();
  }

  onCursorMove(e: { canvasX: number; canvasY: number }): void {
    this.presenceService.updateCursor(e.canvasX, e.canvasY);
  }

  // ── Thing management ────────────────────────────────────────────────────────
  async onAddThing(event: AddThingEvent): Promise<void> {
    const boardId = this.boardId;
    const center = this._getViewportCenter();
    const defaults = this._defaultThingData(event.type, center.x, center.y);
    try {
      const id = await this.thingService.addThing(boardId, defaults as any);
      this.historyService.push({ type: 'add', thing: { ...defaults, id, boardId } as Thing });
    } catch {
      this.snackbar.open('Failed to add item', 'OK', { duration: 3000 });
    }
  }

  onThingMoved(e: ThingMoveEvent): void {
    const original = this.things().find(t => t.id === e.id);
    if (!original) return;
    this.thingService.queueUpdate(e.boardId, e.id, { x: e.x, y: e.y });
    this.historyService.push({
      type: 'move', id: e.id, boardId: e.boardId,
      from: { x: original.x, y: original.y },
      to: { x: e.x, y: e.y },
    });
  }

  onThingResized(e: ThingResizeEvent): void {
    const original = this.things().find(t => t.id === e.id);
    if (!original) return;
    this.thingService.queueUpdate(e.boardId, e.id, { width: e.width, height: e.height, x: e.x, y: e.y });
    this.historyService.push({
      type: 'resize', id: e.id, boardId: e.boardId,
      from: { width: original.width, height: original.height },
      to: { width: e.width, height: e.height },
    });
  }

  onThingSelected(thing: Thing): void {
    this.selection.select(thing.id);
  }

  onThingDataChanged(thing: Thing, partial: object): void {
    this.thingService.queueUpdate(thing.boardId, thing.id, { data: { ...(thing as any).data, ...partial } } as any);
  }

  onContextMenu(event: { event: MouseEvent; thing: Thing }): void {
    event.event.preventDefault();
    this.ctxMenuThing.set(event.thing);
    this.ctxMenuX.set(event.event.clientX);
    this.ctxMenuY.set(event.event.clientY);
  }

  async onContextAction(action: ContextAction): Promise<void> {
    const thing = this.ctxMenuThing();
    if (!thing) return;
    this.ctxMenuThing.set(null);

    switch (action) {
      case 'delete':
        await this._deleteThing(thing);
        break;
      case 'duplicate':
        await this._duplicateThing(thing);
        break;
      case 'lock':
        this.thingService.queueUpdate(thing.boardId, thing.id, { locked: true } as any);
        break;
      case 'unlock':
        this.thingService.queueUpdate(thing.boardId, thing.id, { locked: false } as any);
        break;
      case 'bringToFront': {
        const maxZ = Math.max(...this.things().map(t => t.zIndex ?? 0), 0);
        this.thingService.queueUpdate(thing.boardId, thing.id, { zIndex: maxZ + 1 } as any);
        break;
      }
      case 'sendToBack': {
        const minZ = Math.min(...this.things().map(t => t.zIndex ?? 0), 0);
        this.thingService.queueUpdate(thing.boardId, thing.id, { zIndex: minZ - 1 } as any);
        break;
      }
    }
  }

  private async _deleteThing(thing: Thing): Promise<void> {
    this.historyService.push({ type: 'delete', things: [thing] });
    await this.thingService.deleteThing(thing.boardId, thing.id);
    this.selection.clearSelection();
  }

  private _deleteSelected(): Promise<void> {
    const ids = this.selection.getSelectedIds();
    const toDelete = this.things().filter(t => ids.includes(t.id));
    if (!toDelete.length) return Promise.resolve();
    this.historyService.push({ type: 'delete', things: toDelete });
    return Promise.all(toDelete.map(t => this.thingService.deleteThing(t.boardId, t.id))).then(() => {
      this.selection.clearSelection();
    });
  }

  private async _duplicateThing(thing: Thing): Promise<void> {
    const copy = {
      ...thing,
      x: thing.x + 24,
      y: thing.y + 24,
    };
    delete (copy as any).id;
    const id = await this.thingService.addThing(thing.boardId, copy as any);
    this.historyService.push({ type: 'add', thing: { ...copy, id, boardId: thing.boardId } as Thing });
  }

  // ── Undo / Redo ─────────────────────────────────────────────────────────────
  async undo(): Promise<void> {
    const action = this.historyService.popUndo();
    if (!action) return;
    if (action.type === 'add') {
      await this.thingService.deleteThing(action.thing.boardId, action.thing.id);
    } else if (action.type === 'delete') {
      await Promise.all(action.things.map(t => this.thingService.addThing(t.boardId, t as any)));
    } else if (action.type === 'move') {
      this.thingService.queueUpdate(action.boardId, action.id, { x: action.from.x, y: action.from.y } as any);
    } else if (action.type === 'resize') {
      this.thingService.queueUpdate(action.boardId, action.id, { width: action.from.width, height: action.from.height } as any);
    } else if (action.type === 'update') {
      this.thingService.queueUpdate(action.boardId, action.id, action.from as any);
    }
  }

  async redo(): Promise<void> {
    const action = this.historyService.popRedo();
    if (!action) return;
    if (action.type === 'add') {
      await this.thingService.addThing(action.thing.boardId, action.thing as any);
    } else if (action.type === 'delete') {
      await Promise.all(action.things.map(t => this.thingService.deleteThing(t.boardId, t.id)));
    } else if (action.type === 'move') {
      this.thingService.queueUpdate(action.boardId, action.id, { x: action.to.x, y: action.to.y } as any);
    } else if (action.type === 'resize') {
      this.thingService.queueUpdate(action.boardId, action.id, { width: action.to.width, height: action.to.height } as any);
    } else if (action.type === 'update') {
      this.thingService.queueUpdate(action.boardId, action.id, action.to as any);
    }
  }

  // ── Board settings ──────────────────────────────────────────────────────────
  onRemoveCollaborator(uid: string): void {
    const b = this.board();
    if (!b) return;
    this.boardService.removeCollaborator(b.id, uid);
  }

  onBackgroundChange(bg: string): void {
    const b = this.board();
    if (!b) return;
    this.boardService.updateBackground(b.id, bg as Board['background']);
  }

  openInviteDialog(): void {
    const b = this.board();
    if (!b) return;
    this.dialog.open(InviteDialogComponent, { data: { boardId: b.id }, width: '400px' });
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  private _getViewportCenter(): { x: number; y: number } {
    const el = this.boardElRef?.nativeElement;
    const w = el?.clientWidth ?? window.innerWidth;
    const h = el?.clientHeight ?? window.innerHeight;
    return this.canvasService.getViewportCenter(w, h);
  }

  isSelected(thing: Thing): boolean {
    return this.selection.isSelected(thing.id);
  }

  // Typed thing accessors for template
  asText(t: Thing): TextThing { return t as TextThing; }
  asLabel(t: Thing): LabelThing { return t as LabelThing; }
  asShape(t: Thing): ShapeThing { return t as ShapeThing; }
  asFile(t: Thing): FileThing { return t as FileThing; }
  asFlight(t: Thing): FlightThing { return t as FlightThing; }
  asPlace(t: Thing): PlaceThing { return t as PlaceThing; }
  asRoutes(t: Thing): RoutesThing { return t as RoutesThing; }
  asMoney(t: Thing): MoneyThing { return t as MoneyThing; }

  private _defaultThingData(
    type: ThingType,
    cx: number,
    cy: number
  ): Omit<Thing, 'id' | 'boardId' | 'createdBy' | 'createdAt' | 'updatedAt'> {
    const maxZ = Math.max(...this.things().map(t => t.zIndex ?? 0), 0);
    const base: Omit<ThingBase, 'id' | 'boardId' | 'type' | 'createdBy' | 'createdAt' | 'updatedAt'> = {
      x: cx - 160, y: cy - 100, width: 320, height: 200, zIndex: maxZ + 1,
      rotation: 0, locked: false,
    };

    switch (type) {
      case 'text':
        return { ...base, type, width: 300, height: 120, data: { content: '<p>Type here…</p>', fontSize: 16, align: 'left', bold: false, italic: false } } as unknown as TextThing;
      case 'label':
        return { ...base, type, width: 160, height: 48, data: { text: 'Label', color: 'blue', icon: 'label' } } as unknown as LabelThing;
      case 'shape':
        return { ...base, type, width: 200, height: 160, data: { shape: 'rect', fill: '#90CAF9', stroke: '#1976D2', strokeWidth: 2, opacity: 1 } } as unknown as ShapeThing;
      case 'file':
        return { ...base, type, width: 260, height: 200, data: { name: '', url: '', mimeType: '', size: 0 } } as unknown as FileThing;
      case 'flight':
        return { ...base, type, width: 320, height: 220, data: { from: '', to: '', date: '', airline: '', flightNumber: '', price: 0, currency: 'USD', status: 'searching', departureTime: '', arrivalTime: '' } } as unknown as FlightThing;
      case 'place':
        return { ...base, type, width: 300, height: 280, data: { placeId: '', name: '', address: '', lat: 0, lng: 0 } } as unknown as PlaceThing;
      case 'routes':
        return { ...base, type, width: 340, height: 380, data: { title: 'My Route', waypoints: [{ id: crypto.randomUUID(), placeId: '', name: '', address: '', lat: 0, lng: 0 }, { id: crypto.randomUUID(), placeId: '', name: '', address: '', lat: 0, lng: 0 }], travelMode: 'DRIVING' } } as unknown as RoutesThing;
      case 'money':
        return { ...base, type, width: 340, height: 300, data: { title: 'Budget', currency: 'USD', items: [], totalBudget: 0 } } as unknown as MoneyThing;
    }
  }
}
