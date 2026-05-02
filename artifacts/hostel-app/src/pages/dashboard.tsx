import { useGetDashboardStats, useListPayments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Home, AlertCircle, CreditCard, DollarSign, AlertTriangle, ChevronRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: stats, isLoading, isError } = useGetDashboardStats();
  const { data: overduePayments = [] } = useListPayments(
    { status: "overdue" },
    { query: { enabled: true } }
  );

  const overdueByStudent = overduePayments.reduce<
    Record<number, { studentId: number; studentName: string; count: number; total: number; oldest: string }>
  >((acc, p) => {
    if (!acc[p.studentId]) {
      acc[p.studentId] = { studentId: p.studentId, studentName: p.studentName ?? "Unknown", count: 0, total: 0, oldest: p.dueDate };
    }
    acc[p.studentId].count += 1;
    acc[p.studentId].total += p.amount;
    if (p.dueDate < acc[p.studentId].oldest) acc[p.studentId].oldest = p.dueDate;
    return acc;
  }, {});
  const overdueStudents = Object.values(overdueByStudent).sort((a, b) => a.oldest.localeCompare(b.oldest));

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

      {/* Overdue Alert */}
      {overdueStudents.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h2 className="text-lg font-semibold">Overdue Payments</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                {overdueStudents.length} student{overdueStudents.length !== 1 ? "s" : ""}
              </span>
            </div>
            <Link href="/payments?status=overdue">
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground">
                View all
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 overflow-hidden">
            {overdueStudents.map((s, idx) => (
              <Link key={s.studentId} href={`/students/${s.studentId}`}>
                <div
                  className={`flex items-center justify-between px-4 py-3 hover:bg-destructive/10 transition-colors cursor-pointer ${idx !== overdueStudents.length - 1 ? "border-b border-destructive/10" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{s.studentName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {s.count} installment{s.count !== 1 ? "s" : ""} · overdue since {s.oldest}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="text-sm font-bold text-destructive">{formatCurrency(s.total)}</p>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

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
