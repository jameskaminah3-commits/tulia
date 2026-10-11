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
export type TherapistCard = {
  id: string;
  displayName: string;
  bio: string | null;
  photoPath: string | null;
  homeZone: string | null;
  servesStudio: boolean;
  servesHome: boolean;
  servesHotel: boolean;
};

const previewTreatments: TreatmentOption[] = [
  { id: "preview-reset", slug: "mombasa-reset", name: "The Mombasa Reset", description: "A restorative full-body session for tired travellers and long coastal days.", durationMin: 90, prices: { studio: 7000, home: 8500, hotel: 9000 } },
  { id: "preview-deep", slug: "deep-release", name: "Deep Release", description: "Focused pressure and mobility work for shoulders, back, and legs.", durationMin: 60, prices: { studio: 5000, home: 6500, hotel: 7000 } },
  { id: "preview-quiet", slug: "quiet-hour", name: "Quiet Hour", description: "A gentle calming session designed to settle the nervous system.", durationMin: 60, prices: { studio: 4200, home: 5700 } },
];

export async function getCatalog() {
  const configured = hasSupabaseConfig();
  if (!configured) return { configured, liveCatalog: false, treatments: previewTreatments, zones: [] as ZoneOption[], therapists: [] as TherapistCard[] };

  const supabase = await createClient();
  const [{ data: treatmentRows }, { data: priceRows }, { data: zoneRows }, { data: therapistRows }] = await Promise.all([
    supabase.from("treatments").select("id, slug, name, description, duration_min").eq("is_active", true).order("sort_order"),
    supabase.from("treatment_pricing").select("treatment_id, mode, price_kes").eq("is_available", true),
    supabase.from("zones").select("id, name").eq("is_serviceable", true).order("name"),
    supabase.from("therapists").select("id, display_name, bio, photo_path, home_zone, serves_studio, serves_home, serves_hotel").eq("is_active", true).not("vetted_at", "is", null).order("created_at", { ascending: false }).limit(18),
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
    therapists: (therapistRows ?? []).map((row) => ({
      id: row.id,
      displayName: row.display_name,
      bio: row.bio,
      photoPath: row.photo_path,
      homeZone: row.home_zone,
      servesStudio: row.serves_studio,
      servesHome: row.serves_home,
      servesHotel: row.serves_hotel,
    })),
  };
}

export async function getPublicTherapist(id: string) {
  const catalog = await getCatalog();
  return catalog.therapists.find((therapist) => therapist.id === id) ?? null;
}
