import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GoogleMapsLoaderService {
  private doc = inject(DOCUMENT);
  private _loaded = false;
  private _promise: Promise<void> | null = null;

  load(): Promise<void> {
    if (this._loaded) return Promise.resolve();
    if (this._promise) return this._promise;

    this._promise = new Promise<void>((resolve, reject) => {
      const script = this.doc.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = () => { this._loaded = true; resolve(); };
      script.onerror = () => reject(new Error('Google Maps failed to load'));
      this.doc.head.appendChild(script);
    });

    return this._promise;
  }
}
