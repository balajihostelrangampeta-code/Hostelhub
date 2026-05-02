import { Router } from "express";
import { db, studentsTable, roomsTable } from "@workspace/db";
import { eq, ilike, and, sql } from "drizzle-orm";
import {
  CreateStudentBody,
  UpdateStudentBody,
  ListStudentsQueryParams,
  GetStudentParams,
  UpdateStudentParams,
  DeleteStudentParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/students", async (req, res) => {
  try {
    const query = ListStudentsQueryParams.parse(req.query);
    const conditions = [];

    if (query.roomId) conditions.push(eq(studentsTable.roomId, query.roomId));
    if (query.status) conditions.push(eq(studentsTable.status, query.status));
    if (query.search) {
      conditions.push(
        sql`(${studentsTable.name} ILIKE ${`%${query.search}%`} OR ${studentsTable.email} ILIKE ${`%${query.search}%`} OR ${studentsTable.phone} ILIKE ${`%${query.search}%`})`
      );
    }

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
        education: studentsTable.education,
        studyYear: studentsTable.studyYear,
        createdAt: studentsTable.createdAt,
      })
      .from(studentsTable)
      .leftJoin(roomsTable, eq(studentsTable.roomId, roomsTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json(
      students.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list students" });
  }
});

router.post("/students", async (req, res) => {
  try {
    const body = CreateStudentBody.parse(req.body);
    const [student] = await db
      .insert(studentsTable)
      .values({
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address,
        roomId: body.roomId ?? null,
        joinDate: body.joinDate,
        emergencyContact: body.emergencyContact ?? null,
        emergencyPhone: body.emergencyPhone ?? null,
        education: body.education ?? null,
        studyYear: body.studyYear ?? null,
      })
      .returning();

    if (body.roomId) {
      await db
        .update(roomsTable)
        .set({ occupied: sql`${roomsTable.occupied} + 1` })
        .where(eq(roomsTable.id, body.roomId));
      await updateRoomStatus(body.roomId);
    }

    const [result] = await db
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
        education: studentsTable.education,
        studyYear: studentsTable.studyYear,
        createdAt: studentsTable.createdAt,
      })
      .from(studentsTable)
      .leftJoin(roomsTable, eq(studentsTable.roomId, roomsTable.id))
      .where(eq(studentsTable.id, student.id));

    res.status(201).json({ ...result, createdAt: result.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create student" });
  }
});

router.get("/students/:id", async (req, res) => {
  try {
    const { id } = GetStudentParams.parse(req.params);
    const [student] = await db
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
        education: studentsTable.education,
        studyYear: studentsTable.studyYear,
        createdAt: studentsTable.createdAt,
      })
      .from(studentsTable)
      .leftJoin(roomsTable, eq(studentsTable.roomId, roomsTable.id))
      .where(eq(studentsTable.id, id));

    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json({ ...student, createdAt: student.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get student" });
  }
});

router.put("/students/:id", async (req, res) => {
  try {
    const { id } = UpdateStudentParams.parse(req.params);
    const body = UpdateStudentBody.parse(req.body);

    const [existing] = await db.select().from(studentsTable).where(eq(studentsTable.id, id));
    if (!existing) return res.status(404).json({ error: "Student not found" });

    const oldRoomId = existing.roomId;
    const newRoomId = body.roomId !== undefined ? body.roomId : oldRoomId;

    const updateData: Partial<typeof studentsTable.$inferInsert> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.joinDate !== undefined) updateData.joinDate = body.joinDate;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.emergencyContact !== undefined) updateData.emergencyContact = body.emergencyContact;
    if (body.emergencyPhone !== undefined) updateData.emergencyPhone = body.emergencyPhone;
    if (body.education !== undefined) updateData.education = body.education;
    if (body.studyYear !== undefined) updateData.studyYear = body.studyYear;
    if (body.roomId !== undefined) updateData.roomId = body.roomId;

    await db.update(studentsTable).set(updateData).where(eq(studentsTable.id, id));

    if (oldRoomId !== newRoomId) {
      if (oldRoomId) {
        await db
          .update(roomsTable)
          .set({ occupied: sql`GREATEST(0, ${roomsTable.occupied} - 1)` })
          .where(eq(roomsTable.id, oldRoomId));
        await updateRoomStatus(oldRoomId);
      }
      if (newRoomId) {
        await db
          .update(roomsTable)
          .set({ occupied: sql`${roomsTable.occupied} + 1` })
          .where(eq(roomsTable.id, newRoomId));
        await updateRoomStatus(newRoomId);
      }
    }

    const [result] = await db
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
        education: studentsTable.education,
        studyYear: studentsTable.studyYear,
        createdAt: studentsTable.createdAt,
      })
      .from(studentsTable)
      .leftJoin(roomsTable, eq(studentsTable.roomId, roomsTable.id))
      .where(eq(studentsTable.id, id));

    res.json({ ...result, createdAt: result.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update student" });
  }
});

router.delete("/students/:id", async (req, res) => {
  try {
    const { id } = DeleteStudentParams.parse(req.params);
    const [existing] = await db.select().from(studentsTable).where(eq(studentsTable.id, id));
    if (!existing) return res.status(404).json({ error: "Student not found" });

    if (existing.roomId) {
      await db
        .update(roomsTable)
        .set({ occupied: sql`GREATEST(0, ${roomsTable.occupied} - 1)` })
        .where(eq(roomsTable.id, existing.roomId));
      await updateRoomStatus(existing.roomId);
    }

    await db.delete(studentsTable).where(eq(studentsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete student" });
  }
});

async function updateRoomStatus(roomId: number) {
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, roomId));
  if (!room) return;
  if (room.status === "maintenance") return;
  const newStatus = room.occupied >= room.capacity ? "full" : "available";
  await db.update(roomsTable).set({ status: newStatus }).where(eq(roomsTable.id, roomId));
}

export default router;
