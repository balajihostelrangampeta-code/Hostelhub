import { Router } from "express";
import { db, paymentsTable, studentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreatePaymentBody,
  UpdatePaymentBody,
  ListPaymentsQueryParams,
  GetPaymentParams,
  UpdatePaymentParams,
  DeletePaymentParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/payments", async (req, res) => {
  try {
    const query = ListPaymentsQueryParams.parse(req.query);
    const conditions = [];
    if (query.studentId) conditions.push(eq(paymentsTable.studentId, query.studentId));
    if (query.status) conditions.push(eq(paymentsTable.status, query.status));

    const payments = await db
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
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json(
      payments.map((p) => ({
        ...p,
        studentName: p.studentName ?? "Unknown",
        amount: Number(p.amount),
        createdAt: p.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list payments" });
  }
});

router.post("/payments", async (req, res) => {
  try {
    const body = CreatePaymentBody.parse(req.body);

    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, body.studentId));
    if (!student) return res.status(404).json({ error: "Student not found" });

    const today = new Date().toISOString().split("T")[0];
    const isOverdue = body.dueDate < today;

    const [payment] = await db
      .insert(paymentsTable)
      .values({
        studentId: body.studentId,
        amount: String(body.amount),
        dueDate: body.dueDate,
        status: isOverdue ? "overdue" : "pending",
        description: body.description ?? null,
        month: body.month ?? null,
      })
      .returning();

    res.status(201).json({
      ...payment,
      studentName: student.name,
      amount: Number(payment.amount),
      createdAt: payment.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create payment" });
  }
});

router.get("/payments/:id", async (req, res) => {
  try {
    const { id } = GetPaymentParams.parse(req.params);
    const [payment] = await db
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
      .where(eq(paymentsTable.id, id));

    if (!payment) return res.status(404).json({ error: "Payment not found" });

    res.json({
      ...payment,
      studentName: payment.studentName ?? "Unknown",
      amount: Number(payment.amount),
      createdAt: payment.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get payment" });
  }
});

router.put("/payments/:id", async (req, res) => {
  try {
    const { id } = UpdatePaymentParams.parse(req.params);
    const body = UpdatePaymentBody.parse(req.body);

    const [existing] = await db
      .select({
        id: paymentsTable.id,
        studentId: paymentsTable.studentId,
        studentName: studentsTable.name,
      })
      .from(paymentsTable)
      .leftJoin(studentsTable, eq(paymentsTable.studentId, studentsTable.id))
      .where(eq(paymentsTable.id, id));

    if (!existing) return res.status(404).json({ error: "Payment not found" });

    const updateData: Partial<typeof paymentsTable.$inferInsert> = {};
    if (body.amount !== undefined) updateData.amount = String(body.amount);
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate;
    if (body.paidDate !== undefined) updateData.paidDate = body.paidDate;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.month !== undefined) updateData.month = body.month;

    if (body.status === "paid" && !body.paidDate) {
      updateData.paidDate = new Date().toISOString().split("T")[0];
    }

    const [payment] = await db
      .update(paymentsTable)
      .set(updateData)
      .where(eq(paymentsTable.id, id))
      .returning();

    res.json({
      ...payment,
      studentName: existing.studentName ?? "Unknown",
      amount: Number(payment.amount),
      createdAt: payment.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update payment" });
  }
});

router.delete("/payments/:id", async (req, res) => {
  try {
    const { id } = DeletePaymentParams.parse(req.params);
    const [existing] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, id));
    if (!existing) return res.status(404).json({ error: "Payment not found" });

    await db.delete(paymentsTable).where(eq(paymentsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete payment" });
  }
});

export default router;
