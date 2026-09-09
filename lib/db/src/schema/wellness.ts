import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const deliveryModeEnum = pgEnum("delivery_mode", [
  "studio",
  "home",
  "hotel",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending_payment",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
]);

export const treatmentsTable = pgTable("treatments", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  durationMin: integer("duration_min").notNull(),
  priceKes: integer("price_kes").notNull(),
  description: text("description").notNull(),
  modeAvailability: text("mode_availability").array().notNull(),
  featured: boolean("featured").notNull().default(false),
});

export const therapistsTable = pgTable("therapists", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  rating: real("rating").notNull().default(5),
  completedSessions: integer("completed_sessions").notNull().default(0),
  status: text("status").notNull().default("available"),
  gender: text("gender").notNull().default("female"),
  isActive: boolean("is_active").notNull().default(true),
  vettedAt: timestamp("vetted_at", { withTimezone: true }),
  servesStudio: boolean("serves_studio").notNull().default(true),
  servesHome: boolean("serves_home").notNull().default(true),
  servesHotel: boolean("serves_hotel").notNull().default(true),
  specialties: text("specialties").array().notNull(),
  homeZone: text("home_zone").notNull(),
});

export const availabilityWindowsTable = pgTable("availability_windows", {
  id: uuid("id").defaultRandom().primaryKey(),
  therapistId: uuid("therapist_id")
    .notNull()
    .references(() => therapistsTable.id, { onDelete: "cascade" }),
  availabilityDate: date("availability_date", { mode: "string" }).notNull(),
  startMin: integer("start_min").notNull(),
  endMin: integer("end_min").notNull(),
  isBlocked: boolean("is_blocked").notNull().default(false),
});

export const zoneTravelMatrixTable = pgTable(
  "zone_travel_matrix",
  {
    fromZone: text("from_zone").notNull(),
    toZone: text("to_zone").notNull(),
    minutes: integer("minutes").notNull(),
  },
  (table) => [unique("zone_travel_pair").on(table.fromZone, table.toZone)],
);

export const bookingsTable = pgTable("bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  reference: text("reference").notNull().unique(),
  treatmentId: uuid("treatment_id")
    .notNull()
    .references(() => treatmentsTable.id),
  therapistId: uuid("therapist_id")
    .notNull()
    .references(() => therapistsTable.id),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone").notNull(),
  mode: deliveryModeEnum("mode").notNull(),
  scheduledDate: date("scheduled_date", { mode: "string" }).notNull(),
  serviceStart: timestamp("service_start", { withTimezone: true }).notNull(),
  serviceEnd: timestamp("service_end", { withTimezone: true }).notNull(),
  blockedStart: timestamp("blocked_start", { withTimezone: true }).notNull(),
  blockedEnd: timestamp("blocked_end", { withTimezone: true }).notNull(),
  zone: text("zone"),
  addressLine: text("address_line"),
  hotelName: text("hotel_name"),
  hotelRoomNo: text("hotel_room_no"),
  notes: text("notes"),
  priceKes: integer("price_kes").notNull(),
  status: bookingStatusEnum("status").notNull().default("pending_payment"),
  origin: text("origin").notNull().default("client_web"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertTreatmentSchema = createInsertSchema(treatmentsTable).omit({
  id: true,
});
export const insertTherapistSchema = createInsertSchema(therapistsTable).omit({
  id: true,
});
export const insertAvailabilityWindowSchema = createInsertSchema(
  availabilityWindowsTable,
).omit({ id: true });
export const insertBookingSchema = createInsertSchema(bookingsTable).omit({
  id: true,
  createdAt: true,
});

export type Treatment = typeof treatmentsTable.$inferSelect;
export type Therapist = typeof therapistsTable.$inferSelect;
export type AvailabilityWindow = typeof availabilityWindowsTable.$inferSelect;
export type Booking = typeof bookingsTable.$inferSelect;
export type InsertTreatment = z.infer<typeof insertTreatmentSchema>;
export type InsertTherapist = z.infer<typeof insertTherapistSchema>;
export type InsertAvailabilityWindow = z.infer<
  typeof insertAvailabilityWindowSchema
>;
export type InsertBooking = z.infer<typeof insertBookingSchema>;