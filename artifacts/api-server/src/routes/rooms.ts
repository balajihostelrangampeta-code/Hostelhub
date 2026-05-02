import { Router } from "express";
import { db, roomsTable, studentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateRoomBody,
  UpdateRoomBody,
  ListRoomsQueryParams,
  GetRoomParams,
  UpdateRoomParams,
  DeleteRoomParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/rooms", async (req, res) => {
  try {
    const query = ListRoomsQueryParams.parse(req.query);
    const conditions = [];
    if (query.status) conditions.push(eq(roomsTable.status, query.status));

    const rooms = await db
      .select()
      .from(roomsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json(
      rooms.map((r) => ({
        ...r,
        monthlyRent: Number(r.monthlyRent),
        createdAt: r.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list rooms" });
  }
});

router.post("/rooms", async (req, res) => {
  try {
    const body = CreateRoomBody.parse(req.body);
    const [room] = await db
      .insert(roomsTable)
      .values({
        number: body.number,
        type: body.type,
        floor: body.floor,
        capacity: body.capacity,
        monthlyRent: String(body.monthlyRent),
        amenities: body.amenities ?? null,
        status: "available",
        occupied: 0,
      })
      .returning();

    res.status(201).json({
      ...room,
      monthlyRent: Number(room.monthlyRent),
      createdAt: room.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create room" });
  }
});

router.get("/rooms/:id", async (req, res) => {
  try {
    const { id } = GetRoomParams.parse(req.params);
    const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, id));
    if (!room) return res.status(404).json({ error: "Room not found" });

    const students = await db
      .select({
        id: studentsTable.id,
        name: studentsTable.name,
        email: studentsTable.email,
        phone: studentsTable.phone,
        address: studentsTable.address,
        roomId: studentsTable.roomId,
        roomNumber: roomsTable.number,
        joinDate: studentsTable.joinDate,
        status: studentsTable.status,
        emergencyContact: studentsTable.emergencyContact,
        emergencyPhone: studentsTable.emergencyPhone,
        createdAt: studentsTable.createdAt,
      })
      .from(studentsTable)
      .leftJoin(roomsTable, eq(studentsTable.roomId, roomsTable.id))
      .where(eq(studentsTable.roomId, id));

    res.json({
      ...room,
      monthlyRent: Number(room.monthlyRent),
      createdAt: room.createdAt.toISOString(),
      students: students.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get room" });
  }
});

router.put("/rooms/:id", async (req, res) => {
  try {
    const { id } = UpdateRoomParams.parse(req.params);
    const body = UpdateRoomBody.parse(req.body);

    const [existing] = await db.select().from(roomsTable).where(eq(roomsTable.id, id));
    if (!existing) return res.status(404).json({ error: "Room not found" });

    const updateData: Partial<typeof roomsTable.$inferInsert> = {};
    if (body.number !== undefined) updateData.number = body.number;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.floor !== undefined) updateData.floor = body.floor;
    if (body.capacity !== undefined) updateData.capacity = body.capacity;
    if (body.monthlyRent !== undefined) updateData.monthlyRent = String(body.monthlyRent);
    if (body.status !== undefined) updateData.status = body.status;
    if (body.amenities !== undefined) updateData.amenities = body.amenities;

    const [room] = await db.update(roomsTable).set(updateData).where(eq(roomsTable.id, id)).returning();

    res.json({
      ...room,
      monthlyRent: Number(room.monthlyRent),
      createdAt: room.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update room" });
  }
});

router.delete("/rooms/:id", async (req, res) => {
  try {
    const { id } = DeleteRoomParams.parse(req.params);
    const [existing] = await db.select().from(roomsTable).where(eq(roomsTable.id, id));
    if (!existing) return res.status(404).json({ error: "Room not found" });

    await db.delete(roomsTable).where(eq(roomsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete room" });
  }
});

export default router;
