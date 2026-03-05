import {
  Component, Input, Output, EventEmitter,
  ViewChild, ElementRef, AfterViewInit, AfterViewChecked, OnChanges, SimpleChanges, OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PlaceThing, PlaceData } from '../../../../core/models/thing.model';
import * as L from 'leaflet';

const TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ICON = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

interface NominatimResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
}

@Component({
  selector: 'app-place-thing',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule],
  templateUrl: './place-thing.html',
  styleUrl: './place-thing.scss',
})
export class PlaceThingComponent implements AfterViewInit, AfterViewChecked, OnChanges, OnDestroy {
  @Input({ required: true }) thing!: PlaceThing;
  @Output() dataChanged = new EventEmitter<Partial<PlaceData>>();

  @ViewChild('mapEl') mapElRef?: ElementRef<HTMLDivElement>;

  searching = false;
  searchQuery = '';
  searchResults: NominatimResult[] = [];

  private _map?: L.Map;
  private _marker?: L.Marker;
  private _needsMapInit = false;
  private _pendingLatLng?: [number, number];
  private _searchDebounce?: ReturnType<typeof setTimeout>;

  constructor(private _http: HttpClient) {}

  ngAfterViewInit(): void {
    if (this.thing.data.lat && this.thing.data.lng) {
      this._initMap(this.thing.data.lat, this.thing.data.lng);
    }
  }

  ngAfterViewChecked(): void {
    if (this._needsMapInit && this.mapElRef && !this._map) {
      this._needsMapInit = false;
      const [lat, lng] = this._pendingLatLng ?? [this.thing.data.lat ?? 20, this.thing.data.lng ?? 0];
      this._initMap(lat, lng);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['thing'] && this._map) {
      const { lat, lng } = this.thing.data;
      if (lat && lng) {
        this._map.setView([lat, lng], 13);
        this._marker?.setLatLng([lat, lng]);
      }
    }
  }

  ngOnDestroy(): void { this._map?.remove(); }

  startSearch(): void {
    this.searching = true;
    this.searchQuery = '';
    this.searchResults = [];
  }

  onSearchInput(value: string): void {
    this.searchQuery = value;
    clearTimeout(this._searchDebounce);
    if (value.trim().length < 2) { this.searchResults = []; return; }
    this._searchDebounce = setTimeout(() => {
      this._http.get<NominatimResult[]>(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value.trim())}&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } },
      ).subscribe(r => { this.searchResults = r; });
    }, 400);
  }

  selectResult(r: NominatimResult): void {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    const a = r.address ?? {};
    const name = a['city'] || a['town'] || a['village'] || a['county'] || r.display_name.split(',')[0];
    this.dataChanged.emit({ placeId: r.place_id, name, address: r.display_name, lat, lng });
    this.searching = false;
    this.searchResults = [];
    this.searchQuery = '';
    this._pendingLatLng = [lat, lng];
    if (this._map) {
      this._map.setView([lat, lng], 13);
      this._marker?.setLatLng([lat, lng]);
    } else {
      this._needsMapInit = true;
    }
  }

  cancelSearch(): void {
    this.searching = false;
    this.searchResults = [];
  }

  private _initMap(lat: number, lng: number): void {
    if (!this.mapElRef || this._map) return;
    this._map = L.map(this.mapElRef.nativeElement, {
      center: [lat, lng], zoom: 13, zoomControl: false, attributionControl: false,
    });
    L.tileLayer(TILE, { attribution: '© OpenStreetMap' }).addTo(this._map);
    this._marker = L.marker([lat, lng], { icon: ICON }).addTo(this._map);
  }
}
