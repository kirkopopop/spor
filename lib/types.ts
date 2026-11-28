// Domain model. Mirrors the Supabase schema planned for day 2, so the
// seed-data reader in lib/data.ts can be swapped for queries without
// touching the screens.

export type Stage = "idea" | "planning" | "live" | "memory";
export type StopKind = "fixed" | "normal" | "optional";
export type TravelMode = "walk" | "tube" | "train" | "bus" | "taxi" | "bike" | "plane" | "car";

export type Travel = {
  mode: TravelMode;
  min: number;
  text?: string;
  leave?: string; // "HH:MM", overrides the computed leave-by
  est?: boolean;
};

export type StopOption = {
  id: string;
  name: string;
  body?: string;
  mapsQuery?: string;
};

export type Stop = {
  id: string; // uuid; never derived from position, so ticks and picks survive reordering
  time: string; // "HH:MM", local to the trip's timezone
  approx?: boolean; // shown as "~HH:MM"
  name: string;
  kind: StopKind;
  body?: string;
  more?: string; // plan B, phone numbers, tips; **bold** and blank-line paragraphs
  lat?: number;
  lng?: number;
  mapsQuery?: string;
  go?: Travel; // how you get here from the previous stop
  journey?: "train" | "bus" | "plane"; // the stop itself is a journey
  offMap?: boolean;
  who?: string;
  fee?: { label: string; paid: boolean };
  bookingId?: string;
  options?: StopOption[];
  pickOne?: boolean;
  pickedOptionId?: string;
  doneAt?: string | null; // null = unticked (must survive JSON, unlike undefined)
};

export type Day = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  city: string;
  place: string;
  intro?: string;
  rain: string[];
  stops: Stop[];
};

export type Booking = {
  id: string;
  title: string;
  note?: string;
  status: "to_book" | "booked";
  estCost?: number;
};

export type BudgetLine = {
  category: string;
  label: string;
  planned: number;
};

export type SpareIdea = {
  id: string;
  name: string;
  city: string;
  area?: string;
  note?: string;
  indoor: boolean;
  minutes: number;
  lat?: number;
  lng?: number;
  mapsQuery?: string;
};

export type Note = {
  id: string;
  body: string;
  authorId?: string; // set by the database; missing on a note still queued on this phone
  via?: "claude"; // written by someone's Claude through the connector
  stopId?: string;
  dayId?: string;
  createdAt: string;
};

export type Expense = {
  id: string;
  amount: number;
  currency: Trip["currency"];
  category: string;
  paidBy?: string; // user id
  stopId?: string;
  note?: string;
  spentAt: string;
};

export type Role = "owner" | "editor" | "viewer";
/** Someone with a tur account: on a trip (with their role there) or a travel companion. */
export type Member = { userId: string; name: string; role?: Role };

export type Trip = {
  id: string;
  revision?: number; // bumps on every change inside the trip; Claude's writes must quote it
  name: string;
  stage: Stage;
  startDate: string;
  endDate: string;
  timezone: string;
  currency: "EUR" | "GBP" | "DKK" | "USD";
  people: string[];
  summary?: string;
  ownerId?: string;
  members?: Member[]; // accounts the trip is shared with, owner included
  days: Day[];
  bookings: Booking[];
  budget: BudgetLine[];
  spare: SpareIdea[];
  notes?: Note[];
  expenses?: Expense[];
};
