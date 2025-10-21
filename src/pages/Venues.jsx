
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { VenueBooking } from "@/api/entities";
import { MeetingRequest } from "@/api/entities";
import { VenueRoom } from "@/api/entities";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ScheduleView from "../components/venues/ScheduleView";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { format, addDays, subDays } from "date-fns";

export default function Venues() {
  const [currentUser, setCurrentUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [acceptedMeetings, setAcceptedMeetings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState({});
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("🔄 Loading venue data...");
      
      const user = await User.me();
      console.log("👤 Current user loaded:", user);
      setCurrentUser(user);

      const [allUsers, allBookings, allRequests, allRooms] = await Promise.all([
        User.list().catch(err => {
          console.error("Error loading users:", err);
          return [];
        }),
        VenueBooking.list('-created_date').catch(err => {
          console.error("Error loading bookings:", err);
          return [];
        }),
        MeetingRequest.list().catch(err => {
          console.error("Error loading meeting requests:", err);
          return [];
        }),
        VenueRoom.list().catch(err => {
          console.error("Error loading rooms:", err);
          return [];
        })
      ]);

      console.log("📊 Venue data loaded:");
      console.log("- Users:", allUsers.length);
      console.log("- Bookings:", allBookings.length);
      console.log("- Requests:", allRequests.length);
      console.log("- Rooms:", allRooms.length, allRooms);

      // Set active rooms only
      setRooms(allRooms.filter(r => r.is_active));

      // Create user lookup
      const userLookup = {};
      allUsers.forEach(u => {
        userLookup[u.id] = u;
      });
      setUsers(userLookup);

      // Set active bookings only
      setBookings(allBookings.filter(b => b.status === 'active'));

      // Get user's accepted meetings
      const userMeetings = allRequests.filter(req =>
        req.status === 'accepted' && 
        ((req.recipient_ids || []).includes(user.id) || req.requester_id === user.id)
      );
      setAcceptedMeetings(userMeetings);

      console.log("✅ Venue data set successfully");

    } catch (error) {
      console.error("💥 Error loading venue data:", error);
      setError(`Failed to load venue data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-lg font-semibold text-gray-700">Loading Venue Schedule...</p>
            <p className="text-sm text-gray-500 mt-2">Please wait while we fetch the data</p>
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
              <Calendar className="w-8 h-8" />
              Venue Schedule
            </h1>
            <p className="text-gray-600 mt-1">View the schedule for all available rooms.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => handleDateChange(format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd'))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => handleDateChange(e.target.value)} 
              className="w-fit"
            />
            <Button 
              variant="outline" 
              onClick={() => handleDateChange(format(addDays(new Date(selectedDate), 1), 'yyyy-MM-dd'))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
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

        {/* Schedule View */}
        <Card className="glass-card">
          <CardContent className="p-4">
            {rooms.length > 0 ? (
              <ScheduleView 
                rooms={rooms}
                bookings={bookings}
                selectedDate={selectedDate}
                users={users}
                currentUser={currentUser}
                acceptedMeetings={acceptedMeetings}
                onTimeSlotClick={() => {}}
                isRoomAvailable={() => true}
              />
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Rooms Available</h3>
                <p className="text-gray-600 mb-4">There are no active rooms to display in the schedule.</p>
                <Button variant="outline" onClick={handleRefresh}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Data
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
