
import React, { useState, useEffect, useCallback } from 'react';
import { VenueRoom } from '@/api/entities';
import { VenueBooking } from '@/api/entities';
import { MeetingRequest } from '@/api/entities';
import { Notification } from '@/api/entities';
import { User } from '@/api/entities';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MapPin,
  Users,
  Wifi,
  Monitor,
  Coffee,
  Edit,
  CheckCircle2,
  AlertCircle,
  Users as UsersIcon,
} from "lucide-react";
import { format, addMinutes, parseISO } from 'date-fns';
import { createPageUrl } from '@/utils';

const EQUIPMENT_ICONS = {
  "Wifi": Wifi, "Projector": Monitor, "Monitor": Monitor, "Coffee": Coffee, "Whiteboard": Edit,
};

export default function BookingDialog({ meeting, currentUser, onBookingSuccess }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState({});

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [duration, setDuration] = useState(meeting.proposed_duration);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [bookingSuggestion, setBookingSuggestion] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  
  const existingBooking = bookings.find(b => b.meeting_request_id === meeting.id && b.status === 'active');

  const loadPrerequisites = useCallback(async () => {
    setLoading(true);
    try {
      const [allRooms, allBookings, allUsers] = await Promise.all([
        VenueRoom.list(),
        VenueBooking.list(),
        User.list()
      ]);
      setRooms(allRooms);
      setBookings(allBookings);

      const userLookup = {};
      allUsers.forEach(u => userLookup[u.id] = u);
      setUsers(userLookup);
      
      const count = 1 + (meeting.recipient_ids || []).length;
      setAttendeeCount(count);

      // Use the newly fetched bookings to find the existing one for this meeting
      const currentBooking = allBookings.find(b => b.meeting_request_id === meeting.id && b.status === 'active');
      if (currentBooking) {
        setSelectedDate(format(parseISO(currentBooking.start_time), 'yyyy-MM-dd'));
        setSelectedTime(format(parseISO(currentBooking.start_time), 'HH:mm'));
      }

    } catch (e) {
      console.error("Failed to load booking prerequisites", e);
    }
    setLoading(false);
  }, [meeting.id, meeting.recipient_ids]);

  useEffect(() => {
    if (open) {
      loadPrerequisites();
    }
  }, [open, loadPrerequisites]);
  
  useEffect(() => {
    setBookingSuggestion(null);
  }, [selectedDate, selectedTime, duration]);

  const isRoomAvailable = useCallback((roomId, date, startTime, durationMinutes) => {
    const requestedStart = new Date(`${date}T${startTime}`);
    const requestedEnd = addMinutes(requestedStart, durationMinutes);

    return !bookings.some(b => {
      if (b.room_id !== roomId || b.status !== 'active') return false;
      if (existingBooking && b.id === existingBooking.id) return false;

      const bookingStart = parseISO(b.start_time);
      const bookingEnd = parseISO(b.end_time);

      return (requestedStart < bookingEnd && requestedEnd > bookingStart);
    });
  }, [bookings, existingBooking]);

  const findBookingSuggestion = useCallback(() => {
    const suitableRooms = rooms.filter(r => r.is_active && r.capacity >= attendeeCount);
    if (suitableRooms.length === 0) {
      setBookingSuggestion({ error: "No rooms large enough for this meeting." });
      return;
    }
    
    let searchTime = new Date(`${selectedDate}T${selectedTime}`);
    for (let i = 0; i < 16; i++) { // Search for next 8 hours
      searchTime = addMinutes(searchTime, 30);
      const searchTimeStr = format(searchTime, 'HH:mm');

      for (const room of suitableRooms) {
        if (isRoomAvailable(room.id, format(searchTime, 'yyyy-MM-dd'), searchTimeStr, duration)) {
          setBookingSuggestion({ room, time: searchTimeStr, date: format(searchTime, 'yyyy-MM-dd') });
          return;
        }
      }
    }
    setBookingSuggestion({ error: "No alternative slots found in the next 8 hours." });
  }, [rooms, attendeeCount, selectedDate, selectedTime, duration, isRoomAvailable]);

  const bookRoom = async (room, specificDate, specificStartTime) => {
    setIsBooking(true);
    setBookingSuggestion(null);

    const date = specificDate || selectedDate;
    const time = specificStartTime || selectedTime;

    try {
      const startTime = new Date(`${date}T${time}`);
      const endTime = addMinutes(startTime, duration);

      const bookingData = {
        room_id: room.id, room_name: room.name, room_type: room.type, capacity: room.capacity,
        start_time: startTime.toISOString(), end_time: endTime.toISOString(), floor_level: room.floor,
        equipment: room.equipment, booked_by: currentUser.id, meeting_request_id: meeting.id,
        booking_type: 'meeting', status: 'active',
      };
      
      let bookingToNotify;
      if (existingBooking) {
         bookingToNotify = await VenueBooking.update(existingBooking.id, bookingData);
      } else {
         bookingToNotify = await VenueBooking.create(bookingData);
         await MeetingRequest.update(meeting.id, { venue_booking_id: bookingToNotify.id });
      }

      const participants = [meeting.requester_id, ...(meeting.recipient_ids || [])];
      for (const userId of participants) {
        if (userId === currentUser.id && !existingBooking) continue;
        const user = users[userId];
        if (user && user.notification_preferences?.booking_confirmed !== false) {
          await Notification.create({
            user_id: userId,
            type: 'booking_confirmed',
            title: existingBooking ? 'Meeting Venue Updated' : 'Venue Confirmed',
            body: `${room.name} has been ${existingBooking ? 'updated' : 'booked'} for meeting: "${meeting.proposed_topic}".`,
            link: createPageUrl("Venues"),
            related_entity_id: bookingToNotify.id,
          });
        }
      }
      
      setOpen(false);
      onBookingSuccess();
    } catch (error) {
      console.error("Error booking room:", error);
    }
    setIsBooking(false);
  };

  const getFilteredRooms = () => {
    return rooms.filter(room => {
      if (!room.is_active) return false;
      if (attendeeCount > 0 && room.capacity < attendeeCount) return false;
      return true;
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
          <MapPin className="w-4 h-4 mr-1" />
          {existingBooking ? 'Modify Booking' : 'Book Venue'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Book a Venue for: {meeting.proposed_topic}</DialogTitle>
          <DialogDescription>Select a date and time, then choose an available room.</DialogDescription>
        </DialogHeader>
        {loading ? (
            <div className="py-12 flex justify-center items-center">Loading rooms...</div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
          <div className="md:col-span-1 space-y-4">
            <Card>
              <CardHeader><CardTitle>Booking Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                 <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input id="time" type="time" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input id="duration" type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} step="15" disabled />
                </div>
                 <Alert variant="info">
                    <UsersIcon className="h-4 w-4" />
                    <AlertDescription>
                      {attendeeCount} attendees. Filtering for rooms with at least this capacity.
                    </AlertDescription>
                  </Alert>
              </CardContent>
            </Card>

            {bookingSuggestion && (
              <Alert className="mt-4 border-blue-200 bg-blue-50/80">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  {bookingSuggestion.error ? (
                    <span>{bookingSuggestion.error}</span>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span>Suggest: <strong>{bookingSuggestion.room.name}</strong> at <strong>{bookingSuggestion.time}</strong>.</span>
                      <Button size="sm" onClick={() => bookRoom(bookingSuggestion.room, bookingSuggestion.date, bookingSuggestion.time)}>Book</Button>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
          <div className="md:col-span-2 space-y-4 max-h-[60vh] overflow-y-auto">
            <h3 className="text-lg font-semibold">Available Rooms</h3>
            {getFilteredRooms().length > 0 ? getFilteredRooms().map(room => {
                const isAvailable = isRoomAvailable(room.id, selectedDate, selectedTime, duration);
                return (
                    <Card key={room.id} className="glass-card">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold">{room.name}</h4>
                          <div className="flex items-center text-sm text-gray-600 gap-3 mt-1">
                            <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {room.capacity}</span>
                            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Fl. {room.floor}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Button 
                            disabled={!isAvailable || isBooking}
                            onClick={() => isAvailable ? bookRoom(room) : findBookingSuggestion()}
                            variant={isAvailable ? "default" : "secondary"}
                          >
                             {isBooking ? 'Booking...' : isAvailable ? (existingBooking ? 'Update' : 'Book') : 'Suggest'}
                          </Button>
                          <div className={`flex items-center justify-end gap-2 mt-2 text-sm ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                              {isAvailable ? <CheckCircle2 className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
                              <span>{isAvailable ? `Available`: `Unavailable`}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                );
            }) : <p>No suitable rooms found.</p>}
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
