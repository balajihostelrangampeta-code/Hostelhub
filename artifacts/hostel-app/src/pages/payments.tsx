import { useState, useMemo } from "react";
import {
  useListPayments,
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
  useListStudents,
  getListPaymentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, CreditCard, CheckCircle, Trash2, Search,
  User, AlertTriangle, CheckSquare, X, Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import { Link } from "wouter";

const addPaymentSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  amount: z.string().min(1, "Amount is required"),
  dueDate: z.string().min(1, "Due date is required"),
  month: z.string().optional(),
  description: z.string().optional(),
});

function StudentPicker({
  students,
  value,
  onChange,
}: {
  students: { id: number; name: string; roomNumber?: string | null; status: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const activeStudents = students.filter((s) => s.status === "active");
  const selected = activeStudents.find((s) => String(s.id) === value);

  const filtered = query.trim()
    ? activeStudents.filter((s) =>
        s.name.toLowerCase().includes(query.trim().toLowerCase())
      )
    : activeStudents;

  const handleSelect = (id: string) => {
    onChange(id);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-9"
          placeholder="Type student name…"
          value={open ? query : selected ? selected.name : ""}
          onFocus={() => { setOpen(true); setQuery(""); }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          autoComplete="off"
        />
      </div>
      {selected && !open && (
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <span className="font-medium text-foreground">{selected.name}</span>
          {selected.roomNumber && (
            <>
              <span>·</span>
              <span>Room {selected.roomNumber}</span>
            </>
          )}
          {!selected.roomNumber && <span className="italic">No room assigned</span>}
        </p>
      )}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">No students found</p>
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between gap-2"
                onMouseDown={() => handleSelect(String(s.id))}
              >
                <span className="font-medium">{s.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {s.roomNumber ? `Room ${s.roomNumber}` : "No room"}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

type AddPaymentForm = z.infer<typeof addPaymentSchema>;

const statusColors: Record<string, string> = {
  paid: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  overdue: "bg-red-100 text-red-700 border-red-200",
};

export default function Payments() {
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid" | "overdue">("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [markingOverdue, setMarkingOverdue] = useState(false);

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkPaying, setBulkPaying] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const params = statusFilter !== "all" ? { status: statusFilter } : undefined;
  const { data: payments = [], isLoading } = useListPayments(params);
  const { data: allPending = [] } = useListPayments({ status: "pending" });
  const { data: students = [] } = useListStudents();
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();

  const today = new Date().toISOString().split("T")[0];
  const overdueEligible = allPending.filter((p) => p.dueDate < today);

  const filtered = search.trim()
    ? payments.filter((p) =>
        p.studentName?.toLowerCase().includes(search.trim().toLowerCase())
      )
    : payments;

  // Only unpaid payments in the current view can be selected
  const selectableIds = useMemo(
    () => new Set(filtered.filter((p) => p.status !== "paid").map((p) => p.id)),
    [filtered]
  );

  const allSelected = selectableIds.size > 0 && [...selectableIds].every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const paidAmount = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);

  // Selected amount preview (only unpaid ones that will actually be changed)
  const selectedPayments = filtered.filter((p) => selectedIds.has(p.id) && p.status !== "paid");
  const selectedTotal = selectedPayments.reduce((sum, p) => sum + p.amount, 0);

  function enterSelectionMode() {
    setSelectionMode(true);
    setSelectedIds(new Set());
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  function toggleId(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableIds));
    }
  }

  const handleMarkAllOverdue = async () => {
    if (overdueEligible.length === 0) return;
    setMarkingOverdue(true);
    try {
      await Promise.all(
        overdueEligible.map((p) =>
          updatePayment.mutateAsync({ id: p.id, data: { status: "overdue" } })
        )
      );
      queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
      toast({ title: `${overdueEligible.length} payment${overdueEligible.length !== 1 ? "s" : ""} marked overdue` });
    } catch {
      toast({ title: "Some payments could not be updated", variant: "destructive" });
    } finally {
      setMarkingOverdue(false);
    }
  };

  const handleBulkMarkPaid = async () => {
    if (selectedPayments.length === 0) return;
    setBulkPaying(true);
    const paidDate = new Date().toISOString().split("T")[0];
    let succeeded = 0;
    try {
      await Promise.all(
        selectedPayments.map((p) =>
          updatePayment
            .mutateAsync({ id: p.id, data: { status: "paid", paidDate } })
            .then(() => { succeeded++; })
        )
      );
      queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
      toast({ title: `${succeeded} payment${succeeded !== 1 ? "s" : ""} marked as paid` });
      exitSelectionMode();
    } catch {
      queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
      toast({
        title: succeeded > 0
          ? `${succeeded} marked paid, some failed`
          : "Could not mark payments as paid",
        variant: "destructive",
      });
    } finally {
      setBulkPaying(false);
    }
  };

  const form = useForm<AddPaymentForm>({
    resolver: zodResolver(addPaymentSchema),
    defaultValues: {
      studentId: "",
      amount: "",
      dueDate: new Date().toISOString().split("T")[0],
      month: "",
      description: "",
    },
  });

  const onSubmit = (values: AddPaymentForm) => {
    createPayment.mutate(
      {
        data: {
          studentId: Number(values.studentId),
          amount: Number(values.amount),
          dueDate: values.dueDate,
          month: values.month || null,
          description: values.description || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          toast({ title: "Payment installment added" });
          setOpen(false);
          form.reset();
        },
        onError: () => {
          toast({ title: "Failed to add payment", variant: "destructive" });
        },
      }
    );
  };

  const handleMarkPaid = (id: number) => {
    updatePayment.mutate(
      { id, data: { status: "paid", paidDate: new Date().toISOString().split("T")[0] } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          toast({ title: "Payment marked as paid" });
        },
        onError: () => {
          toast({ title: "Failed to update payment", variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deletePayment.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          toast({ title: "Payment deleted" });
        },
        onError: () => {
          toast({ title: "Failed to delete payment", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-32">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground mt-1">Track all rent installments</p>
        </div>
        <div className="flex items-center gap-2">
          {!selectionMode && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={enterSelectionMode}
                className="gap-2 hidden sm:flex"
                data-testid="button-select-mode"
              >
                <CheckSquare className="w-4 h-4" />
                Select
              </Button>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-payment">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Installment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Payment Installment</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                      <FormField
                        control={form.control}
                        name="studentId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Student</FormLabel>
                            <FormControl>
                              <StudentPicker
                                students={students}
                                value={field.value}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount (INR)</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-payment-amount" type="number" min="0" placeholder="3500" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="dueDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Due Date</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-payment-due-date" type="date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="month"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Month (optional)</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-payment-month" placeholder="May 2025" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description (optional)</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-payment-description" placeholder="Yearly rent" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createPayment.isPending} data-testid="button-submit-payment">
                          {createPayment.isPending ? "Adding..." : "Add Installment"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </>
          )}
          {selectionMode && (
            <Button variant="outline" size="sm" onClick={exitSelectionMode} className="gap-2">
              <X className="w-4 h-4" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-3 divide-x divide-border">
            <div className="flex flex-col gap-1 px-4 py-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Billed</p>
              <p className="text-lg font-bold leading-tight">{formatCurrency(totalAmount)}</p>
            </div>
            <div className="flex flex-col gap-1 px-4 py-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Collected</p>
              <p className="text-lg font-bold leading-tight text-green-600">{formatCurrency(paidAmount)}</p>
            </div>
            <div className="flex flex-col gap-1 px-4 py-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Due</p>
              <p className="text-lg font-bold leading-tight text-destructive">{formatCurrency(totalAmount - paidAmount)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search + filter + bulk-overdue bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Search by student name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-payment-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-full sm:w-40" data-testid="select-payment-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        {!selectionMode && (
          <Button
            variant="outline"
            onClick={handleMarkAllOverdue}
            disabled={overdueEligible.length === 0 || markingOverdue}
            className="gap-2 shrink-0 w-full sm:w-auto"
            data-testid="button-mark-all-overdue"
            title={overdueEligible.length === 0 ? "No pending payments past their due date" : `Mark ${overdueEligible.length} pending payment${overdueEligible.length !== 1 ? "s" : ""} as overdue`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            {markingOverdue ? "Updating…" : overdueEligible.length > 0 ? `Mark Overdue (${overdueEligible.length})` : "Mark Overdue"}
          </Button>
        )}
        {selectionMode && (
          <Button
            variant="outline"
            onClick={toggleAll}
            className="gap-2 shrink-0 w-full sm:w-auto"
            disabled={selectableIds.size === 0}
          >
            <Checkbox checked={allSelected} className="pointer-events-none" />
            {allSelected ? "Deselect All" : `Select All (${selectableIds.size})`}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse h-16" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CreditCard className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No payments found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search || statusFilter !== "all" ? "Try adjusting your search or filter" : "Add an installment to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="flex flex-col gap-2 md:hidden">
            {filtered.map((payment) => {
              const selectable = payment.status !== "paid";
              const checked = selectedIds.has(payment.id);
              return (
                <Card
                  key={payment.id}
                  className={`hover:shadow-sm transition-shadow ${selectionMode && selectable && checked ? "ring-2 ring-primary" : ""}`}
                  data-testid={`row-payment-${payment.id}`}
                  onClick={selectionMode && selectable ? () => toggleId(payment.id) : undefined}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      {selectionMode ? (
                        <div className="w-9 h-9 flex items-center justify-center shrink-0">
                          <Checkbox
                            checked={checked}
                            disabled={!selectable}
                            onCheckedChange={() => selectable && toggleId(payment.id)}
                            onClick={(e) => e.stopPropagation()}
                            className={!selectable ? "opacity-30" : ""}
                          />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {selectionMode ? (
                            <span className="font-semibold text-sm truncate">{payment.studentName}</span>
                          ) : (
                            <Link href={`/students/${payment.studentId}`}>
                              <span className="font-semibold text-sm truncate hover:text-primary cursor-pointer transition-colors">
                                {payment.studentName}
                              </span>
                            </Link>
                          )}
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0 h-4 inline-flex items-center rounded-full border shrink-0 ${statusColors[payment.status] || ""}`}
                            data-testid={`status-payment-${payment.id}`}
                          >
                            {payment.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                          <span className="font-bold text-foreground">{formatCurrency(payment.amount)}</span>
                          <span>Due {payment.dueDate}</span>
                          {payment.paidDate && <span className="text-green-600">Paid {payment.paidDate}</span>}
                        </div>
                        {(payment.description || payment.month) && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {payment.description || payment.month}
                          </p>
                        )}
                      </div>

                      {!selectionMode && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          {payment.status !== "paid" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleMarkPaid(payment.id)}
                              disabled={updatePayment.isPending}
                              data-testid={`button-mark-paid-${payment.id}`}
                              title="Mark as paid"
                            >
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleDelete(payment.id)}
                            disabled={deletePayment.isPending}
                            data-testid={`button-delete-payment-${payment.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            <p className="text-xs text-muted-foreground text-center pt-1">
              {filtered.length} record{filtered.length !== 1 ? "s" : ""}
              {(search || statusFilter !== "all") ? " matched" : ""}
            </p>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {selectionMode && (
                    <th className="w-12 px-4 py-3">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                        disabled={selectableIds.size === 0}
                        aria-label="Select all"
                      />
                    </th>
                  )}
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Student</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Due Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Paid Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                  {!selectionMode && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {filtered.map((payment, idx) => {
                  const selectable = payment.status !== "paid";
                  const checked = selectedIds.has(payment.id);
                  return (
                    <tr
                      key={payment.id}
                      className={`border-b last:border-0 transition-colors
                        ${selectionMode && selectable ? "cursor-pointer" : ""}
                        ${selectionMode && selectable && checked ? "bg-primary/5" : idx % 2 === 0 ? "hover:bg-muted/30" : "bg-muted/10 hover:bg-muted/30"}
                      `}
                      onClick={selectionMode && selectable ? () => toggleId(payment.id) : undefined}
                      data-testid={`row-payment-${payment.id}`}
                    >
                      {selectionMode && (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={checked}
                            disabled={!selectable}
                            onCheckedChange={() => selectable && toggleId(payment.id)}
                            className={!selectable ? "opacity-30" : ""}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        {selectionMode ? (
                          <span className="font-medium">{payment.studentName}</span>
                        ) : (
                          <Link href={`/students/${payment.studentId}`}>
                            <span className="font-medium hover:text-primary cursor-pointer transition-colors">
                              {payment.studentName}
                            </span>
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {payment.description || payment.month || "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(payment.amount)}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{payment.dueDate}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{payment.paidDate || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full border whitespace-nowrap ${statusColors[payment.status] || ""}`}
                          data-testid={`status-payment-${payment.id}`}
                        >
                          {payment.status}
                        </span>
                      </td>
                      {!selectionMode && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            {payment.status !== "paid" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkPaid(payment.id)}
                                disabled={updatePayment.isPending}
                                data-testid={`button-mark-paid-${payment.id}`}
                                title="Mark as paid"
                              >
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(payment.id)}
                              disabled={deletePayment.isPending}
                              data-testid={`button-delete-payment-${payment.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
              {filtered.length} record{filtered.length !== 1 ? "s" : ""}
              {(search || statusFilter !== "all") ? " matched" : ""}
            </div>
          </div>
        </>
      )}

      {/* Sticky bulk-action bar */}
      {selectionMode && (
        <div
          className={`fixed bottom-16 md:bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-3 px-4 py-3 border-t bg-background shadow-lg transition-all duration-200 ${
            someSelected ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
          }`}
          data-testid="bulk-action-bar"
        >
          <div className="text-sm">
            <span className="font-semibold">{selectedIds.size}</span>
            <span className="text-muted-foreground"> selected</span>
            {selectedTotal > 0 && (
              <span className="text-muted-foreground"> · {formatCurrency(selectedTotal)}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exitSelectionMode}
              disabled={bulkPaying}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleBulkMarkPaid}
              disabled={bulkPaying || selectedPayments.length === 0}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
              data-testid="button-bulk-mark-paid"
            >
              {bulkPaying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Marking paid…
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Mark {selectedPayments.length} as Paid
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
