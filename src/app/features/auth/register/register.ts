import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './register.html',
  styleUrl: '../login/login.scss',
})
export class RegisterComponent {
  private authService = inject(AuthService);

  form = new FormGroup({
    displayName: new FormControl('', [Validators.required, Validators.minLength(2)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(8)]),
  });

  loading = false;
  showPassword = false;
  errorMsg = '';

  async register(): Promise<void> {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMsg = '';
    try {
      await this.authService.registerWithEmail(
        this.form.value.email!,
        this.form.value.password!,
        this.form.value.displayName!
      );
    } catch (e: any) {
      this.errorMsg = this._mapFirebaseError(e?.code) ?? e?.message ?? 'Registration failed';
    } finally {
      this.loading = false;
    }
  }

  private _mapFirebaseError(code?: string): string {
    switch (code) {
      case 'auth/email-already-in-use': return 'An account with this email already exists.';
      case 'auth/weak-password': return 'Password is too weak.';
      default: return 'Registration failed. Please try again.';
    }
  }
}
