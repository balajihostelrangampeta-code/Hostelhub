import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roomsTable = pgTable("rooms", {
  id: serial("id").primaryKey(),
  number: text("number").notNull().unique(),
  type: text("type").notNull().default("single"),
  floor: integer("floor").notNull().default(1),
  capacity: integer("capacity").notNull().default(1),
  occupied: integer("occupied").notNull().default(0),
  monthlyRent: numeric("monthly_rent", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("available"),
  amenities: text("amenities"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRoomSchema = createInsertSchema(roomsTable).omit({ id: true, createdAt: true, occupied: true });
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof roomsTable.$inferSelect;
