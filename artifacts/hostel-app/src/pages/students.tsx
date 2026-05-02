import { useState } from "react";
import { Link } from "wouter";
import {
  useListStudents,
  useCreateStudent,
  useDeleteStudent,
  getListStudentsQueryKey,
  useCreatePayment,
  getListPaymentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Trash2, ChevronRight, User, CreditCard, Download } from "lucide-react";
import { useListRooms } from "@workspace/api-client-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const addStudentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(6, "Phone is required"),
  address: z.string().min(1, "Address is required"),
  joinDate: z.string().min(1, "Join date is required"),
  roomId: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  education: z.string().optional(),
  studyYear: z.string().optional(),
  finalInstallmentDate: z.string().optional(),
  addFirstPayment: z.boolean().optional(),
  paymentAmount: z.string().optional(),
  paymentDueDate: z.string().optional(),
  paymentMonth: z.string().optional(),
});

type AddStudentForm = z.infer<typeof addStudentSchema>;

export default function Students() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [educationFilter, setEducationFilter] = useState("all");
  const [studyYearFilter, setStudyYearFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: students = [], isLoading } = useListStudents();
  const { data: rooms = [] } = useListRooms();
  const createStudent = useCreateStudent();
  const createPayment = useCreatePayment();
  const deleteStudent = useDeleteStudent();

  const form = useForm<AddStudentForm>({
    resolver: zodResolver(addStudentSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      joinDate: new Date().toISOString().split("T")[0],
      roomId: "",
      emergencyContact: "",
      emergencyPhone: "",
      education: "",
      studyYear: "",
      finalInstallmentDate: "",
      addFirstPayment: false,
      paymentAmount: "",
      paymentDueDate: new Date().toISOString().split("T")[0],
      paymentMonth: "",
    },
  });

  const watchAddPayment = form.watch("addFirstPayment");

  const onSubmit = async (values: AddStudentForm) => {
    try {
      const newStudent = await createStudent.mutateAsync({
        data: {
          name: values.name,
          email: values.email,
          phone: values.phone,
          address: values.address,
          joinDate: values.joinDate,
          roomId: values.roomId && values.roomId !== "none" ? Number(values.roomId) : null,
          emergencyContact: values.emergencyContact || null,
          emergencyPhone: values.emergencyPhone || null,
          education: values.education || null,
          studyYear: values.studyYear || null,
          finalInstallmentDate: values.finalInstallmentDate || null,
        },
      });

      if (values.addFirstPayment && values.paymentAmount && values.paymentDueDate) {
        await createPayment.mutateAsync({
          data: {
            studentId: newStudent.id,
            amount: Number(values.paymentAmount),
            dueDate: values.paymentDueDate,
            month: values.paymentMonth || null,
            status: "pending",
          },
        });
        queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
      }

      queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
      toast({ title: "Student added successfully" });
      setOpen(false);
      form.reset();
    } catch {
      toast({ title: "Failed to add student", variant: "destructive" });
    }
  };

  const handleDelete = (id: number, name: string) => {
    deleteStudent.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
          toast({ title: `${name} removed` });
        },
        onError: () => {
          toast({ title: "Failed to remove student", variant: "destructive" });
        },
      }
    );
  };

  const availableRooms = rooms.filter((r) => r.status !== "maintenance" && r.occupied < r.capacity);

  const educationOptions = Array.from(new Set(students.map((s) => s.education).filter(Boolean))) as string[];
  const studyYearOptions = Array.from(new Set(students.map((s) => s.studyYear).filter(Boolean))) as string[];

  const filteredStudents = students.filter((s) => {
    const q = search.toLowerCase();
    if (q && !s.name.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q) && !s.phone.includes(q)) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (educationFilter !== "all" && s.education !== educationFilter) return false;
    if (studyYearFilter !== "all" && s.studyYear !== studyYearFilter) return false;
    return true;
  });

  const isFiltered = !!(search || statusFilter !== "all" || educationFilter !== "all" || studyYearFilter !== "all");

  const exportCSV = () => {
    const headers = ["Name", "Phone", "Email", "Room", "Education", "Study Year", "Join Date", "Status"];
    const rows = filteredStudents.map((s) => [
      s.name,
      s.phone,
      s.email,
      s.roomNumber ? `Room ${s.roomNumber}` : "",
      s.education ?? "",
      s.studyYear ?? "",
      s.joinDate,
      s.status,
    ]);
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const date = new Date().toISOString().split("T")[0];
    a.download = `students-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground mt-1">Manage all hostel residents</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            disabled={filteredStudents.length === 0}
            title="Export to CSV"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-student">
                <Plus className="w-4 h-4 mr-2" />
                Add Student
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-name" placeholder="John Doe" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-email" type="email" placeholder="john@email.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-phone" placeholder="9876543210" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="joinDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Join Date</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-join-date" type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-address" placeholder="Street, City" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="roomId"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Assign Room (optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-room">
                              <SelectValue placeholder="No room" />
                            </SelectTrigger>
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
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emergencyContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency Contact</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-emergency-contact" placeholder="Parent name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emergencyPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency Phone</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-emergency-phone" placeholder="9876543200" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="education"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Education <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="B.Tech, B.Sc…" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="studyYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Study Year <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="1st Year, 2nd Year…" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="finalInstallmentDate"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Final Installment Date <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* First Payment Section */}
                <Separator />
                <FormField
                  control={form.control}
                  name="addFirstPayment"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2.5">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-add-payment"
                        />
                      </FormControl>
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <FormLabel className="!mt-0 cursor-pointer font-medium">Add first payment installment</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                {watchAddPayment && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3">
                    <FormField
                      control={form.control}
                      name="paymentAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (INR) <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="0" placeholder="3500" data-testid="input-payment-amount" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="paymentDueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input {...field} type="date" data-testid="input-payment-due-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="paymentMonth"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Month / Period <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. May 2026" data-testid="input-payment-month" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createStudent.isPending || createPayment.isPending}
                    data-testid="button-submit-student"
                  >
                    {createStudent.isPending || createPayment.isPending ? "Adding..." : "Add Student"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>

      {/* Search + filter bar */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              data-testid="input-search"
              className="pl-9"
              placeholder="Search by name, phone or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-full sm:w-36" data-testid="select-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={educationFilter} onValueChange={setEducationFilter}>
            <SelectTrigger className="w-full sm:flex-1" data-testid="select-education-filter">
              <SelectValue placeholder="All Education" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Education</SelectItem>
              {educationOptions.map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={studyYearFilter} onValueChange={setStudyYearFilter}>
            <SelectTrigger className="w-full sm:flex-1" data-testid="select-study-year-filter">
              <SelectValue placeholder="All Study Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Study Years</SelectItem>
              {studyYearOptions.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isFiltered && (
            <button
              type="button"
              onClick={() => { setSearch(""); setStatusFilter("all"); setEducationFilter("all"); setStudyYearFilter("all"); }}
              className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline whitespace-nowrap self-center"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="animate-pulse h-20" />
          ))}
        </div>
      ) : filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <User className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No students found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isFiltered ? "Try adjusting your search or filters" : "Add a student to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="flex flex-col gap-2 md:hidden">
            {filteredStudents.map((student) => (
              <Card key={student.id} className="hover:shadow-sm transition-shadow" data-testid={`row-student-${student.id}`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate" data-testid={`text-student-name-${student.id}`}>
                          {student.name}
                        </p>
                        <Badge
                          variant={student.status === "active" ? "default" : "secondary"}
                          className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                          data-testid={`status-student-${student.id}`}
                        >
                          {student.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span className="truncate">{student.phone}</span>
                        {student.roomNumber ? (
                          <span className="shrink-0 font-medium text-foreground">Room {student.roomNumber}</span>
                        ) : (
                          <span className="shrink-0">No room</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{student.email}</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Link href={`/students/${student.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" data-testid={`button-view-student-${student.id}`}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" data-testid={`button-delete-student-${student.id}`}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Student</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {student.name}? All their payment records will also be deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(student.id, student.name)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <p className="text-xs text-muted-foreground text-center pt-1">
              {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""}
              {isFiltered ? ` matched` : " total"}
            </p>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Room</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Join Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, idx) => (
                  <tr
                    key={student.id}
                    className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                    data-testid={`row-student-${student.id}`}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/students/${student.id}`}>
                        <div className="cursor-pointer">
                          <p className="font-medium hover:text-primary transition-colors" data-testid={`text-student-name-${student.id}`}>
                            {student.name}
                          </p>
                          <p className="text-xs text-muted-foreground">{student.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{student.phone}</td>
                    <td className="px-4 py-3">
                      {student.roomNumber ? (
                        <span className="font-medium">Room {student.roomNumber}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{student.joinDate}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={student.status === "active" ? "default" : "secondary"}
                        data-testid={`status-student-${student.id}`}
                      >
                        {student.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Link href={`/students/${student.id}`}>
                          <Button variant="ghost" size="sm" data-testid={`button-view-student-${student.id}`}>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-delete-student-${student.id}`}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Student</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {student.name}? All their payment records will also be deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(student.id, student.name)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
              {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""}
              {isFiltered ? " matched" : " total"}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
