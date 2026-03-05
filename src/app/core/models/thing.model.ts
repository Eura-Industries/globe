// ─── Discriminated union for all Thing types ─────────────────────────────────

export type ThingType =
  | 'text'
  | 'label'
  | 'shape'
  | 'file'
  | 'flight'
  | 'place'
  | 'routes'
  | 'money';

export interface ThingBase {
  id: string;
  boardId: string;
  type: ThingType;
  x: number;        // canvas coords
  y: number;
  width: number;
  height: number;
  zIndex: number;
  rotation: number; // degrees
  locked: boolean;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

// ─── Text ────────────────────────────────────────────────────────────────────
export interface TextData {
  content: string; // HTML from TipTap
  fontSize: number;
  fontFamily: string;
  color: string;
  transparent: boolean;
}
export interface TextThing extends ThingBase { type: 'text'; data: TextData; }

// ─── Label ───────────────────────────────────────────────────────────────────
export type LabelStyle = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'custom';
export interface LabelData {
  text: string;
  style: LabelStyle;
  icon: string; // Material icon name
  bgColor?: string;
  textColor?: string;
}
export interface LabelThing extends ThingBase { type: 'label'; data: LabelData; }

// ─── Shape ───────────────────────────────────────────────────────────────────
export type ShapeKind = 'rect' | 'circle' | 'diamond' | 'triangle' | 'arrow' | 'star';
export interface ShapeData {
  shape: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  cornerRadius?: number;
}
export interface ShapeThing extends ThingBase { type: 'shape'; data: ShapeData; }

// ─── File ────────────────────────────────────────────────────────────────────
export interface FileData {
  fileName: string;
  fileType: string; // MIME
  fileSize: number;
  storageUrl: string;
  thumbnailUrl?: string;
  uploadedBy: string;
}
export interface FileThing extends ThingBase { type: 'file'; data: FileData; }

// ─── Flight ──────────────────────────────────────────────────────────────────
export interface FlightEndpoint {
  iata: string;
  city: string;
  dateTime: string; // ISO 8601
}
export interface FlightData {
  airline: string;
  airlineLogo?: string;
  flightNumber: string;
  from: FlightEndpoint;
  to: FlightEndpoint;
  duration: string;  // e.g. "2h 35m"
  cabinClass: 'economy' | 'premium_economy' | 'business' | 'first';
  price?: number;
  currency?: string;
  bookingRef?: string;
  notes?: string;
}
export interface FlightThing extends ThingBase { type: 'flight'; data: FlightData; }

// ─── Place ───────────────────────────────────────────────────────────────────
export type PlaceKind = 'place' | 'city' | 'country';
export interface PlaceData {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  kind: PlaceKind;
  photoRef?: string;
  rating?: number;
  website?: string;
  notes?: string;
}
export interface PlaceThing extends ThingBase { type: 'place'; data: PlaceData; }

// ─── Routes ──────────────────────────────────────────────────────────────────
export interface RouteWaypoint {
  id: string;
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  stopDuration?: string; // e.g. "2 days"
  notes?: string;
}
export type TravelMode = 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT';
export interface RoutesData {
  title: string;
  waypoints: RouteWaypoint[];
  travelMode: TravelMode;
  totalDistance?: string;
  totalDuration?: string;
}
export interface RoutesThing extends ThingBase { type: 'routes'; data: RoutesData; }

// ─── Money ───────────────────────────────────────────────────────────────────
export type MoneyCategory = 'transport' | 'accommodation' | 'food' | 'activities' | 'shopping' | 'other';
export interface MoneyItem {
  id: string;
  category: MoneyCategory;
  label: string;
  amount: number;
  paid: boolean;
}
export interface MoneyData {
  title: string;
  currency: string; // ISO 4217
  items: MoneyItem[];
}
export interface MoneyThing extends ThingBase { type: 'money'; data: MoneyData; }

// ─── Union ───────────────────────────────────────────────────────────────────
export type Thing =
  | TextThing
  | LabelThing
  | ShapeThing
  | FileThing
  | FlightThing
  | PlaceThing
  | RoutesThing
  | MoneyThing;
