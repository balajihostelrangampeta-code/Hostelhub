import { useState } from "react";
import { useGetDashboardStats, useListPayments, useListStudents } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, Home, AlertCircle, CreditCard, DollarSign,
  AlertTriangle, ChevronRight, Phone, Mail, UserCheck,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const THRESHOLDS = [
  { label: "3 days", value: 3 },
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
];

function daysOverdue(dueDateStr: string): number {
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Dashboard() {
  const [threshold, setThreshold] = useState(7);

  const { data: stats, isLoading, isError } = useGetDashboardStats();
  const { data: overduePayments = [] } = useListPayments(
    { status: "overdue" },
    { query: { enabled: true } }
  );
  const { data: students = [] } = useListStudents(undefined, { query: { enabled: true } });

  const studentMap = students.reduce<Record<number, { phone: string; email: string; emergencyPhone?: string | null; emergencyContact?: string | null }>>(
    (acc, s) => {
      acc[s.id] = { phone: s.phone, email: s.email, emergencyPhone: s.emergencyPhone, emergencyContact: s.emergencyContact };
      return acc;
    },
    {}
  );

  const filteredOverdue = overduePayments.filter((p) => daysOverdue(p.dueDate) >= threshold);

  const overdueByStudent = filteredOverdue.reduce<
    Record<number, {
      studentId: number;
      studentName: string;
      count: number;
      total: number;
      oldest: string;
      worstDays: number;
    }>
  >((acc, p) => {
    const days = daysOverdue(p.dueDate);
    if (!acc[p.studentId]) {
      acc[p.studentId] = {
        studentId: p.studentId,
        studentName: p.studentName ?? "Unknown",
        count: 0,
        total: 0,
        oldest: p.dueDate,
        worstDays: days,
      };
    }
    acc[p.studentId].count += 1;
    acc[p.studentId].total += p.amount;
    if (p.dueDate < acc[p.studentId].oldest) {
      acc[p.studentId].oldest = p.dueDate;
      acc[p.studentId].worstDays = days;
    }
    return acc;
  }, {});

  const overdueStudents = Object.values(overdueByStudent).sort((a, b) => b.worstDays - a.worstDays);

  if (isLoading) {
    return <div className="space-y-6">
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse h-32" />
        ))}
      </div>
    </div>;
  }

  if (isError || !stats) {
    return <div className="text-destructive">Failed to load dashboard statistics.</div>;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">Here is what is happening in the hostel today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.activeStudents} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rooms Status</CardTitle>
            <Home className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRooms}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.availableRooms} available, {stats.occupiedRooms} occupied
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payments</CardTitle>
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingPayments}</div>
            <p className="text-xs text-destructive mt-1">{stats.overduePayments} overdue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Amount</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(stats.overdueAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Payment Alerts */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            <h2 className="text-lg font-semibold">Overdue Reminders</h2>
            {overdueStudents.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                {overdueStudents.length} student{overdueStudents.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground mr-0.5 shrink-0">Overdue by:</span>
            {THRESHOLDS.map((t) => (
              <button
                key={t.value}
                onClick={() => setThreshold(t.value)}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                  threshold === t.value
                    ? "bg-destructive text-destructive-foreground border-destructive"
                    : "bg-background text-muted-foreground border-border hover:border-destructive/50 hover:text-destructive"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {overdueStudents.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted/20 flex items-center gap-3 px-4 py-5 text-sm text-muted-foreground">
            <UserCheck className="w-5 h-5 shrink-0 text-green-600" />
            {overduePayments.length === 0
              ? "No overdue payments. All caught up!"
              : `No students overdue by more than ${threshold} days.`}
          </div>
        ) : (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 overflow-hidden">
            {overdueStudents.map((s, idx) => {
              const contact = studentMap[s.studentId];
              const phone = contact?.phone;
              const email = contact?.email;
              const emergencyPhone = contact?.emergencyPhone;
              const emergencyName = contact?.emergencyContact;

              return (
                <div
                  key={s.studentId}
                  className={`px-4 py-3 ${idx !== overdueStudents.length - 1 ? "border-b border-destructive/10" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/students/${s.studentId}`}>
                        <p className="font-semibold text-sm hover:underline cursor-pointer truncate">
                          {s.studentName}
                        </p>
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                        <span className={`text-xs font-medium ${s.worstDays >= 30 ? "text-destructive" : s.worstDays >= 14 ? "text-orange-600" : "text-amber-600"}`}>
                          {s.worstDays} day{s.worstDays !== 1 ? "s" : ""} overdue
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {s.count} installment{s.count !== 1 ? "s" : ""} · due {formatDate(s.oldest)}
                        </span>
                      </div>

                      {/* Contact actions */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {phone && (
                          <a
                            href={`tel:${phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-background border border-border hover:border-primary hover:text-primary transition-colors"
                          >
                            <Phone className="w-3 h-3" />
                            {phone}
                          </a>
                        )}
                        {email && (
                          <a
                            href={`mailto:${email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-background border border-border hover:border-primary hover:text-primary transition-colors"
                          >
                            <Mail className="w-3 h-3" />
                            <span className="max-w-[140px] truncate">{email}</span>
                          </a>
                        )}
                        {emergencyPhone && (
                          <a
                            href={`tel:${emergencyPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors"
                            title={`Emergency: ${emergencyName ?? "Contact"}`}
                          >
                            <Phone className="w-3 h-3" />
                            {emergencyName ? `${emergencyName}` : emergencyPhone}
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <p className="text-sm font-bold text-destructive">{formatCurrency(s.total)}</p>
                      <Link href={`/students/${s.studentId}`}>
                        <ChevronRight className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {overdueStudents.length > 0 && (
          <div className="flex justify-end mt-2">
            <Link href="/payments?status=overdue">
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground">
                View all overdue payments
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Recent Students</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-4">
              {stats.recentStudents.map((student) => (
                <Link key={student.id} href={`/students/${student.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{student.roomNumber || "No Room"}</p>
                      <Badge variant={student.status === "active" ? "default" : "secondary"}>
                        {student.status}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
              {stats.recentStudents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">No recent students</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-4">
              {stats.recentPayments.map((payment) => (
                <Link key={payment.id} href={`/students/${payment.studentId}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                    <div>
                      <p className="font-medium">{payment.studentName}</p>
                      <p className="text-xs text-muted-foreground">{payment.description || payment.month}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatCurrency(payment.amount)}</p>
                      <Badge
                        variant={
                          payment.status === "paid" ? "outline" :
                          payment.status === "overdue" ? "destructive" : "secondary"
                        }
                        className={payment.status === "paid" ? "text-green-600 border-green-600/20 bg-green-50/50" : ""}
                      >
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
              {stats.recentPayments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">No recent payments</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
