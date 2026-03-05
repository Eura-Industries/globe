import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FlightThing, FlightData } from '../../../../core/models/thing.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-flight-thing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './flight-thing.html',
  styleUrl: './flight-thing.scss',
})
export class FlightThingComponent {
  @Input({ required: true }) thing!: FlightThing;
  @Output() dataChanged = new EventEmitter<Partial<FlightData>>();

  private http = inject(HttpClient);

  editing = false;
  lookingUp = false;

  draft: Partial<FlightData> = {};

  startEdit(): void {
    this.draft = { ...this.thing.data };
    this.editing = true;
  }

  saveEdit(): void {
    this.dataChanged.emit(this.draft);
    this.editing = false;
  }

  cancelEdit(): void {
    this.editing = false;
    this.draft = {};
  }

  /** Optional Amadeus flight lookup */
  async lookupFlight(): Promise<void> {
    if (!this.draft.flightNumber || !this.draft.from?.dateTime) return;
    this.lookingUp = true;
    try {
      const token = await this._getAmadeusToken();
      const date = this.draft.from.dateTime.slice(0, 10);
      const carrier = this.draft.flightNumber.replace(/[0-9]/g, '').trim();
      const number = this.draft.flightNumber.replace(/[^0-9]/g, '').trim();
      const url = `${environment.amadeus.baseUrl}/v2/schedule/flights?carrierCode=${carrier}&flightNumber=${number}&scheduledDepartureDate=${date}`;
      this.http.get<any>(url, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
      }).subscribe({
        next: (res) => {
          const f = res?.data?.[0];
          if (f) {
            const seg = f.flightDesignator;
            // Map response to draft (simplified)
            this.draft = {
              ...this.draft,
              airline: f.flightDesignator?.carrierCode ?? this.draft.airline,
              from: { ...this.draft.from!, iata: f.legs?.[0]?.boardPointIataCode ?? this.draft.from!.iata },
              to:   { ...this.draft.to!,   iata: f.legs?.[0]?.offPointIataCode  ?? this.draft.to!.iata   },
            };
          }
          this.lookingUp = false;
        },
        error: () => { this.lookingUp = false; },
      });
    } catch {
      this.lookingUp = false;
    }
  }

  private async _getAmadeusToken(): Promise<string> {
    const res = await this.http.post<any>(
      `${environment.amadeus.baseUrl}/v1/security/oauth2/token`,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: environment.amadeus.clientId,
        client_secret: environment.amadeus.clientSecret,
      }).toString(),
      { headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }) }
    ).toPromise();
    return res.access_token;
  }
}
