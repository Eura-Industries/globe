import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-create-board-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './create-board-dialog.html',
  styles: [`
    .emoji-row { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 16px; }
    .emoji-btn { font-size: 22px; width: 44px; height: 44px; border-radius: 8px !important; }
    .emoji-btn.selected { background: rgba(0,106,106,.15); }
    .full-width { width: 100%; }
  `],
})
export class CreateBoardDialogComponent {
  private ref = inject(MatDialogRef<CreateBoardDialogComponent>);

  emojis = ['🌍', '✈️', '🏖️', '🏔️', '🗺️', '🚂', '🚢', '🏕️', '🌴', '🎒', '🗼', '🌏'];

  form = new FormGroup({
    name: new FormControl('', [Validators.required]),
    emoji: new FormControl('🌍'),
  });

  submit(): void {
    if (this.form.valid) {
      this.ref.close(this.form.value);
    }
  }
}
