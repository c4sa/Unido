import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { MeetingRequest } from "@/api/entities";
import { VenueBooking } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
  Plus,
  Grid3X3,
  Calendar,
  CalendarDays,
  X,
  ArrowLeft
} from "lucide-react";
import { 
  format, 
  addDays, 
  addWeeks, 
  addMonths,
  startOfWeek, 
  endOfWeek, 
  startOfMonth,
  endOfMonth,
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth,
  parseISO,
  isToday
} from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Schedule() {
  const [currentUser, setCurrentUser] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState('week');
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);

      const [allUsers, allMeetings, allBookings] = await Promise.all([
        User.list(),
        MeetingRequest.list('-created_date'),
        VenueBooking.list('-created_date')
      ]);

      const userLookup = {};
      allUsers.forEach(u => {
        userLookup[u.id] = u;
      });
      setUsers(userLookup);

      // Get user's accepted meetings
      const userMeetings = allMeetings.filter(meeting =>
        ((meeting.recipient_ids || []).includes(user.id) || meeting.requester_id === user.id) &&
        meeting.status === 'accepted'
      );
      setMeetings(userMeetings);

      // Get user's active bookings
      const myMeetingIds = new Set(userMeetings.map(m => m.id));
      const userBookings = allBookings.filter(booking =>
        booking.status === 'active' && myMeetingIds.has(booking.meeting_request_id)
      );
      setBookings(userBookings);

    } catch (error) {
      console.error("Error loading schedule data:", error);
    }
    setLoading(false);
  };

  const getViewDates = () => {
    switch (viewType) {
      case 'day':
        return [currentDate];
      case 'week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: weekStart, end: weekEnd });
      case 'month':
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
      default:
        return [];
    }
  };

  const getEventsForDate = (date) => {
    const events = [];

    // Add bookings as events
    bookings.forEach(booking => {
      if (isSameDay(parseISO(booking.start_time), date)) {
        const meeting = meetings.find(m => m.id === booking.meeting_request_id);
        if (meeting) {
          const otherParticipants = [
            meeting.requester_id,
            ...(meeting.recipient_ids || [])
          ]
            .filter(id => id !== currentUser?.id)
            .map(id => users[id])
            .filter(Boolean);

          events.push({
            id: booking.id,
            type: 'booking',
            title: meeting.proposed_topic,
            subtitle: `${booking.room_name} - Floor ${booking.floor_level}`,
            time: `${format(parseISO(booking.start_time), 'HH:mm')} - ${format(parseISO(booking.end_time), 'HH:mm')}`,
            fullTime: {
              start: parseISO(booking.start_time),
              end: parseISO(booking.end_time)
            },
            participants: otherParticipants,
            meeting_code: meeting.meeting_code,
            duration: meeting.proposed_duration,
            color: 'bg-blue-500',
            meeting: meeting,
            booking: booking
          });
        }
      }
    });

    // Add meetings without bookings as events
    meetings.forEach(meeting => {
      if (meeting.scheduled_time && isSameDay(parseISO(meeting.scheduled_time), date)) {
        const hasBooking = bookings.some(b => b.meeting_request_id === meeting.id);
        if (!hasBooking) {
          const otherParticipants = [
            meeting.requester_id,
            ...(meeting.recipient_ids || [])
          ]
            .filter(id => id !== currentUser?.id)
            .map(id => users[id])
            .filter(Boolean);

          events.push({
            id: meeting.id,
            type: 'meeting',
            title: meeting.proposed_topic,
            subtitle: 'No venue booked',
            time: format(parseISO(meeting.scheduled_time), 'HH:mm'),
            fullTime: {
              start: parseISO(meeting.scheduled_time),
              end: addDays(parseISO(meeting.scheduled_time), meeting.proposed_duration / (24 * 60))
            },
            participants: otherParticipants,
            meeting_code: meeting.meeting_code,
            duration: meeting.proposed_duration,
            color: 'bg-orange-500',
            meeting: meeting
          });
        }
      }
    });

    return events.sort((a, b) => {
      if (a.fullTime && b.fullTime) {
        return a.fullTime.start - b.fullTime.start;
      }
      return a.time.localeCompare(b.time);
    });
  };

  const navigate = (direction) => {
    switch (viewType) {
      case 'day':
        setCurrentDate(prev => addDays(prev, direction === 'next' ? 1 : -1));
        break;
      case 'week':
        setCurrentDate(prev => addWeeks(prev, direction === 'next' ? 1 : -1));
        break;
      case 'month':
        setCurrentDate(prev => addMonths(prev, direction === 'next' ? 1 : -1));
        break;
    }
  };

  const handleDayClick = (date) => {
    setSelectedDay(date);
  };

  const getViewTitle = () => {
    switch (viewType) {
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      case 'week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-64"></div>
            <div className="grid grid-cols-7 gap-4">
              {[1,2,3,4,5,6,7].map(i => (
                <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const viewDates = getViewDates();
  const totalEvents = bookings.length + meetings.filter(m => m.scheduled_time && !bookings.some(b => b.meeting_request_id === m.id)).length;

  // Day Detail View
  if (selectedDay) {
    const dayEvents = getEventsForDate(selectedDay);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Day View Header */}
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setSelectedDay(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to {viewType}
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900">
                {format(selectedDay, 'EEEE, MMMM d, yyyy')}
              </h1>
              <p className="text-slate-600">{dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''} scheduled</p>
            </div>
          </div>

          {/* Day Timeline */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-blue-600" />
                Daily Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dayEvents.length > 0 ? (
                <div className="space-y-4">
                  {dayEvents.map((event) => (
                    <div key={event.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${event.color.replace('bg-', 'bg-')} mb-2`}></div>
                        <div className="w-px h-full bg-slate-200"></div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-900 mb-1">{event.title}</h3>
                            <p className="text-sm text-slate-600 mb-2">{event.time}</p>
                            <p className="text-sm text-slate-600">{event.subtitle}</p>
                            {event.participants.length > 0 && (
                              <p className="text-sm text-slate-500 mt-1">
                                With: {event.participants.map(p => p.full_name).join(', ')}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {event.meeting_code}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No events scheduled</h3>
                  <p className="text-slate-600">This day is free for new meetings</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header with View Switcher */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Schedule</h1>
            <p className="text-slate-600 mt-1">View your upcoming meetings and venue bookings</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge className="bg-blue-100 text-blue-800">
              {totalEvents} upcoming event{totalEvents !== 1 ? 's' : ''}
            </Badge>
            <Link to={createPageUrl("Meetings")}>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Meeting
              </Button>
            </Link>
          </div>
        </div>

        {/* View Type Selector */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <Tabs value={viewType} onValueChange={setViewType} className="w-full md:w-auto">
                <TabsList className="grid w-full grid-cols-3 md:w-auto">
                  <TabsTrigger value="day" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Day
                  </TabsTrigger>
                  <TabsTrigger value="week" className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    Week
                  </TabsTrigger>
                  <TabsTrigger value="month" className="flex items-center gap-2">
                    <Grid3X3 className="w-4 h-4" />
                    Month
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('prev')}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('next')}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="mt-4">
              <h2 className="text-xl font-semibold text-slate-900">{getViewTitle()}</h2>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Views */}
        {viewType === 'month' && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="p-2 text-center font-medium text-slate-600 text-sm">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {viewDates.map((date, index) => {
                  const events = getEventsForDate(date);
                  const isCurrentMonth = isSameMonth(date, currentDate);
                  const isDateToday = isToday(date);

                  return (
                    <div
                      key={index}
                      className={`p-2 min-h-[80px] cursor-pointer rounded-lg border transition-all hover:bg-slate-50 ${
                        isCurrentMonth ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 text-slate-400'
                      } ${isDateToday ? 'ring-2 ring-blue-500' : ''}`}
                      onClick={() => isCurrentMonth && handleDayClick(date)}
                    >
                      <div className={`text-sm font-medium mb-1 ${isDateToday ? 'text-blue-600' : ''}`}>
                        {format(date, 'd')}
                      </div>
                      <div className="space-y-1">
                        {events.slice(0, 2).map((event, idx) => (
                          <div
                            key={idx}
                            className={`text-xs px-1 py-0.5 rounded text-white truncate ${event.color}`}
                          >
                            {event.title}
                          </div>
                        ))}
                        {events.length > 2 && (
                          <div className="text-xs text-slate-500">
                            +{events.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {(viewType === 'week' || viewType === 'day') && (
          <div className={`grid gap-4 ${viewType === 'day' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-7'}`}>
            {viewDates.map((day) => {
              const events = getEventsForDate(day);
              const isDateToday = isToday(day);

              return (
                <Card 
                  key={day.toISOString()} 
                  className={`bg-white/80 backdrop-blur-sm border-0 shadow-lg cursor-pointer hover:shadow-xl transition-all ${
                    isDateToday ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => handleDayClick(day)}
                >
                  <CardHeader className="pb-3">
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-600">
                        {format(day, 'EEEE')}
                      </p>
                      <p className={`text-2xl font-bold ${isDateToday ? 'text-blue-600' : 'text-slate-900'}`}>
                        {format(day, 'd')}
                      </p>
                      {viewType === 'day' && (
                        <p className="text-sm text-slate-500 mt-1">
                          {format(day, 'MMMM yyyy')}
                        </p>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {events.length > 0 ? (
                      events.map((event) => (
                        <div key={event.id} className={`p-3 rounded-lg text-white ${event.color} text-sm`}>
                          <div className="font-medium truncate mb-1">
                            {event.title}
                          </div>
                          <div className="text-xs opacity-90 mb-1">
                            {event.time}
                          </div>
                          <div className="text-xs opacity-80 truncate">
                            {event.subtitle}
                          </div>
                          {event.participants.length > 0 && (
                            <div className="text-xs opacity-80 mt-1 truncate">
                              With: {event.participants.map(p => p.full_name).join(', ')}
                            </div>
                          )}
                          <Badge variant="outline" className="text-xs mt-1 bg-white/20 border-white/30 text-white">
                            {event.meeting_code}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-slate-400">
                        <CalendarIcon className="w-6 h-6 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No events</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <CalendarIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-900">{meetings.length}</p>
              <p className="text-sm text-slate-600">Accepted Meetings</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <MapPin className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-900">{bookings.length}</p>
              <p className="text-sm text-slate-600">Venue Bookings</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <Clock className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-900">
                {meetings.reduce((total, meeting) => total + (meeting.proposed_duration || 0), 0)}
              </p>
              <p className="text-sm text-slate-600">Total Minutes Scheduled</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}