import {
  Component, Input, Output, EventEmitter,
  ViewChild, ElementRef, AfterViewInit, AfterViewChecked, OnChanges, SimpleChanges, OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RoutesThing, RoutesData, RouteWaypoint, TravelMode } from '../../../../core/models/thing.model';
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
}

@Component({
  selector: 'app-routes-thing',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './routes-thing.html',
  styleUrl: './routes-thing.scss',
})
export class RoutesThingComponent implements AfterViewInit, AfterViewChecked, OnChanges, OnDestroy {
  @Input({ required: true }) thing!: RoutesThing;
  @Output() dataChanged = new EventEmitter<Partial<RoutesData>>();

  @ViewChild('mapEl') mapElRef?: ElementRef<HTMLDivElement>;

  hasRoute = false;
  activeSearchIdx: number | null = null;
  searchResults: NominatimResult[] = [];
  inputValues: string[] = [];

  travelModes: { value: TravelMode; label: string; icon: string }[] = [
    { value: 'DRIVING', label: 'Drive', icon: 'directions_car' },
    { value: 'WALKING', label: 'Walk', icon: 'directions_walk' },
    { value: 'BICYCLING', label: 'Bike', icon: 'directions_bike' },
    { value: 'TRANSIT', label: 'Transit', icon: 'directions_transit' },
  ];

  private _map?: L.Map;
  private _routeLayer?: L.Polyline;
  private _markers: L.Marker[] = [];
  private _pendingDraw?: { latlngs: [number, number][]; waypoints: RouteWaypoint[] };
  private _searchDebounce?: ReturnType<typeof setTimeout>;

  constructor(private _http: HttpClient) {}

  ngAfterViewInit(): void {
    this._syncInputValues();
    const valid = this.thing.data.waypoints.filter(w => w.lat && w.lng);
    if (valid.length >= 2) this._calculateRoute(this.thing.data);
  }

  ngAfterViewChecked(): void {
    if (this._pendingDraw && this.mapElRef) {
      const { latlngs, waypoints } = this._pendingDraw;
      this._pendingDraw = undefined;
      if (!this._map) this._initMap(latlngs, waypoints);
      else this._drawRoute(latlngs, waypoints);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['thing']) this._syncInputValues();
  }

  ngOnDestroy(): void { this._map?.remove(); }

  private _syncInputValues(): void {
    this.inputValues = this.thing.data.waypoints.map(w => w.name || w.address || '');
  }

  onWaypointInput(idx: number, value: string): void {
    this.inputValues[idx] = value;
    this.activeSearchIdx = idx;
    clearTimeout(this._searchDebounce);
    if (value.trim().length < 2) { this.searchResults = []; return; }
    this._searchDebounce = setTimeout(() => {
      this._http.get<NominatimResult[]>(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value.trim())}&limit=5`,
        { headers: { 'Accept-Language': 'en' } },
      ).subscribe(r => { this.searchResults = r; });
    }, 400);
  }

  selectWaypointResult(r: NominatimResult): void {
    const idx = this.activeSearchIdx!;
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    const name = r.display_name.split(',')[0];
    const updated = [...this.thing.data.waypoints];
    updated[idx] = { ...updated[idx], placeId: r.place_id, name, address: r.display_name, lat, lng };
    this.inputValues[idx] = name;
    this.activeSearchIdx = null;
    this.searchResults = [];
    this.dataChanged.emit({ waypoints: updated });
    this._calculateRoute({ ...this.thing.data, waypoints: updated });
  }

  dismissSearch(): void {
    this.activeSearchIdx = null;
    this.searchResults = [];
  }

  addWaypoint(): void {
    const newWp: RouteWaypoint = { id: crypto.randomUUID(), placeId: '', name: '', address: '', lat: 0, lng: 0 };
    this.inputValues.push('');
    this.dataChanged.emit({ waypoints: [...this.thing.data.waypoints, newWp] });
  }

  removeWaypoint(index: number): void {
    const updated = this.thing.data.waypoints.filter((_, i) => i !== index);
    this.inputValues.splice(index, 1);
    this.dataChanged.emit({ waypoints: updated });
    this._calculateRoute({ ...this.thing.data, waypoints: updated });
  }

  setTravelMode(mode: TravelMode): void {
    this.dataChanged.emit({ travelMode: mode });
    this._calculateRoute({ ...this.thing.data, travelMode: mode });
  }

  updateTitle(title: string): void { this.dataChanged.emit({ title }); }

  private _osrmProfile(mode: TravelMode): string {
    if (mode === 'WALKING') return 'foot';
    if (mode === 'BICYCLING') return 'bike';
    return 'car';
  }

  private _calculateRoute(data: RoutesData): void {
    const valid = data.waypoints.filter(w => w.lat && w.lng);
    if (valid.length < 2) return;
    const coords = valid.map(w => `${w.lng},${w.lat}`).join(';');
    const profile = this._osrmProfile(data.travelMode);
    this._http.get<any>(
      `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson`,
    ).subscribe(res => {
      if (res.code !== 'Ok' || !res.routes?.[0]) return;
      const route = res.routes[0];
      this.dataChanged.emit({
        totalDistance: this._formatDistance(route.distance),
        totalDuration: this._formatDuration(route.duration),
      });
      const latlngs: [number, number][] = route.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng],
      );
      this.hasRoute = true;
      this._pendingDraw = { latlngs, waypoints: valid };
    });
  }

  private _initMap(latlngs: [number, number][], waypoints: RouteWaypoint[]): void {
    if (!this.mapElRef || this._map) return;
    this._map = L.map(this.mapElRef.nativeElement, {
      center: latlngs[0], zoom: 10, zoomControl: false, attributionControl: false,
    });
    L.tileLayer(TILE, { attribution: '© OpenStreetMap' }).addTo(this._map);
    this._drawRoute(latlngs, waypoints);
  }

  private _drawRoute(latlngs: [number, number][], waypoints: RouteWaypoint[]): void {
    if (!this._map) return;
    this._routeLayer?.remove();
    this._markers.forEach(m => m.remove());
    this._markers = [];
    this._routeLayer = L.polyline(latlngs, { color: '#006A6A', weight: 4 }).addTo(this._map);
    waypoints.forEach(wp => {
      this._markers.push(L.marker([wp.lat, wp.lng], { icon: ICON }).addTo(this._map!));
    });
    const bounds = this._routeLayer.getBounds();
    if (bounds.isValid()) this._map.fitBounds(bounds, { padding: [20, 20] });
  }

  private _formatDistance(meters: number): string {
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
  }

  private _formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  trackByIndex(i: number): number { return i; }
}
