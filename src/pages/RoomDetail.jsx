import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { VenueRoom } from "@/api/entities";
import { VenueBooking } from "@/api/entities";
import { User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  BarChart2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  CalendarDays
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
import { createPageUrl } from "@/utils";

export default function RoomDetail() {
  const [room, setRoom] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState('week');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('id');
    if (roomId) {
      loadData(roomId);
    } else {
      setError("No room ID provided.");
      setLoading(false);
    }
  }, []);

  const loadData = async (roomId) => {
    setLoading(true);
    setError(null);
    try {
      const [roomData, roomBookings, allUsers] = await Promise.all([
        VenueRoom.get(roomId),
        VenueBooking.filter({ room_id: roomId }),
        User.list(),
      ]);

      setRoom(roomData);
      setBookings(roomBookings);
      
      const userLookup = {};
      allUsers.forEach(u => userLookup[u.id] = u);
      setUsers(userLookup);

    } catch (err) {
      console.error("Failed to load room details:", err);
      setError(`Failed to load room details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getEventsForDate = (date) => {
    return bookings
      .filter(booking => isSameDay(parseISO(booking.start_time), date))
      .sort((a, b) => parseISO(a.start_time) - parseISO(b.start_time));
  };
  
  const calculateStats = () => {
    if (!bookings || bookings.length === 0) {
      return { totalBookings: 0, totalHours: 0 };
    }
    const totalBookings = bookings.length;
    const totalHours = bookings.reduce((acc, booking) => {
      const start = parseISO(booking.start_time);
      const end = parseISO(booking.end_time);
      const durationHours = (end - start) / (1000 * 60 * 60);
      return acc + durationHours;
    }, 0);

    return { totalBookings, totalHours: totalHours.toFixed(1) };
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

  const getViewTitle = () => {
    switch (viewType) {
      case 'day': return format(currentDate, 'EEEE, MMMM d, yyyy');
      case 'week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      case 'month': return format(currentDate, 'MMMM yyyy');
      default: return '';
    }
  };

  const viewDates = (() => {
    switch (viewType) {
      case 'day': return [currentDate];
      case 'week':
        return eachDayOfInterval({ 
          start: startOfWeek(currentDate, { weekStartsOn: 1 }), 
          end: endOfWeek(currentDate, { weekStartsOn: 1 }) 
        });
      case 'month':
        return eachDayOfInterval({ 
          start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }), 
          end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }) 
        });
      default: return [];
    }
  })();

  if (loading) {
    return <div className="p-8 text-center">Loading room details...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Rooms")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{room.name}</h1>
              <p className="text-gray-600">Detailed schedule and usage statistics.</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-blue-600" />
                Room Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">Total Bookings</span>
                <span className="font-bold text-lg text-gray-900">{stats.totalBookings}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">Total Hours Booked</span>
                <span className="font-bold text-lg text-gray-900">{stats.totalHours}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <Tabs value={viewType} onValueChange={setViewType} className="w-full md:w-auto">
                <TabsList className="grid w-full grid-cols-3 md:w-auto">
                  <TabsTrigger value="day">Day</TabsTrigger>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('prev')}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
                <Button variant="outline" size="sm" onClick={() => navigate('next')}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="mt-4">
              <h2 className="text-xl font-semibold text-slate-900">{getViewTitle()}</h2>
            </div>
          </CardHeader>
          <CardContent>
            {/* Calendar View */}
            {viewType === 'month' && (
              <div className="grid grid-cols-7 gap-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <div key={day} className="p-2 text-center font-medium text-slate-600 text-sm">{day}</div>)}
                {viewDates.map((date, index) => {
                  const events = getEventsForDate(date);
                  return (
                    <div key={index} className={`p-2 min-h-[80px] rounded-lg border ${isSameMonth(date, currentDate) ? 'bg-white' : 'bg-slate-50 text-slate-400'}`}>
                      <div className={`font-medium mb-1 ${isToday(date) ? 'text-blue-600' : ''}`}>{format(date, 'd')}</div>
                      <div className="space-y-1">
                        {events.map(event => (
                          <div key={event.id} className="text-xs px-1 py-0.5 rounded bg-blue-100 text-blue-800 truncate">
                            {event.private_meeting_topic || `Meeting ${event.meeting_request_id?.slice(-4) || ''}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {(viewType === 'week' || viewType === 'day') && (
              <div className={`grid gap-4 ${viewType === 'day' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-7'}`}>
                {viewDates.map(day => {
                  const events = getEventsForDate(day);
                  return (
                    <Card key={day.toISOString()} className={`bg-white/80 ${isToday(day) ? 'ring-2 ring-blue-500' : ''}`}>
                      <CardHeader className="pb-3 text-center">
                        <p className="text-sm font-medium">{format(day, 'EEE')}</p>
                        <p className="text-2xl font-bold">{format(day, 'd')}</p>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {events.length > 0 ? events.map(event => (
                          <div key={event.id} className="p-2 rounded-lg bg-blue-50 text-blue-800 text-sm">
                            <div className="font-medium truncate">{event.private_meeting_topic || users[event.booked_by]?.full_name || 'Booked'}</div>
                            <div className="text-xs opacity-90">{`${format(parseISO(event.start_time), 'HH:mm')} - ${format(parseISO(event.end_time), 'HH:mm')}`}</div>
                          </div>
                        )) : <div className="text-center py-4 text-slate-400 text-xs">No events</div>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}