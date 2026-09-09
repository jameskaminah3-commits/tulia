import { Router, type IRouter, type Request } from "express";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  lte,
} from "drizzle-orm";
import {
  db,
  availabilityWindowsTable,
  bookingsTable,
  insertAvailabilityWindowSchema,
  insertBookingSchema,
  therapistsTable,
  treatmentsTable,
  zoneTravelMatrixTable,
} from "@workspace/db";
import {
  CreateBookingBody,
  CreateBookingResponse,
  GetAvailabilityQueryParams,
  GetAvailabilityResponse,
  GetOperationsSummaryResponse,
  ListBookingsQueryParams,
  ListBookingsResponse,
  ListTreatmentsResponse,
  ListTherapistsResponse,
  UpdateBookingStatusBody,
  UpdateBookingStatusParams,
  UpdateBookingStatusResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

type DeliveryMode = "studio" | "home" | "hotel";
type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

type AvailabilitySlotInternal = {
  id: string;
  start: Date;
  end: Date;
  therapistId: string;
  therapistName: string;
  therapistInitials: string;
  locationLabel: string;
  priceKes: number;
};

const SEED_TREATMENTS = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "The Mombasa Reset",
    durationMin: 90,
    priceKes: 7000,
    description:
      "A full-body flow for tired travellers and long coastal days. Slow, restorative, and quietly thorough.",
    modeAvailability: ["studio", "home", "hotel"],
    featured: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Deep Release",
    durationMin: 60,
    priceKes: 5000,
    description:
      "Focused pressure and mobility work for shoulders, back, and legs that need a little more attention.",
    modeAvailability: ["studio", "home", "hotel"],
    featured: true,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Quiet Hour",
    durationMin: 60,
    priceKes: 4200,
    description:
      "A gentler, calming session designed to settle the nervous system and make room for a better evening.",
    modeAvailability: ["studio", "home"],
    featured: false,
  },
] as const;

const SEED_THERAPISTS = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "Amina Hassan",
    initials: "AH",
    rating: 4.9,
    completedSessions: 184,
    status: "available",
    gender: "female",
    isActive: true,
    vettedAt: new Date("2026-01-12T09:00:00.000Z"),
    servesStudio: true,
    servesHome: true,
    servesHotel: true,
    specialties: ["Deep tissue", "Relaxation", "Sports recovery"],
    homeZone: "nyali",
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    name: "Brian Ochieng",
    initials: "BO",
    rating: 4.8,
    completedSessions: 129,
    status: "on_job",
    gender: "male",
    isActive: true,
    vettedAt: new Date("2026-02-03T09:00:00.000Z"),
    servesStudio: true,
    servesHome: true,
    servesHotel: true,
    specialties: ["Deep tissue", "Sports recovery"],
    homeZone: "bamburi",
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    name: "Nadia Ali",
    initials: "NA",
    rating: 5,
    completedSessions: 96,
    status: "available",
    gender: "female",
    isActive: true,
    vettedAt: new Date("2026-03-22T09:00:00.000Z"),
    servesStudio: true,
    servesHome: true,
    servesHotel: false,
    specialties: ["Relaxation", "Prenatal care"],
    homeZone: "island",
  },
] as const;

const ZONES = ["island", "nyali", "bamburi", "shanzu", "mtwapa"] as const;
const TRAVEL_MINUTES: Record<string, number> = {
  "island:island": 15,
  "island:nyali": 25,
  "island:bamburi": 40,
  "island:shanzu": 50,
  "island:mtwapa": 60,
  "nyali:island": 25,
  "nyali:nyali": 15,
  "nyali:bamburi": 20,
  "nyali:shanzu": 30,
  "nyali:mtwapa": 40,
  "bamburi:island": 40,
  "bamburi:nyali": 20,
  "bamburi:bamburi": 15,
  "bamburi:shanzu": 15,
  "bamburi:mtwapa": 25,
  "shanzu:island": 50,
  "shanzu:nyali": 30,
  "shanzu:bamburi": 15,
  "shanzu:shanzu": 15,
  "shanzu:mtwapa": 15,
  "mtwapa:island": 60,
  "mtwapa:nyali": 40,
  "mtwapa:bamburi": 25,
  "mtwapa:shanzu": 15,
  "mtwapa:mtwapa": 15,
};

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateAtMinutes(day: string, minutes: number) {
  const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return new Date(`${day}T${hours}:${mins}:00.000Z`);
}

function addDays(day: string, amount: number) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return dateKey(date);
}

function minutesBetween(left: Date, right: Date) {
  return Math.round((right.getTime() - left.getTime()) / 60000);
}

function travelMinutes(fromZone: string, toZone: string) {
  return TRAVEL_MINUTES[`${fromZone}:${toZone}`] ?? 30;
}

function locationLabel(mode: DeliveryMode, zone?: string | null) {
  if (mode === "studio") return "Mombasa studio · Nyali";
  if (mode === "hotel") return `${zone ?? "Mombasa"} hotel room`;
  return `${zone ?? "Mombasa"} home visit`;
}

function isModeEligible(therapist: typeof SEED_THERAPISTS[number], mode: DeliveryMode) {
  return mode === "studio"
    ? therapist.servesStudio
    : mode === "home"
      ? therapist.servesHome
      : therapist.servesHotel;
}

async function ensureSeedData() {
  await db
    .insert(treatmentsTable)
    .values(
      SEED_TREATMENTS.map((treatment) => ({
        ...treatment,
        modeAvailability: [...treatment.modeAvailability],
      })),
    )
    .onConflictDoNothing();
  await db
    .insert(therapistsTable)
    .values(
      SEED_THERAPISTS.map((therapist) => ({
        ...therapist,
        specialties: [...therapist.specialties],
      })),
    )
    .onConflictDoNothing();
  await db
    .insert(zoneTravelMatrixTable)
    .values(
    Object.entries(TRAVEL_MINUTES).map(([pair, minutes]) => {
      const [fromZone, toZone] = pair.split(":");
      return { fromZone, toZone, minutes };
    }),
    )
    .onConflictDoNothing();

  const today = dateKey(new Date());
  const currentWindows = await db
    .select({ id: availabilityWindowsTable.id })
    .from(availabilityWindowsTable)
    .where(eq(availabilityWindowsTable.availabilityDate, today))
    .limit(1);
  const windows: Array<{
    therapistId: string;
    availabilityDate: string;
    startMin: number;
    endMin: number;
    isBlocked: boolean;
  }> = [];
  for (let dayOffset = 0; dayOffset < 35; dayOffset += 1) {
    const availabilityDate = addDays(today, dayOffset);
    const dayOfWeek = new Date(
      `${availabilityDate}T00:00:00.000Z`,
    ).getUTCDay();
    if (dayOfWeek === 0) continue;
    for (const therapist of SEED_THERAPISTS) {
      const startMin = therapist.id === SEED_THERAPISTS[2].id ? 9 * 60 : 8 * 60;
      const endMin = therapist.id === SEED_THERAPISTS[1].id ? 18 * 60 : 19 * 60;
      const parsedWindow = insertAvailabilityWindowSchema.parse({
          therapistId: therapist.id,
          availabilityDate,
          startMin,
          endMin,
          isBlocked: false,
        });
      windows.push({ ...parsedWindow, isBlocked: parsedWindow.isBlocked ?? false });
    }
  }
  if (currentWindows.length === 0) {
    await db.insert(availabilityWindowsTable).values(windows);
  }

  const sampleDate = addDays(today, 0);
  const sampleStart = dateAtMinutes(sampleDate, 10 * 60);
  const sampleEnd = dateAtMinutes(sampleDate, 11 * 60 + 30);
  const sampleBooking = await db
    .select({ id: bookingsTable.id })
    .from(bookingsTable)
    .where(eq(bookingsTable.reference, "MW-2401"))
    .limit(1);
  if (sampleBooking.length === 0) {
    await db.insert(bookingsTable).values(
      insertBookingSchema.parse({
      reference: "MW-2401",
      treatmentId: SEED_TREATMENTS[0].id,
      therapistId: SEED_THERAPISTS[0].id,
      clientName: "Daniel Mwangi",
      clientPhone: "0712 456 890",
      mode: "home",
      scheduledDate: sampleDate,
      serviceStart: sampleStart,
      serviceEnd: sampleEnd,
      blockedStart: sampleStart,
      blockedEnd: new Date(sampleEnd.getTime() + 15 * 60 * 1000),
      zone: "nyali",
      addressLine: "Links Road, Nyali",
      priceKes: SEED_TREATMENTS[0].priceKes,
      status: "confirmed",
      origin: "client_web",
      }),
    );
  }
}

async function listBookingRows() {
  return db
    .select({
      booking: bookingsTable,
      treatment: treatmentsTable,
      therapist: therapistsTable,
    })
    .from(bookingsTable)
    .innerJoin(treatmentsTable, eq(bookingsTable.treatmentId, treatmentsTable.id))
    .innerJoin(therapistsTable, eq(bookingsTable.therapistId, therapistsTable.id))
    .orderBy(desc(bookingsTable.serviceStart));
}

function serializeBooking(row: Awaited<ReturnType<typeof listBookingRows>>[number]) {
  return {
    id: row.booking.id,
    reference: row.booking.reference,
    treatmentName: row.treatment.name,
    therapistName: row.therapist.name,
    clientName: row.booking.clientName,
    clientPhone: row.booking.clientPhone,
    mode: row.booking.mode,
    date: new Date(`${row.booking.scheduledDate}T00:00:00.000Z`),
    start: row.booking.serviceStart,
    end: row.booking.serviceEnd,
    priceKes: row.booking.priceKes,
    status: row.booking.status,
    locationLabel: locationLabel(row.booking.mode, row.booking.zone),
    createdAt: row.booking.createdAt,
  };
}

async function findAvailableSlots(
  day: string,
  treatmentId: string,
  mode: DeliveryMode,
  zone: string | null | undefined,
  genderPref: string | null | undefined,
): Promise<{
  treatment: typeof treatmentsTable.$inferSelect | null;
  slots: AvailabilitySlotInternal[];
  matchedTherapists: number;
}> {
  const treatment = (
    await db
      .select()
      .from(treatmentsTable)
      .where(
        and(
          eq(treatmentsTable.id, treatmentId),
          inArray(
            treatmentsTable.id,
            SEED_TREATMENTS.map((seedTreatment) => seedTreatment.id),
          ),
        ),
      )
      .limit(1)
  )[0];
  if (!treatment) return { treatment: null, slots: [], matchedTherapists: 0 };

  const therapists = await db
    .select()
    .from(therapistsTable)
    .where(
      and(
        eq(therapistsTable.isActive, true),
        inArray(
          therapistsTable.id,
          SEED_THERAPISTS.map((seedTherapist) => seedTherapist.id),
        ),
      ),
    );
  const windows = await db
    .select()
    .from(availabilityWindowsTable)
    .where(
      and(
        eq(availabilityWindowsTable.availabilityDate, day),
        eq(availabilityWindowsTable.isBlocked, false),
      ),
    );
  const bookings = await db
    .select()
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.scheduledDate, day),
        inArray(bookingsTable.status, [
          "pending_payment",
          "confirmed",
          "in_progress",
        ]),
      ),
    );

  const matched = therapists.filter((therapist) => {
    const modeEligible =
      mode === "studio"
        ? therapist.servesStudio
        : mode === "home"
          ? therapist.servesHome
          : therapist.servesHotel;
    return (
      modeEligible &&
      therapist.vettedAt !== null &&
      (!genderPref || therapist.gender === genderPref) &&
      treatment.modeAvailability.includes(mode)
    );
  });
  const slots: AvailabilitySlotInternal[] = [];

  for (const therapist of matched) {
    const therapistWindows = windows.filter(
      (window) => window.therapistId === therapist.id,
    );
    const therapistBookings = bookings.filter(
      (booking) => booking.therapistId === therapist.id,
    );
    for (const window of therapistWindows) {
      for (
        let startMin = window.startMin;
        startMin + treatment.durationMin <= window.endMin;
        startMin += 15
      ) {
        const start = dateAtMinutes(day, startMin);
        const end = new Date(start.getTime() + treatment.durationMin * 60 * 1000);
        const requestedZone = mode === "studio" ? "island" : zone ?? "nyali";
        const overlapping = therapistBookings.some(
          (booking) =>
            booking.blockedStart < end && booking.blockedEnd > start,
        );
        if (overlapping) continue;

        const previousBooking = therapistBookings
          .filter((booking) => booking.serviceEnd <= start)
          .sort(
            (left, right) =>
              right.serviceEnd.getTime() - left.serviceEnd.getTime(),
          )[0];
        const originZone = previousBooking?.zone ?? therapist.homeZone;
        const travel = travelMinutes(originZone, requestedZone);
        if (
          previousBooking &&
          minutesBetween(previousBooking.serviceEnd, start) <
            travel + 15
        ) {
          continue;
        }

        slots.push({
          id: `${therapist.id}-${start.toISOString()}`,
          start,
          end,
          therapistId: therapist.id,
          therapistName: therapist.name,
          therapistInitials: therapist.initials,
          locationLabel: locationLabel(mode, zone),
          priceKes: treatment.priceKes,
        });
      }
    }
  }

  return { treatment, slots: slots.slice(0, 48), matchedTherapists: matched.length };
}

function parseBookingRequest(req: Request) {
  return CreateBookingBody.parse(req.body);
}

router.get("/treatments", async (_req, res, next) => {
  try {
    await ensureSeedData();
    const data = await db
      .select()
      .from(treatmentsTable)
      .where(
        inArray(
          treatmentsTable.id,
          SEED_TREATMENTS.map((seedTreatment) => seedTreatment.id),
        ),
      );
    res.json(
      ListTreatmentsResponse.parse(
        data.map((treatment) => ({
          ...treatment,
          modeAvailability: treatment.modeAvailability as DeliveryMode[],
        })),
      ),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/therapists", async (_req, res, next) => {
  try {
    await ensureSeedData();
    const data = await db
      .select()
      .from(therapistsTable)
      .where(
        and(
          eq(therapistsTable.isActive, true),
          inArray(
            therapistsTable.id,
            SEED_THERAPISTS.map((seedTherapist) => seedTherapist.id),
          ),
        ),
      )
      .orderBy(desc(therapistsTable.rating));
    res.json(
      ListTherapistsResponse.parse(
        data.map((therapist) => ({
          ...therapist,
          status: therapist.status as "available" | "on_job" | "offline",
        })),
      ),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/availability", async (req, res, next) => {
  try {
    await ensureSeedData();
    const query = GetAvailabilityQueryParams.parse({
      ...req.query,
      date: new Date(String(req.query.date)),
    });
    const day = dateKey(query.date);
    const result = await findAvailableSlots(
      day,
      query.treatmentId,
      query.mode,
      query.zone,
      query.genderPref,
    );
    res.json(
      GetAvailabilityResponse.parse({
        date: query.date,
        slots: result.slots,
        matchedTherapists: result.matchedTherapists,
      }),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/bookings", async (req, res, next) => {
  try {
    await ensureSeedData();
    const query = ListBookingsQueryParams.parse(req.query);
    const rows = await listBookingRows();
    const data = rows
      .filter((row) =>
        query.scope === "client"
          ? row.booking.status !== "cancelled"
          : true,
      )
      .map(serializeBooking);
    res.json(ListBookingsResponse.parse(data));
  } catch (error) {
    next(error);
  }
});

router.post("/bookings", async (req, res, next) => {
  try {
    await ensureSeedData();
    const body = parseBookingRequest(req);
    const day = dateKey(body.date);
    const available = await findAvailableSlots(
      day,
      body.treatmentId,
      body.mode,
      body.zone,
      null,
    );
    const selected = available.slots.find(
      (slot) =>
        slot.therapistId === body.therapistId &&
        slot.start.getTime() === body.start.getTime(),
    );
    if (!selected || !available.treatment) {
      res.status(409).json({ error: "That time has just been taken. Please choose another slot." });
      return;
    }

    const reference = `MW-${Math.floor(1000 + Math.random() * 9000)}`;
    await db.insert(bookingsTable).values(
      insertBookingSchema.parse({
        reference,
        treatmentId: body.treatmentId,
        therapistId: body.therapistId,
        clientName: body.clientName,
        clientPhone: body.clientPhone,
        mode: body.mode,
        scheduledDate: day,
        serviceStart: selected.start,
        serviceEnd: selected.end,
        blockedStart: selected.start,
        blockedEnd: new Date(selected.end.getTime() + 15 * 60 * 1000),
        zone: body.zone ?? null,
        addressLine: body.addressLine ?? null,
        hotelName: body.hotelName ?? null,
        hotelRoomNo: body.hotelRoomNo ?? null,
        notes: body.notes ?? null,
        priceKes: available.treatment.priceKes,
        status: "pending_payment",
        origin: "client_web",
      }),
    );

    const rows = await listBookingRows();
    const created = rows.find((row) => row.booking.reference === reference);
    if (!created) throw new Error("Booking was created but could not be reloaded");
    res.status(201).json(CreateBookingResponse.parse(serializeBooking(created)));
  } catch (error) {
    next(error);
  }
});

router.patch("/bookings/:id/status", async (req, res, next) => {
  try {
    await ensureSeedData();
    const params = UpdateBookingStatusParams.parse(req.params);
    const body = UpdateBookingStatusBody.parse(req.body);
    const updated = await db
      .update(bookingsTable)
      .set({ status: body.status as BookingStatus })
      .where(eq(bookingsTable.id, params.id))
      .returning({ id: bookingsTable.id });
    if (updated.length === 0) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    const row = (await listBookingRows()).find(
      (candidate) => candidate.booking.id === params.id,
    );
    if (!row) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    res.json(UpdateBookingStatusResponse.parse(serializeBooking(row)));
  } catch (error) {
    next(error);
  }
});

router.get("/operations/summary", async (_req, res, next) => {
  try {
    await ensureSeedData();
    const rows = await listBookingRows();
    const today = dateKey(new Date());
    const todaysBookings = rows.filter(
      (row) =>
        row.booking.scheduledDate === today &&
        !["cancelled", "no_show"].includes(row.booking.status),
    );
    const statusCounts = rows.reduce<Record<string, number>>((counts, row) => {
      counts[row.booking.status] = (counts[row.booking.status] ?? 0) + 1;
      return counts;
    }, {});
    const nextBooking = todaysBookings
      .filter((row) => row.booking.serviceStart >= new Date())
      .sort(
        (left, right) =>
          left.booking.serviceStart.getTime() -
          right.booking.serviceStart.getTime(),
      )[0];
    const data = {
      todayBookings: todaysBookings.length,
      pendingPayments: rows.filter(
        (row) => row.booking.status === "pending_payment",
      ).length,
      liveTherapists: (
        await db
          .select({ id: therapistsTable.id })
          .from(therapistsTable)
          .where(
            and(
              eq(therapistsTable.isActive, true),
              inArray(therapistsTable.status, ["available", "on_job"]),
              inArray(
                therapistsTable.id,
                SEED_THERAPISTS.map((seedTherapist) => seedTherapist.id),
              ),
            ),
          )
      ).length,
      todaysRevenueKes: todaysBookings.reduce(
        (total, row) => total + row.booking.priceKes,
        0,
      ),
      nextBooking: nextBooking ? serializeBooking(nextBooking) : null,
      statusCounts,
    };
    res.json(GetOperationsSummaryResponse.parse(data));
  } catch (error) {
    next(error);
  }
});

router.use((error: unknown, _req: Request, res: any, _next: unknown) => {
  logger.error({ error }, "Wellness route failed");
  if (res.headersSent) return;
  res.status(400).json({ error: "We couldn't complete that request." });
});

export default router;