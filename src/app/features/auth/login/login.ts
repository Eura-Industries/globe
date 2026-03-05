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
  selector: 'app-login',
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
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  private authService = inject(AuthService);

  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });

  loading = false;
  showPassword = false;
  errorMsg = '';

  async loginWithGoogle(): Promise<void> {
    this.loading = true;
    this.errorMsg = '';
    try {
      await this.authService.signInWithGoogle();
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Google sign-in failed';
    } finally {
      this.loading = false;
    }
  }

  async loginWithGithub(): Promise<void> {
    this.loading = true;
    this.errorMsg = '';
    try {
      await this.authService.signInWithGithub();
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'GitHub sign-in failed';
    } finally {
      this.loading = false;
    }
  }

  async loginWithEmail(): Promise<void> {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMsg = '';
    try {
      await this.authService.signInWithEmail(
        this.form.value.email!,
        this.form.value.password!
      );
    } catch (e: any) {
      this.errorMsg = this._mapFirebaseError(e?.code);
    } finally {
      this.loading = false;
    }
  }

  private _mapFirebaseError(code?: string): string {
    switch (code) {
      case 'auth/user-not-found': return 'No account found with that email.';
      case 'auth/wrong-password': return 'Incorrect password.';
      case 'auth/too-many-requests': return 'Too many tries. Try again later.';
      default: return 'Sign-in failed. Check your credentials.';
    }
  }
}
