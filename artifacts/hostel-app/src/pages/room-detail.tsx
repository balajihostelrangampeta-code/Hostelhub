import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useGetRoom,
  useUpdateRoom,
  useUpdateStudent,
  useCreateStudent,
  useListRooms,
  useListStudents,
  getGetRoomQueryKey,
  getListRoomsQueryKey,
  getListStudentsQueryKey,
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
import { ArrowLeft, Edit, Users, User, Phone, ChevronRight, Wrench, Mail, UserPlus, UserMinus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
});
type EditStudentForm = z.infer<typeof editStudentSchema>;

type RoomStudent = {
  id: number;
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  status: string;
};

function StudentEditDialog({
  student,
  currentRoomId,
  onSaved,
}: {
  student: RoomStudent;
  currentRoomId: number;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { data: rooms = [] } = useListRooms();
  const updateStudent = useUpdateStudent();

  const form = useForm<EditStudentForm>({
    resolver: zodResolver(editStudentSchema),
    values: {
      name: student.name,
      email: student.email,
      phone: student.phone,
      address: "",
      joinDate: student.joinDate,
      status: student.status as "active" | "inactive",
      roomId: String(currentRoomId),
      emergencyContact: "",
      emergencyPhone: "",
    },
  });

  const onSubmit = (values: EditStudentForm) => {
    updateStudent.mutate(
      {
        id: student.id,
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
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Student updated successfully" });
          setOpen(false);
          onSaved();
        },
        onError: () => {
          toast({ title: "Failed to update student", variant: "destructive" });
        },
      }
    );
  };

  const availableRooms = rooms.filter(
    (r) => r.status !== "maintenance" && (r.occupied < r.capacity || r.id === currentRoomId)
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit student">
          <Edit className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {student.name}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input {...field} type="email" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="joinDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Join Date</FormLabel>
                  <FormControl><Input {...field} type="date" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Address</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="roomId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign Room</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="No room" /></SelectTrigger></FormControl>
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
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateStudent.isPending}>
                {updateStudent.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const newStudentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(6, "Phone is required"),
  address: z.string().min(1, "Address is required"),
  joinDate: z.string().min(1, "Join date is required"),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  education: z.string().optional(),
  studyYear: z.string().optional(),
});
type NewStudentForm = z.infer<typeof newStudentSchema>;

function AssignStudentDialog({
  roomId,
  roomNumber,
  currentStudentIds,
  isFull,
  onAssigned,
}: {
  roomId: number;
  roomNumber: string;
  currentStudentIds: number[];
  isFull: boolean;
  onAssigned: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedId, setSelectedId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: allStudents = [] } = useListStudents();
  const updateStudent = useUpdateStudent();
  const createStudent = useCreateStudent();

  const unassigned = allStudents.filter(
    (s) => !currentStudentIds.includes(s.id) && s.status === "active" && !s.roomId
  );

  const newStudentForm = useForm<NewStudentForm>({
    resolver: zodResolver(newStudentSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      joinDate: new Date().toISOString().split("T")[0],
      emergencyContact: "",
      emergencyPhone: "",
      education: "",
      studyYear: "",
    },
  });

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setMode("existing");
      setSelectedId("");
      newStudentForm.reset();
    }
  };

  const handleAssignExisting = () => {
    if (!selectedId) return;
    updateStudent.mutate(
      { id: Number(selectedId), data: { roomId } },
      {
        onSuccess: () => {
          toast({ title: "Student assigned to room" });
          handleClose(false);
          onAssigned();
        },
        onError: () => {
          toast({ title: "Failed to assign student", variant: "destructive" });
        },
      }
    );
  };

  const handleCreateNew = async (values: NewStudentForm) => {
    try {
      await createStudent.mutateAsync({
        data: {
          name: values.name,
          email: values.email,
          phone: values.phone,
          address: values.address,
          joinDate: values.joinDate,
          roomId,
          emergencyContact: values.emergencyContact || null,
          emergencyPhone: values.emergencyPhone || null,
          education: values.education || null,
          studyYear: values.studyYear || null,
        },
      });
      queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
      toast({ title: `${values.name} added and assigned to Room ${roomNumber}` });
      handleClose(false);
      onAssigned();
    } catch {
      toast({ title: "Failed to create student", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={isFull} className="gap-1.5">
          <UserPlus className="w-4 h-4" />
          Add Student
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Student to Room {roomNumber}</DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex rounded-lg border bg-muted/40 p-1 gap-1">
          <button
            type="button"
            onClick={() => setMode("existing")}
            className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${
              mode === "existing"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Existing Student
          </button>
          <button
            type="button"
            onClick={() => setMode("new")}
            className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${
              mode === "new"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            New Student
          </button>
        </div>

        {/* Existing student picker */}
        {mode === "existing" && (
          <div className="space-y-4">
            {unassigned.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-sm text-muted-foreground">
                  No unassigned active students available.
                </p>
                <button
                  type="button"
                  onClick={() => setMode("new")}
                  className="text-sm text-primary hover:underline"
                >
                  Create a new student instead →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Pick an active student who isn't in a room yet.
                </p>
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student…" />
                  </SelectTrigger>
                  <SelectContent>
                    {unassigned.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}{s.phone ? ` · ${s.phone}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button
                onClick={handleAssignExisting}
                disabled={!selectedId || updateStudent.isPending}
              >
                {updateStudent.isPending ? "Assigning…" : "Assign to Room"}
              </Button>
            </div>
          </div>
        )}

        {/* New student form */}
        {mode === "new" && (
          <Form {...newStudentForm}>
            <form onSubmit={newStudentForm.handleSubmit(handleCreateNew)} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField control={newStudentForm.control} name="name" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input {...field} placeholder="Ravi Kumar" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={newStudentForm.control} name="email" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input {...field} type="email" placeholder="ravi@email.com" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={newStudentForm.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input {...field} placeholder="9876543210" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={newStudentForm.control} name="joinDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Join Date</FormLabel>
                    <FormControl><Input {...field} type="date" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={newStudentForm.control} name="address" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl><Input {...field} placeholder="Street, City" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={newStudentForm.control} name="emergencyContact" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Contact <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                    <FormControl><Input {...field} placeholder="Parent name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={newStudentForm.control} name="emergencyPhone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Phone <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                    <FormControl><Input {...field} placeholder="9876543200" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={newStudentForm.control} name="education" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Education <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                    <FormControl><Input {...field} placeholder="B.Tech, B.Sc…" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={newStudentForm.control} name="studyYear" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Study Year <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                    <FormControl><Input {...field} placeholder="1st Year, 2nd Year…" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <p className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
                This student will be automatically assigned to Room {roomNumber}.
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
                <Button type="submit" disabled={createStudent.isPending}>
                  {createStudent.isPending ? "Creating…" : "Create & Assign"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

const editRoomSchema = z.object({
  number: z.string().min(1, "Room number is required"),
  type: z.enum(["single", "double", "triple", "dormitory"]),
  floor: z.string().min(1),
  capacity: z.string().min(1),
  monthlyRent: z.string().min(1),
  status: z.enum(["available", "full", "maintenance"]),
  amenities: z.string().optional(),
});

type EditRoomForm = z.infer<typeof editRoomSchema>;

const statusColors: Record<string, string> = {
  available: "bg-green-100 text-green-700 border-green-200",
  full: "bg-blue-100 text-blue-700 border-blue-200",
  maintenance: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

const typeLabels: Record<string, string> = {
  single: "Single",
  double: "Double",
  triple: "Triple",
  dormitory: "Dormitory",
};

export default function RoomDetail() {
  const params = useParams<{ id: string }>();
  const roomId = Number(params.id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);

  const { data: room, isLoading } = useGetRoom(roomId, {
    query: { enabled: !!roomId, queryKey: getGetRoomQueryKey(roomId) },
  });

  const updateRoom = useUpdateRoom();

  const form = useForm<EditRoomForm>({
    resolver: zodResolver(editRoomSchema),
    values: room
      ? {
          number: room.number,
          type: room.type as EditRoomForm["type"],
          floor: String(room.floor),
          capacity: String(room.capacity),
          monthlyRent: String(room.monthlyRent),
          status: room.status as EditRoomForm["status"],
          amenities: room.amenities ?? "",
        }
      : undefined,
  });

  const removeFromRoom = useUpdateStudent();

  const handleRemoveFromRoom = (studentId: number) => {
    removeFromRoom.mutate(
      { id: studentId, data: { roomId: null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetRoomQueryKey(roomId) });
          queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() });
          toast({ title: "Student removed from room" });
        },
        onError: () => {
          toast({ title: "Failed to remove student", variant: "destructive" });
        },
      }
    );
  };

  const onEditSubmit = (values: EditRoomForm) => {
    updateRoom.mutate(
      {
        id: roomId,
        data: {
          number: values.number,
          type: values.type,
          floor: Number(values.floor),
          capacity: Number(values.capacity),
          monthlyRent: Number(values.monthlyRent),
          status: values.status,
          amenities: values.amenities || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetRoomQueryKey(roomId) });
          queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() });
          toast({ title: "Room updated successfully" });
          setEditOpen(false);
        },
        onError: () => {
          toast({ title: "Failed to update room", variant: "destructive" });
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

  if (!room) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Room not found</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/rooms")}>
          Back to Rooms
        </Button>
      </div>
    );
  }

  const occupancyPercent = Math.min(100, (room.occupied / room.capacity) * 100);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/rooms">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">Rooms</span>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">Room {room.number}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-room-number">Room {room.number}</h1>
          <p className="text-muted-foreground mt-1">
            Floor {room.floor} • {typeLabels[room.type]}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-sm font-medium px-3 py-1.5 rounded-full border ${statusColors[room.status] || ""}`}
            data-testid="status-room"
          >
            {room.status === "maintenance" ? (
              <span className="flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5" /> Under Maintenance</span>
            ) : (
              room.status.charAt(0).toUpperCase() + room.status.slice(1)
            )}
          </span>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-edit-room">
                <Edit className="w-4 h-4 mr-2" />
                Edit Room
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Room {room.number}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField control={form.control} name="number" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Room Number</FormLabel>
                        <FormControl><Input {...field} data-testid="input-room-number" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-room-type"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="double">Double</SelectItem>
                            <SelectItem value="triple">Triple</SelectItem>
                            <SelectItem value="dormitory">Dormitory</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="floor" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Floor</FormLabel>
                        <FormControl><Input {...field} type="number" min="1" data-testid="input-room-floor" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="capacity" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacity</FormLabel>
                        <FormControl><Input {...field} type="number" min="1" data-testid="input-room-capacity" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="monthlyRent" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Yearly Rent (INR)</FormLabel>
                        <FormControl><Input {...field} type="number" min="0" data-testid="input-room-rent" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-room-status"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="full">Full</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="amenities" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Amenities</FormLabel>
                        <FormControl><Input {...field} placeholder="AC, WiFi, Attached Bathroom" data-testid="input-room-amenities" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={updateRoom.isPending} data-testid="button-save-room">
                      {updateRoom.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Room info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Occupancy</p>
            <p className="text-2xl font-bold mt-1">{room.occupied}/{room.capacity}</p>
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${occupancyPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Yearly Rent</p>
            <p className="text-2xl font-bold mt-1">₹{room.monthlyRent.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Floor</p>
            <p className="text-2xl font-bold mt-1">{room.floor}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Yearly Income</p>
            <p className="text-2xl font-bold mt-1">₹{(room.monthlyRent * room.occupied).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {room.amenities && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Amenities</p>
            <p className="text-sm">{room.amenities}</p>
          </CardContent>
        </Card>
      )}

      {/* Students in this room */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Students in Room {room.number}</h2>
            <p className="text-sm text-muted-foreground">
              {room.students?.length ?? 0} resident{(room.students?.length ?? 0) !== 1 ? "s" : ""}
              {room.occupied >= room.capacity ? " · Room full" : ` · ${room.capacity - room.occupied} bed${room.capacity - room.occupied !== 1 ? "s" : ""} free`}
            </p>
          </div>
          <AssignStudentDialog
            roomId={roomId}
            roomNumber={room.number}
            currentStudentIds={(room.students ?? []).map((s) => s.id)}
            isFull={room.occupied >= room.capacity}
            onAssigned={() => {
              queryClient.invalidateQueries({ queryKey: getGetRoomQueryKey(roomId) });
              queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() });
            }}
          />
        </div>

        {!room.students || room.students.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <Users className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="font-medium">No students in this room yet</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Use the "Add Student" button above to assign someone.
              </p>
              <AssignStudentDialog
                roomId={roomId}
                roomNumber={room.number}
                currentStudentIds={[]}
                isFull={false}
                onAssigned={() => {
                  queryClient.invalidateQueries({ queryKey: getGetRoomQueryKey(roomId) });
                  queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() });
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {room.students.map((student) => (
              <Card key={student.id} className="hover:shadow-sm transition-shadow" data-testid={`card-student-${student.id}`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>

                    {/* Main info — takes all remaining space */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate" data-testid={`text-student-name-${student.id}`}>
                          {student.name}
                        </p>
                        <Badge
                          variant={student.status === "active" ? "default" : "secondary"}
                          className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                        >
                          {student.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{student.email}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3 shrink-0" />
                          {student.phone}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          Since {student.joinDate}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <StudentEditDialog
                        student={student}
                        currentRoomId={roomId}
                        onSaved={() => {
                          queryClient.invalidateQueries({ queryKey: getGetRoomQueryKey(roomId) });
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Remove from room"
                        disabled={removeFromRoom.isPending}
                        onClick={() => handleRemoveFromRoom(student.id)}
                        data-testid={`button-remove-student-${student.id}`}
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </Button>
                      <Link href={`/students/${student.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" data-testid={`button-view-student-${student.id}`}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
