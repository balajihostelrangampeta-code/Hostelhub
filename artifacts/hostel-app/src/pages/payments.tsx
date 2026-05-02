import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, CreditCard, CheckCircle, Trash2 } from "lucide-react";
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

type AddPaymentForm = z.infer<typeof addPaymentSchema>;

const statusColors: Record<string, string> = {
  paid: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  overdue: "bg-red-100 text-red-700 border-red-200",
};

export default function Payments() {
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid" | "overdue">("all");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const params = statusFilter !== "all" ? { status: statusFilter } : undefined;
  const { data: payments = [], isLoading } = useListPayments(params);
  const { data: students = [] } = useListStudents();
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();

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
      {
        id,
        data: {
          status: "paid",
          paidDate: new Date().toISOString().split("T")[0],
        },
      },
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

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const paidAmount = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground mt-1">Track all rent installments</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-payment">
              <Plus className="w-4 h-4 mr-2" />
              Add Installment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Payment Installment</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-student">
                            <SelectValue placeholder="Select student" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {students.filter((s) => s.status === "active").map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
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

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-40" data-testid="select-payment-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{payments.length} record{payments.length !== 1 ? "s" : ""}</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse h-16" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CreditCard className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No payments found</p>
            <p className="text-sm text-muted-foreground mt-1">Add an installment to get started</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="flex flex-col gap-3 md:hidden">
            {payments.map((payment) => (
              <Card key={payment.id} data-testid={`row-payment-${payment.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/students/${payment.studentId}`}>
                        <span className="font-semibold hover:text-primary cursor-pointer transition-colors block truncate">
                          {payment.studentName}
                        </span>
                      </Link>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {payment.description || payment.month || "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full border ${statusColors[payment.status] || ""}`}
                        data-testid={`status-payment-${payment.id}`}
                      >
                        {payment.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="font-bold">{formatCurrency(payment.amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Due</p>
                        <p className="font-medium">{payment.dueDate}</p>
                      </div>
                      {payment.paidDate && (
                        <div>
                          <p className="text-xs text-muted-foreground">Paid</p>
                          <p className="font-medium">{payment.paidDate}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Student</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Due Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Paid Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, idx) => (
                  <tr
                    key={payment.id}
                    className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                    data-testid={`row-payment-${payment.id}`}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/students/${payment.studentId}`}>
                        <span className="font-medium hover:text-primary cursor-pointer transition-colors">
                          {payment.studentName}
                        </span>
                      </Link>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
