import { useState } from "react";
import { Link } from "wouter";
import {
  useListRooms,
  useCreateRoom,
  useDeleteRoom,
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
import { Plus, Home, Trash2, Users, Wrench } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const addRoomSchema = z.object({
  number: z.string().min(1, "Room number is required"),
  type: z.enum(["single", "double", "triple", "dormitory"]),
  floor: z.string().min(1, "Floor is required"),
  capacity: z.string().min(1, "Capacity is required"),
  monthlyRent: z.string().min(1, "Monthly rent is required"),
  amenities: z.string().optional(),
});

type AddRoomForm = z.infer<typeof addRoomSchema>;

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

export default function Rooms() {
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "full" | "maintenance">("all");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const params = statusFilter !== "all" ? { status: statusFilter } : undefined;
  const { data: rooms = [], isLoading } = useListRooms(params);
  const createRoom = useCreateRoom();
  const deleteRoom = useDeleteRoom();

  const form = useForm<AddRoomForm>({
    resolver: zodResolver(addRoomSchema),
    defaultValues: {
      number: "",
      type: "double",
      floor: "1",
      capacity: "2",
      monthlyRent: "",
      amenities: "",
    },
  });

  const onSubmit = (values: AddRoomForm) => {
    createRoom.mutate(
      {
        data: {
          number: values.number,
          type: values.type,
          floor: Number(values.floor),
          capacity: Number(values.capacity),
          monthlyRent: Number(values.monthlyRent),
          amenities: values.amenities || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() });
          toast({ title: "Room created successfully" });
          setOpen(false);
          form.reset();
        },
        onError: () => {
          toast({ title: "Failed to create room", variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = (id: number, number: string) => {
    deleteRoom.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() });
          toast({ title: `Room ${number} deleted` });
        },
        onError: () => {
          toast({ title: "Failed to delete room", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rooms</h1>
          <p className="text-muted-foreground mt-1">Manage all hostel rooms and occupancy</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-room">
              <Plus className="w-4 h-4 mr-2" />
              Add Room
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Room</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Room Number</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-room-number" placeholder="301" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-room-type">
                              <SelectValue />
                            </SelectTrigger>
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
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="floor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Floor</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-room-floor" type="number" min="1" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacity</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-room-capacity" type="number" min="1" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="monthlyRent"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Monthly Rent (INR)</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-room-rent" type="number" min="0" placeholder="3500" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amenities"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Amenities (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-room-amenities" placeholder="AC, WiFi, Attached Bathroom" />
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
                  <Button type="submit" disabled={createRoom.isPending} data-testid="button-submit-room">
                    {createRoom.isPending ? "Creating..." : "Create Room"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-44" data-testid="select-room-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rooms</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="full">Full</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground flex items-center">
          {rooms.length} room{rooms.length !== 1 ? "s" : ""}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse h-40" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Home className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No rooms found</p>
            <p className="text-sm text-muted-foreground mt-1">Add a room to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <Card
              key={room.id}
              className="hover:shadow-md transition-shadow cursor-pointer group"
              data-testid={`card-room-${room.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">Room {room.number}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Floor {room.floor} • {typeLabels[room.type]}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full border ${statusColors[room.status] || ""}`}
                    data-testid={`status-room-${room.id}`}
                  >
                    {room.status === "maintenance" ? (
                      <span className="flex items-center gap-1"><Wrench className="w-3 h-3" /> Maintenance</span>
                    ) : (
                      room.status
                    )}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{room.occupied} / {room.capacity} occupied</span>
                  </div>
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${room.occupied >= room.capacity ? "bg-primary" : "bg-primary/60"}`}
                      style={{ width: `${Math.min(100, (room.occupied / room.capacity) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm font-semibold">
                  ₹{room.monthlyRent.toLocaleString()}<span className="text-muted-foreground font-normal">/month</span>
                </div>
                {room.amenities && (
                  <p className="text-xs text-muted-foreground truncate">{room.amenities}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <Link href={`/rooms/${room.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full" data-testid={`button-view-room-${room.id}`}>
                      View Students
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" data-testid={`button-delete-room-${room.id}`}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Room {room.number}</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will delete the room. Students in this room will be unassigned.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(room.id, room.number)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
