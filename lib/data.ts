import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import type { Trip } from "./types";

// Prototype data source: JSON trips in data/seed/ (gitignored, made by
// scripts/import-uktrip.mjs). Day 2 swaps these two functions for Supabase.
const SEED_DIR = path.join(process.cwd(), "data", "seed");

export async function getTrips(): Promise<Trip[]> {
  await connection();
  let files: string[];
  try {
    files = (await readdir(SEED_DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const trips = await Promise.all(
    files.map(async (f) => JSON.parse(await readFile(path.join(SEED_DIR, f), "utf8")) as Trip),
  );
  return trips.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export async function getTrip(id: string): Promise<Trip | undefined> {
  return (await getTrips()).find((t) => t.id === id);
}
