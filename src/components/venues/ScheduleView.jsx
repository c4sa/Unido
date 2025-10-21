import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parse, isBefore, isAfter, isSameHour, addMinutes } from "date-fns";
import { Clock, Users, MapPin, Calendar } from "lucide-react";

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"
];

export default function ScheduleView({ 
  rooms, 
  bookings, 
  selectedDate, 
  selectedMeeting,
  selectedDuration,
  onTimeSlotClick,
  users,
  editingBooking = null,
  isRoomAvailable,
  currentUser,
  acceptedMeetings
}) {
  const isSlotBooked = (roomId, timeSlot) => {
    const slotStart = new Date(`${selectedDate}T${timeSlot}`);
    const slotEnd = addMinutes(slotStart, 30);

    return bookings.some(booking => {
      if (booking.room_id !== roomId || booking.status !== 'active') return false; // Only show active bookings
      if (editingBooking && booking.id === editingBooking.id) return false;
      
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      
      return (slotStart < bookingEnd && slotEnd > bookingStart);
    });
  };

  const getBookingForSlot = (roomId, timeSlot) => {
    const slotStart = new Date(`${selectedDate}T${timeSlot}`);
    const slotEnd = addMinutes(slotStart, 30);

    return bookings.find(booking => {
      if (booking.room_id !== roomId || booking.status !== 'active') return false; // Only show active bookings
      
      if (editingBooking && booking.id === editingBooking.id) {
        const originalBookingStart = new Date(editingBooking.start_time);
        const originalBookingEnd = new Date(editingBooking.end_time);
        return (slotStart < originalBookingEnd && slotEnd > originalBookingStart);
      }

      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      
      return (slotStart < bookingEnd && slotEnd > bookingStart);
    });
  };

  const canBookSlot = (roomId, timeSlot) => {
    // Check if room is active first
    const room = rooms.find(r => r.id === roomId);
    if (!room || !room.is_active) {
      return false;
    }
    
    // Check isRoomAvailable prop if provided
    if (isRoomAvailable && !isRoomAvailable(roomId)) {
      return false;
    }
    
    // For General Schedule view (no selectedMeeting or editingBooking), 
    // show availability based on whether slot is booked
    if (!selectedMeeting && !editingBooking) {
      return !isSlotBooked(roomId, timeSlot);
    }
    
    const currentDuration = editingBooking ? editingBooking.duration_minutes : selectedDuration;
    const slotStart = new Date(`${selectedDate}T${timeSlot}`);
    
    for (let i = 0; i < currentDuration / 30; i++) {
      const checkTime = addMinutes(slotStart, i * 30);
      const timeString = format(checkTime, 'HH:mm');
      if (isSlotBooked(roomId, timeString)) {
        return false;
      }
    }
    
    return true;
  };

  const handleSlotClick = (room, timeSlot) => {
    if (!canBookSlot(room.id, timeSlot)) return;
    onTimeSlotClick(room, timeSlot);
  };

  const getMeetingParticipants = (meetingId) => {
    const meeting = acceptedMeetings.find(m => m.id === meetingId);
    if (!meeting) return '';

    const participants = [];
    if (meeting.requester_id && currentUser && meeting.requester_id !== currentUser.id) {
      participants.push(users[meeting.requester_id]?.full_name);
    }
    (meeting.recipient_ids || []).forEach(id => {
      if (id && currentUser && id !== currentUser.id) {
        participants.push(users[id]?.full_name);
      }
    });

    return participants.filter(Boolean).join(', ');
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-xl p-6 space-y-6">
      <CardHeader className="p-0">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Room Schedule - {format(parse(selectedDate, 'yyyy-MM-dd', new Date()), 'MMMM d, yyyy')}
          {editingBooking && (
            <Badge className="bg-orange-100 text-orange-800 ml-2 hover:bg-orange-100">
              Modifying Booking
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-slate-600 mt-2">
          {editingBooking 
            ? `Modifying booking for ${editingBooking.duration_minutes} minutes. Click a new time slot to move the meeting.`
            : `Click on available time slots to book. Duration: ${selectedDuration} minutes`
          }
        </p>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <div className="min-w-[1200px]">
          {/* Time Header */}
          <div className="grid grid-cols-[200px,repeat(25,minmax(60px,1fr))] gap-1 mb-4">
            <div className="p-2 font-medium text-slate-700 text-center">Room</div>
            {TIME_SLOTS.map((timeSlot) => (
              <div key={timeSlot} className="p-2 text-xs font-medium text-slate-600 text-center">
                {timeSlot}
              </div>
            ))}
          </div>

          {/* Room Rows */}
          {rooms.map((room) => (
            <div key={room.id} className="grid grid-cols-[200px,repeat(25,minmax(60px,1fr))] gap-1 mb-2">
              {/* Room Info */}
              <div className={`p-3 rounded-lg flex flex-col justify-center ${!room.is_active ? 'bg-slate-100 opacity-50' : 'bg-slate-50'}`}>
                <h3 className={`font-semibold text-sm ${!room.is_active ? 'text-slate-500' : 'text-slate-900'}`}>
                  {room.name}
                  {!room.is_active && ' (Inactive)'}
                </h3>
                <div className={`flex items-center gap-1 text-xs mt-1 ${!room.is_active ? 'text-slate-400' : 'text-slate-600'}`}>
                  <Users className="w-3 h-3" />
                  <span>{room.capacity}</span>
                  <MapPin className="w-3 h-3 ml-1" />
                  <span>Floor {room.floor}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge 
                    variant={room.type === 'small' ? 'secondary' : 'default'} 
                    className="text-xs"
                  >
                    {room.type}
                  </Badge>
                  {!room.is_active && (
                    <Badge variant="outline" className="text-xs text-slate-500 border-slate-300">
                      Not Available
                    </Badge>
                  )}
                </div>
              </div>

              {/* Time Slots */}
              {TIME_SLOTS.map((timeSlot) => {
                const booking = getBookingForSlot(room.id, timeSlot);
                const isBooked = !!booking;
                const canBook = canBookSlot(room.id, timeSlot);
                
                let bookingParticipantsDisplay = '';
                if (booking) {
                  if (booking.meeting_request_id) {
                    // Meeting booking
                    const participantsList = getMeetingParticipants(booking.meeting_request_id);
                    
                    if (participantsList) {
                      bookingParticipantsDisplay = ` (${participantsList})`;
                    } else if (currentUser && users[booking.booked_by]?.id === currentUser.id) {
                      bookingParticipantsDisplay = ' (You)';
                    }
                  } else if (booking.booking_type === 'private') {
                    // Private booking
                    if (currentUser && users[booking.booked_by]?.id === currentUser.id) {
                      bookingParticipantsDisplay = ' (You)';
                    } else {
                      bookingParticipantsDisplay = ' (Private)';
                    }
                  }
                }

                const isCurrentEditingSlot = editingBooking && booking && booking.id === editingBooking.id;

                if (isBooked) {
                  return (
                    <div
                      key={timeSlot}
                      className={`p-1 rounded flex flex-col justify-center min-h-[60px] text-center ${
                          isCurrentEditingSlot 
                              ? 'bg-orange-100 border border-orange-200' 
                              : 'bg-red-100 border border-red-200'
                      }`}
                      title={booking ? 
                        `Booked${bookingParticipantsDisplay} - ${booking.room_name}${booking.private_meeting_topic ? ` (${booking.private_meeting_topic})` : ''}` : 
                        'Occupied'
                      }
                    >
                      <div className={`text-xs font-medium truncate ${isCurrentEditingSlot ? 'text-orange-800' : 'text-red-800'}`}>
                        {isCurrentEditingSlot ? 'Your Booking' : 
                         booking.booking_type === 'private' ? 
                           `Private${bookingParticipantsDisplay}` : 
                           `Booked${bookingParticipantsDisplay}`}
                      </div>
                      {booking && (
                        <div className={`text-xs truncate ${isCurrentEditingSlot ? 'text-orange-600' : 'text-red-600'}`}>
                          {format(new Date(booking.start_time), 'HH:mm')} - {format(new Date(booking.end_time), 'HH:mm')}
                          {booking.private_meeting_topic && (
                            <div className="text-xs opacity-75 mt-1 truncate">
                              {booking.private_meeting_topic}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <button
                    key={timeSlot}
                    onClick={() => handleSlotClick(room, timeSlot)}
                    disabled={!canBook}
                    className={`p-1 rounded border min-h-[60px] transition-colors ${
                      canBook
                        ? 'bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer'
                        : 'bg-slate-50 border-slate-200 cursor-not-allowed opacity-60'
                    }`}
                    title={
                      !room.is_active
                        ? `${room.name} is inactive - not available for booking`
                        : canBook 
                          ? `Click to book ${room.name} at ${timeSlot} for ${editingBooking ? editingBooking.duration_minutes : selectedDuration} minutes`
                          : (!selectedMeeting && !editingBooking)
                            ? 'Select a meeting first or start editing'
                            : 'Cannot book - insufficient available time'
                    }
                  >
                    <div className={`text-xs font-medium ${canBook ? 'text-green-800' : 'text-slate-500'}`}>
                      {canBook ? 'Available' : 'N/A'}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
            <span className="text-xs text-slate-600">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
            <span className="text-xs text-slate-600">Booked</span>
          </div>
          {editingBooking && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-100 border border-orange-200 rounded"></div>
              <span className="text-xs text-slate-600">Your Booking (current slot)</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-slate-50 border border-slate-200 rounded opacity-60"></div>
            <span className="text-xs text-slate-600">Not Available</span>
          </div>
        </div>
      </CardContent>
    </div>
  );
}