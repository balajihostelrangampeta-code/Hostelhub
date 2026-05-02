import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useGetRoom,
  useUpdateRoom,
  getGetRoomQueryKey,
  getListRoomsQueryKey,
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
import { ArrowLeft, Edit, Users, User, Phone, ChevronRight, Wrench } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Room {room.number}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
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
                        <FormLabel>Monthly Rent (INR)</FormLabel>
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
                      <FormItem className="col-span-2">
                        <FormLabel>Amenities</FormLabel>
                        <FormControl><Input {...field} placeholder="AC, WiFi, Attached Bathroom" data-testid="input-room-amenities" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
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
            <p className="text-xs text-muted-foreground">Monthly Rent</p>
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
            <p className="text-xs text-muted-foreground">Monthly Income</p>
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
          <h2 className="text-xl font-semibold">
            Students in Room {room.number}
          </h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{room.students?.length ?? 0} resident{(room.students?.length ?? 0) !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {!room.students || room.students.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <Users className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="font-medium">No students in this room</p>
              <p className="text-sm text-muted-foreground mt-1">
                Assign a student to this room from the{" "}
                <Link href="/students">
                  <span className="text-primary hover:underline cursor-pointer">Students</span>
                </Link>{" "}
                page
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {room.students.map((student) => (
              <Card key={student.id} className="hover:shadow-sm transition-shadow" data-testid={`card-student-${student.id}`}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium" data-testid={`text-student-name-${student.id}`}>{student.name}</p>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span>{student.phone}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Since</p>
                        <p className="text-sm font-medium">{student.joinDate}</p>
                      </div>
                      <Badge variant={student.status === "active" ? "default" : "secondary"}>
                        {student.status}
                      </Badge>
                      <Link href={`/students/${student.id}`}>
                        <Button variant="ghost" size="sm" data-testid={`button-view-student-${student.id}`}>
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
