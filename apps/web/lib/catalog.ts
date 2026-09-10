import { createClient, hasSupabaseConfig } from "./supabase/server";

export type TreatmentOption = {
  id: string;
  slug: string;
  name: string;
  description: string;
  durationMin: number;
  prices: Partial<Record<"studio" | "home" | "hotel", number>>;
};

export type ZoneOption = { id: string; name: string };

const previewTreatments: TreatmentOption[] = [
  { id: "preview-reset", slug: "mombasa-reset", name: "The Mombasa Reset", description: "A restorative full-body session for tired travellers and long coastal days.", durationMin: 90, prices: { studio: 7000, home: 8500, hotel: 9000 } },
  { id: "preview-deep", slug: "deep-release", name: "Deep Release", description: "Focused pressure and mobility work for shoulders, back, and legs.", durationMin: 60, prices: { studio: 5000, home: 6500, hotel: 7000 } },
  { id: "preview-quiet", slug: "quiet-hour", name: "Quiet Hour", description: "A gentle calming session designed to settle the nervous system.", durationMin: 60, prices: { studio: 4200, home: 5700 } },
];

export async function getCatalog() {
  const configured = hasSupabaseConfig();
  if (!configured) return { configured, liveCatalog: false, treatments: previewTreatments, zones: [] as ZoneOption[] };

  const supabase = await createClient();
  const [{ data: treatmentRows }, { data: priceRows }, { data: zoneRows }] = await Promise.all([
    supabase.from("treatments").select("id, slug, name, description, duration_min").eq("is_active", true).order("sort_order"),
    supabase.from("treatment_pricing").select("treatment_id, mode, price_kes").eq("is_available", true),
    supabase.from("zones").select("id, name").eq("is_serviceable", true).order("name"),
  ]);

  const prices = new Map<string, TreatmentOption["prices"]>();
  for (const row of priceRows ?? []) {
    const entry = prices.get(row.treatment_id) ?? {};
    entry[row.mode as "studio" | "home" | "hotel"] = row.price_kes;
    prices.set(row.treatment_id, entry);
  }
  const treatments = (treatmentRows ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    durationMin: row.duration_min,
    prices: prices.get(row.id) ?? {},
  }));

  return {
    configured,
    liveCatalog: treatments.length > 0,
    treatments: treatments.length > 0 ? treatments : previewTreatments,
    zones: (zoneRows ?? []) as ZoneOption[],
  };
}
