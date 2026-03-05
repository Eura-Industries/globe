import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../core/auth/auth.service';
import { BoardService } from '../../core/services/board.service';
import { Board } from '../../core/models/board.model';
import { CreateBoardDialogComponent } from './create-board-dialog/create-board-dialog';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  private boardService = inject(BoardService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  boards$!: Observable<Board[]>;
  loading = true;

  ngOnInit(): void {
    this.boards$ = this.boardService.watchMyBoards();
    this.boards$.subscribe(() => (this.loading = false));
  }

  openBoard(id: string): void {
    this.router.navigate(['/board', id]);
  }

  async openCreate(): Promise<void> {
    const ref = this.dialog.open(CreateBoardDialogComponent, {
      width: '400px',
      panelClass: 'globe-dialog',
    });
    const result = await ref.afterClosed().toPromise();
    if (result) {
      const id = await this.boardService.createBoard(result.name, result.emoji);
      this.router.navigate(['/board', id]);
    }
  }

  async startRename(board: Board): Promise<void> {
    const name = prompt('Rename board:', board.name);
    if (name && name.trim()) {
      await this.boardService.renameBoard(board.id, name.trim());
      this.snack.open('Board renamed', undefined, { duration: 2000 });
    }
  }

  async confirmDelete(board: Board): Promise<void> {
    if (confirm(`Delete "${board.name}"? This cannot be undone.`)) {
      await this.boardService.deleteBoard(board.id);
      this.snack.open('Board deleted', undefined, { duration: 2000 });
    }
  }
}
