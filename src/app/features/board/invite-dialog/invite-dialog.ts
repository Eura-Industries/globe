import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { inject } from '@angular/core';
import { BoardService } from '../../../core/services/board.service';

@Component({
  selector: 'app-invite-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>Invite Collaborator</h2>
    <mat-dialog-content>
      <p class="hint">Enter the email address of the person you'd like to invite.</p>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Email address</mat-label>
        <input matInput type="email" [formControl]="emailCtrl" cdkFocusInitial />
        <mat-error *ngIf="emailCtrl.hasError('email')">Enter a valid email</mat-error>
        <mat-error *ngIf="emailCtrl.hasError('required')">Email is required</mat-error>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="emailCtrl.invalid || loading"
        (click)="invite()">
        @if (loading) { Sending… } @else { Send Invite }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width: 100%; } .hint { color: #666; font-size: 13px; margin: 0 0 12px; }`],
})
export class InviteDialogComponent {
  private boardService = inject(BoardService);
  private snack = inject(MatSnackBar);
  private ref = inject(MatDialogRef<InviteDialogComponent>);
  private data: { boardId: string } = inject(MAT_DIALOG_DATA);

  emailCtrl = new FormControl('', [Validators.required, Validators.email]);
  loading = false;

  async invite(): Promise<void> {
    if (this.emailCtrl.invalid) return;
    this.loading = true;
    try {
      await this.boardService.inviteByEmail(this.data.boardId, this.emailCtrl.value!.toLowerCase().trim());
      this.snack.open('Invite sent!', undefined, { duration: 2500 });
      this.ref.close(true);
    } catch (e: any) {
      this.snack.open(`Failed: ${e.message}`, undefined, { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }
}
