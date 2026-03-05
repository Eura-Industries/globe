import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TextThing, TextData } from '../../../../core/models/thing.model';

@Component({
  selector: 'app-text-thing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="text-thing"
      [class.transparent]="thing.data.transparent"
      [style.font-size.px]="thing.data.fontSize"
      [style.font-family]="thing.data.fontFamily"
      [style.color]="thing.data.color"
      (dblclick)="startEdit($event)"
    >
      @if (editing) {
        <div
          class="text-editor"
          contenteditable="true"
          [innerHTML]="thing.data.content"
          (blur)="finishEdit($event)"
          (input)="onInput($event)"
          #editor
        ></div>
      } @else {
        <div class="text-content" [innerHTML]="thing.data.content || '<span class=placeholder>Double-click to edit text…</span>'"></div>
      }
    </div>
  `,
  styles: [`
    .text-thing {
      width: 100%;
      height: 100%;
      padding: 12px;
      border-radius: 8px;
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,.08);
      overflow: hidden;
      display: flex;
      flex-direction: column;

      &.transparent { background: transparent; box-shadow: none; }
    }
    .text-content, .text-editor {
      width: 100%;
      height: 100%;
      outline: none;
      line-height: 1.5;
      word-break: break-word;
    }
    .text-editor { cursor: text; }
    :host ::ng-deep .placeholder { color: #aaa; }
  `],
})
export class TextThingComponent {
  @Input({ required: true }) thing!: TextThing;
  @Output() dataChanged = new EventEmitter<Partial<TextData>>();

  editing = false;

  startEdit(event: MouseEvent): void {
    event.stopPropagation();
    this.editing = true;
    setTimeout(() => {
      const el = document.querySelector('.text-editor') as HTMLElement;
      if (el) { el.focus(); this._placeCaretAtEnd(el); }
    });
  }

  onInput(event: Event): void {
    const el = event.target as HTMLElement;
    this.dataChanged.emit({ content: el.innerHTML });
  }

  finishEdit(event: FocusEvent): void {
    const el = event.target as HTMLElement;
    this.dataChanged.emit({ content: el.innerHTML });
    this.editing = false;
  }

  private _placeCaretAtEnd(el: HTMLElement): void {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }
}
