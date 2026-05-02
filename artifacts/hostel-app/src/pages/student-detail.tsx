import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useGetStudent,
  useUpdateStudent,
  useListPayments,
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
  useListRooms,
  getGetStudentQueryKey,
  getListPaymentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, Edit, Plus, CheckCircle, Trash2, CreditCard, Phone, MapPin, Home, User } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";

const editStudentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(6, "Phone is required"),
  address: z.string().min(1, "Address is required"),
  joinDate: z.string().min(1, "Join date is required"),
  status: z.enum(["active", "inactive"]),
  roomId: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  education: z.string().optional(),
  studyYear: z.string().optional(),
});

const addPaymentSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  dueDate: z.string().min(1, "Due date is required"),
  month: z.string().optional(),
  description: z.string().optional(),
});

type EditStudentForm = z.infer<typeof editStudentSchema>;
type AddPaymentForm = z.infer<typeof addPaymentSchema>;

const statusColors: Record<string, string> = {
  paid: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  overdue: "bg-red-100 text-red-700 border-red-200",
};

export default function StudentDetail() {
  const params = useParams<{ id: string }>();
  const studentId = Number(params.id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const { data: student, isLoading } = useGetStudent(studentId, {
    query: { enabled: !!studentId, queryKey: getGetStudentQueryKey(studentId) },
  });
  const { data: payments = [], isLoading: paymentsLoading } = useListPayments(
    { studentId },
    { query: { queryKey: getListPaymentsQueryKey({ studentId }) } }
  );
  const { data: rooms = [] } = useListRooms();

  const updateStudent = useUpdateStudent();
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();

  const editForm = useForm<EditStudentForm>({
    resolver: zodResolver(editStudentSchema),
    values: student
      ? {
          name: student.name,
          email: student.email,
          phone: student.phone,
          address: student.address,
          joinDate: student.joinDate,
          status: student.status as "active" | "inactive",
          roomId: student.roomId ? String(student.roomId) : "none",
          emergencyContact: student.emergencyContact ?? "",
          emergencyPhone: student.emergencyPhone ?? "",
          education: student.education ?? "",
          studyYear: student.studyYear ?? "",
        }
      : undefined,
  });

  const paymentForm = useForm<AddPaymentForm>({
    resolver: zodResolver(addPaymentSchema),
    defaultValues: {
      amount: student?.roomId ? "" : "",
      dueDate: new Date().toISOString().split("T")[0],
      month: "",
      description: "Yearly Rent",
    },
  });

  const onEditSubmit = (values: EditStudentForm) => {
    updateStudent.mutate(
      {
        id: studentId,
        data: {
          name: values.name,
          email: values.email,
          phone: values.phone,
          address: values.address,
          joinDate: values.joinDate,
          status: values.status,
          roomId: values.roomId && values.roomId !== "none" ? Number(values.roomId) : null,
          emergencyContact: values.emergencyContact || null,
          emergencyPhone: values.emergencyPhone || null,
          education: values.education || null,
          studyYear: values.studyYear || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetStudentQueryKey(studentId) });
          toast({ title: "Student updated successfully" });
          setEditOpen(false);
        },
        onError: () => {
          toast({ title: "Failed to update student", variant: "destructive" });
        },
      }
    );
  };

  const onPaymentSubmit = (values: AddPaymentForm) => {
    createPayment.mutate(
      {
        data: {
          studentId,
          amount: Number(values.amount),
          dueDate: values.dueDate,
          month: values.month || null,
          description: values.description || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey({ studentId }) });
          toast({ title: "Payment installment added" });
          setPaymentOpen(false);
          paymentForm.reset({ amount: "", dueDate: new Date().toISOString().split("T")[0], month: "", description: "Yearly Rent" });
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
        data: { status: "paid", paidDate: new Date().toISOString().split("T")[0] },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey({ studentId }) });
          toast({ title: "Payment marked as paid" });
        },
        onError: () => {
          toast({ title: "Failed to update payment", variant: "destructive" });
        },
      }
    );
  };

  const handleDeletePayment = (id: number) => {
    deletePayment.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey({ studentId }) });
          toast({ title: "Payment deleted" });
        },
        onError: () => {
          toast({ title: "Failed to delete payment", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <Card className="animate-pulse h-48" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Student not found</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/students")}>
          Back to Students
        </Button>
      </div>
    );
  }

  const totalPaid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0);
  const availableRooms = rooms.filter((r) => r.status !== "maintenance" && (r.occupied < r.capacity || r.id === student.roomId));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/students">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">Students</span>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">{student.name}</span>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight leading-tight" data-testid="text-student-name">{student.name}</h1>
              <Badge variant={student.status === "active" ? "default" : "secondary"} data-testid="status-student" className="shrink-0">
                {student.status}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm truncate">{student.email}</p>
          </div>
        </div>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0" data-testid="button-edit-student">
              <Edit className="w-4 h-4 mr-1.5" />
              Edit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Student</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField control={editForm.control} name="name" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input {...field} data-testid="input-edit-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={editForm.control} name="email" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input {...field} type="email" data-testid="input-edit-email" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={editForm.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl><Input {...field} data-testid="input-edit-phone" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={editForm.control} name="joinDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Join Date</FormLabel>
                      <FormControl><Input {...field} type="date" data-testid="input-edit-join-date" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={editForm.control} name="address" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl><Input {...field} data-testid="input-edit-address" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={editForm.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-status"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={editForm.control} name="roomId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign Room</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-room"><SelectValue placeholder="No room" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No room</SelectItem>
                          {availableRooms.map((r) => (
                            <SelectItem key={r.id} value={String(r.id)}>
                              Room {r.number} ({r.type}) — {r.occupied}/{r.capacity}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={editForm.control} name="emergencyContact" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact</FormLabel>
                      <FormControl><Input {...field} data-testid="input-edit-emergency-contact" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={editForm.control} name="emergencyPhone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Phone</FormLabel>
                      <FormControl><Input {...field} data-testid="input-edit-emergency-phone" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={editForm.control} name="education" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Education <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                      <FormControl><Input {...field} placeholder="B.Tech, B.Sc…" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={editForm.control} name="studyYear" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Study Year <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                      <FormControl><Input {...field} placeholder="1st Year, 2nd Year…" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={updateStudent.isPending} data-testid="button-save-student">
                    {updateStudent.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
              <span data-testid="text-phone">{student.phone}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <span data-testid="text-address">{student.address}</span>
            </div>
            {student.emergencyContact && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Emergency Contact</p>
                <p className="font-medium">{student.emergencyContact}</p>
                {student.emergencyPhone && <p className="text-muted-foreground">{student.emergencyPhone}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Room & Stay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-muted-foreground shrink-0" />
              {student.roomId ? (
                <Link href={`/rooms/${student.roomId}`}>
                  <span className="font-medium hover:text-primary cursor-pointer transition-colors" data-testid="text-room">
                    Room {student.roomNumber}
                  </span>
                </Link>
              ) : (
                <span className="text-muted-foreground" data-testid="text-room">No room assigned</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Join Date:</span>
              <span className="font-medium">{student.joinDate}</span>
            </div>
            {(student.education || student.studyYear) && (
              <div className="pt-2 border-t space-y-1">
                {student.education && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Education:</span>
                    <span className="font-medium">{student.education}</span>
                  </div>
                )}
                {student.studyYear && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Study Year:</span>
                    <span className="font-medium">{student.studyYear}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Paid</p>
            <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="text-xl font-bold text-destructive mt-1">{formatCurrency(totalPending)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Installments</p>
            <p className="text-xl font-bold mt-1">{payments.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Payments Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Payment Installments</h2>
          <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-payment">
                <Plus className="w-4 h-4 mr-2" />
                Add Installment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Payment Installment for {student.name}</DialogTitle>
              </DialogHeader>
              <Form {...paymentForm}>
                <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField control={paymentForm.control} name="amount" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (INR)</FormLabel>
                        <FormControl><Input {...field} type="number" min="0" placeholder="3500" data-testid="input-payment-amount" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={paymentForm.control} name="dueDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl><Input {...field} type="date" data-testid="input-payment-due-date" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={paymentForm.control} name="month" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Month (optional)</FormLabel>
                        <FormControl><Input {...field} placeholder="May 2025" data-testid="input-payment-month" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={paymentForm.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Input {...field} placeholder="Yearly Rent" data-testid="input-payment-description" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={createPayment.isPending} data-testid="button-submit-payment">
                      {createPayment.isPending ? "Adding..." : "Add Installment"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {paymentsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse h-16" />)}
          </div>
        ) : payments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <CreditCard className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="font-medium">No payment records</p>
              <p className="text-sm text-muted-foreground mt-1">Add an installment to start tracking</p>
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
                      <div>
                        <p className="font-semibold">{payment.description || payment.month || "—"}</p>
                        <p className="text-xl font-bold mt-1">{formatCurrency(payment.amount)}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full border shrink-0 ${statusColors[payment.status] || ""}`}
                        data-testid={`status-payment-${payment.id}`}>
                        {payment.status}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex gap-4 text-sm">
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
                          <Button variant="ghost" size="sm" onClick={() => handleMarkPaid(payment.id)}
                            disabled={updatePayment.isPending} title="Mark as paid"
                            data-testid={`button-mark-paid-${payment.id}`}>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleDeletePayment(payment.id)}
                          disabled={deletePayment.isPending} data-testid={`button-delete-payment-${payment.id}`}>
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
                    <tr key={payment.id}
                      className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                      data-testid={`row-payment-${payment.id}`}>
                      <td className="px-4 py-3">{payment.description || payment.month || "—"}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(payment.amount)}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{payment.dueDate}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{payment.paidDate || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full border whitespace-nowrap ${statusColors[payment.status] || ""}`}
                          data-testid={`status-payment-${payment.id}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {payment.status !== "paid" && (
                            <Button variant="ghost" size="sm" onClick={() => handleMarkPaid(payment.id)}
                              disabled={updatePayment.isPending} title="Mark as paid"
                              data-testid={`button-mark-paid-${payment.id}`}>
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleDeletePayment(payment.id)}
                            disabled={deletePayment.isPending} data-testid={`button-delete-payment-${payment.id}`}>
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
    </div>
  );
}
