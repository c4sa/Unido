
import React, { useState, useEffect } from "react";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import { VenueBooking } from "@/api/entities";
import { VenueRoom } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import ScheduleView from "../components/venues/ScheduleView";
import RoomFormDialog from "../components/venues/RoomFormDialog";
import PrivateBookingDialog from "../components/venues/PrivateBookingDialog";
import {
  MapPin,
  Users,
  Wifi,
  Monitor,
  Coffee,
  Edit as EditIcon,
  Plus,
  Trash2,
  Edit,
  Lock,
  Building,
  AlertCircle,
  RefreshCw,
  MoreVertical,
  Phone,
  Info
} from "lucide-react";

const EQUIPMENT_ICONS = {
  "Wifi": Wifi,
  "Projector": Monitor,
  "Monitor": Monitor,
  "Coffee": Coffee,
  "Whiteboard": EditIcon,
};

export default function Rooms() {
  const [currentUser, setCurrentUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState({});
  const [viewMode, setViewMode] = useState('grid');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("🔄 Starting to load data...");
      
      // Load current user first
      const user = await User.me();
      console.log("👤 Current user loaded:", user);
      setCurrentUser(user);

      if (user.role !== 'admin') {
        console.log("❌ User is not admin, stopping data load");
        setLoading(false);
        return;
      }

      console.log("✅ User is admin, loading all data...");

      // Load all data in parallel
      const [allUsers, allBookings, allRooms] = await Promise.all([
        User.list().catch(err => {
          console.error("Error loading users:", err);
          return [];
        }),
        VenueBooking.list('-created_date').catch(err => {
          console.error("Error loading bookings:", err);
          return [];
        }),
        VenueRoom.list().catch(err => {
          console.error("Error loading rooms:", err);
          throw err; // Re-throw this one since rooms are critical
        })
      ]);

      console.log("📊 Data loaded successfully:");
      console.log("- Users:", allUsers.length);
      console.log("- Bookings:", allBookings.length);
      console.log("- Rooms:", allRooms.length, allRooms);

      // Set the data
      setRooms(allRooms || []);
      setBookings(allBookings || []);

      // Create user lookup
      const userLookup = {};
      allUsers.forEach(u => {
        userLookup[u.id] = u;
      });
      setUsers(userLookup);

      console.log("✅ All data set successfully");

    } catch (error) {
      console.error("💥 Error loading data:", error);
      setError(`Failed to load room data: ${error.message}`);
      setRooms([]);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSaveRoom = async (roomData) => {
    try {
      let savedRoom;
      if (roomData.id) {
        savedRoom = await VenueRoom.update(roomData.id, roomData);
      } else {
        savedRoom = await VenueRoom.create(roomData);
      }
      await loadData();
    } catch (error) {
      console.error("Error saving room:", error);
      setError(`Failed to save room: ${error.message}`);
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm("Are you sure you want to delete this room? This action cannot be undone.")) {
      return;
    }

    try {
      await VenueRoom.delete(roomId);
      await loadData();
    } catch (error) {
      console.error("Error deleting room:", error);
      setError(`Failed to delete room: ${error.message}`);
    }
  };

  const handleToggleRoomActive = async (room) => {
    try {
      await VenueRoom.update(room.id, { is_active: !room.is_active });
      await loadData();
    } catch (error) {
      console.error("Error toggling room status:", error);
      setError(`Failed to update room status: ${error.message}`);
    }
  };
  
  const handlePrivateBooking = async (room, startTime, endTime, topic) => {
    try {
      const booking = await VenueBooking.create({
        room_id: room.id,
        room_name: room.name,
        room_type: room.type,
        capacity: room.capacity,
        booked_by: currentUser.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        floor_level: room.floor,
        equipment: room.equipment || [],
        booking_type: 'private',
        private_meeting_topic: topic,
        status: 'active',
      });
      await loadData();
    } catch (error) {
      console.error("Error creating private booking:", error);
      setError(`Failed to create booking: ${error.message}`);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-lg font-semibold text-gray-700">Loading Room Management...</p>
            <p className="text-sm text-gray-500 mt-2">Please wait while we fetch the data</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show access denied for non-admins
  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-600 mb-2">Access Denied</h2>
            <p className="text-gray-600">You do not have permission to view this page.</p>
            <p className="text-sm text-gray-500 mt-2">Only administrators can manage rooms.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              <Building className="w-8 h-8" />
              Room Management
            </h1>
            <p className="text-gray-600 mt-1">Add, edit, and manage venue rooms and schedules.</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <RoomFormDialog onSave={handleSaveRoom}>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Room
              </Button>
            </RoomFormDialog>
          </div>
        </header>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button variant="outline" size="sm" onClick={handleRefresh} className="ml-2">
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
          <TabsList className="grid w-fit mx-auto grid-cols-2 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <TabsTrigger value="grid" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Manage Rooms ({rooms.length})
            </TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              General Schedule
            </TabsTrigger>
          </TabsList>

          {/* Grid View */}
          <TabsContent value="grid" className="space-y-6 mt-6">
            {rooms.length === 0 ? (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Rooms Found</h3>
                  <p className="text-gray-600 mb-4">Get started by adding your first meeting room.</p>
                  <RoomFormDialog onSave={handleSaveRoom}>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Room
                    </Button>
                  </RoomFormDialog>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rooms.map((room) => (
                  <div key={room.id} className="relative">
                    <Card className={`glass-card transition-all duration-300 ${!room.is_active ? 'opacity-50' : ''} hover:shadow-xl hover:-translate-y-1 relative bg-white cursor-pointer`}
                      onClick={() => window.location.href = createPageUrl(`RoomDetail?id=${room.id}`)}
                    >
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-xl font-bold">{room.name}</CardTitle>
                            <p className="text-sm text-gray-500">
                              {room.type === 'small' ? 'Small Meeting Room' : 'Large Conference Room'}
                            </p>
                          </div>
                          <div 
                            className="flex items-center gap-2 relative z-10" 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          >
                            <Badge variant={room.is_active ? "default" : "secondary"}>
                              {room.is_active ? "Active" : "Inactive"}
                            </Badge>
                            
                            {/* More Options Menu */}
                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <RoomFormDialog room={room} onSave={handleSaveRoom}>
                                  {/* onSelect prevents the dropdown from closing immediately when a dialog is triggered */}
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Details
                                  </DropdownMenuItem>
                                </RoomFormDialog>
                                <PrivateBookingDialog room={room} onSave={handlePrivateBooking}>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <Lock className="w-4 h-4 mr-2" />
                                    Private Reserve
                                  </DropdownMenuItem>
                                </PrivateBookingDialog>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteRoom(room.id)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Room
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-600 gap-4 pt-3">
                          <span className="flex items-center gap-1.5">
                            <Users className="w-4 h-4" /> 
                            {room.capacity}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" /> 
                            Floor {room.floor}
                          </span>
                          {room.location && (
                            <span className="flex items-center gap-1.5">
                              <Building className="w-4 h-4" /> 
                              {room.location}
                            </span>
                          )}
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        {room.description && (
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase text-gray-500 flex items-center gap-1">
                              <Info className="w-3 h-3" />
                              Description
                            </Label>
                            <p className="text-sm text-gray-600">{room.description}</p>
                          </div>
                        )}
                        
                        {room.contact && (
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              Contact
                            </Label>
                            <p className="text-sm text-gray-600">{room.contact}</p>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase text-gray-500">Equipment</Label>
                          <div className="flex flex-wrap gap-2">
                            {(room.equipment || []).map(eq => {
                              const Icon = EQUIPMENT_ICONS[eq] || EditIcon;
                              return (
                                <Badge variant="outline" key={eq} className="flex items-center gap-1.5">
                                  <Icon className="w-3 h-3" /> 
                                  {eq}
                                </Badge>
                              );
                            })}
                            {(!room.equipment || room.equipment.length === 0) && (
                              <Badge variant="outline" className="text-gray-400">No equipment listed</Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="pt-4 border-t mt-4 space-y-2">
                          <div 
                            className="flex items-center justify-between relative z-10"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          >
                            <Label htmlFor={`active-switch-${room.id}`} className="text-sm font-medium">
                              Room Active
                            </Label>
                            <Switch 
                              id={`active-switch-${room.id}`} 
                              checked={room.is_active} 
                              onCheckedChange={() => handleToggleRoomActive(room)} 
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* Schedule View */}
          <TabsContent value="schedule" className="mt-6">
            <ScheduleView 
              rooms={rooms}
              bookings={bookings}
              selectedDate={selectedDate}
              onTimeSlotClick={() => {}}
              users={users}
              currentUser={currentUser}
              acceptedMeetings={[]}
              isRoomAvailable={() => false}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
