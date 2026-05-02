import { Router } from "express";
import { db, studentsTable, roomsTable, paymentsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/dashboard", async (req, res) => {
  try {
    const [studentStats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        active: sql<number>`SUM(CASE WHEN ${studentsTable.status} = 'active' THEN 1 ELSE 0 END)`,
      })
      .from(studentsTable);

    const [roomStats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        available: sql<number>`SUM(CASE WHEN ${roomsTable.status} = 'available' THEN 1 ELSE 0 END)`,
        occupied: sql<number>`SUM(CASE WHEN ${roomsTable.status} = 'full' THEN 1 ELSE 0 END)`,
      })
      .from(roomsTable);

    const [paymentStats] = await db
      .select({
        totalCollected: sql<number>`COALESCE(SUM(CASE WHEN ${paymentsTable.status} = 'paid' THEN ${paymentsTable.amount} ELSE 0 END), 0)`,
        pending: sql<number>`SUM(CASE WHEN ${paymentsTable.status} = 'pending' THEN 1 ELSE 0 END)`,
        overdue: sql<number>`SUM(CASE WHEN ${paymentsTable.status} = 'overdue' THEN 1 ELSE 0 END)`,
        overdueAmount: sql<number>`COALESCE(SUM(CASE WHEN ${paymentsTable.status} = 'overdue' THEN ${paymentsTable.amount} ELSE 0 END), 0)`,
      })
      .from(paymentsTable);

    const recentPayments = await db
      .select({
        id: paymentsTable.id,
        studentId: paymentsTable.studentId,
        studentName: studentsTable.name,
        amount: paymentsTable.amount,
        dueDate: paymentsTable.dueDate,
        paidDate: paymentsTable.paidDate,
        status: paymentsTable.status,
        description: paymentsTable.description,
        month: paymentsTable.month,
        createdAt: paymentsTable.createdAt,
      })
      .from(paymentsTable)
      .leftJoin(studentsTable, eq(paymentsTable.studentId, studentsTable.id))
      .orderBy(sql`${paymentsTable.createdAt} DESC`)
      .limit(5);

    const recentStudents = await db
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
      .orderBy(sql`${studentsTable.createdAt} DESC`)
      .limit(5);

    res.json({
      totalStudents: Number(studentStats.total) || 0,
      activeStudents: Number(studentStats.active) || 0,
      totalRooms: Number(roomStats.total) || 0,
      availableRooms: Number(roomStats.available) || 0,
      occupiedRooms: Number(roomStats.occupied) || 0,
      totalPaymentsCollected: Number(paymentStats.totalCollected) || 0,
      pendingPayments: Number(paymentStats.pending) || 0,
      overduePayments: Number(paymentStats.overdue) || 0,
      overdueAmount: Number(paymentStats.overdueAmount) || 0,
      recentPayments: recentPayments.map((p) => ({
        ...p,
        studentName: p.studentName ?? "Unknown",
        amount: Number(p.amount),
        createdAt: p.createdAt.toISOString(),
      })),
      recentStudents: recentStudents.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get dashboard stats" });
  }
});

export default router;
