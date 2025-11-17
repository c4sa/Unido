import React, { useState, useEffect } from "react";
import { Event } from "@/api/entities";
import { User } from "@/api/entities";
import { supabase } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  Filter,
  CalendarDays,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  User as UserIcon,
  Building2,
  Image as ImageIcon,
  X,
  Phone,
  Layers,
  Wifi,
  Monitor,
  Coffee
} from "lucide-react";
import { format, parseISO, isPast, isToday, isFuture } from "date-fns";

export default function Events() {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [bookmarking, setBookmarking] = useState(false);
  const [dateFilter, setDateFilter] = useState('all'); // all, upcoming, past, today
  const [eventRoom, setEventRoom] = useState(null);
  const [loadingRoom, setLoadingRoom] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, searchTerm, dateFilter]);

  // Load room details when event is selected
  useEffect(() => {
    if (selectedEvent && selectedEvent.room_id) {
      loadRoomDetails(selectedEvent.room_id);
    } else {
      setEventRoom(null);
    }
  }, [selectedEvent]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const [eventsData, user] = await Promise.all([
        Event.list('-start_time'),
        User.me().catch(() => null)
      ]);
      
      setEvents(eventsData || []);
      setCurrentUser(user);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadRoomDetails = async (roomId) => {
    try {
      setLoadingRoom(true);
      const { data, error } = await supabase
        .from('event_rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      
      if (error) throw error;
      setEventRoom(data);
    } catch (error) {
      console.error("Error loading room details:", error);
      setEventRoom(null);
    } finally {
      setLoadingRoom(false);
    }
  };

  const filterEvents = () => {
    let filtered = [...events];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(event =>
        event.title?.toLowerCase().includes(searchLower) ||
        event.organizer?.toLowerCase().includes(searchLower) ||
        event.venue?.toLowerCase().includes(searchLower)
      );
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(event => {
        if (!event.start_time) return false;
        const startDate = parseISO(event.start_time);
        
        switch (dateFilter) {
          case 'upcoming':
            return isFuture(startDate) || isToday(startDate);
          case 'past':
            return isPast(startDate) && !isToday(startDate);
          case 'today':
            return isToday(startDate);
          default:
            return true;
        }
      });
    }

    setFilteredEvents(filtered);
  };

  const handleBookmark = async (event, e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation(); // Prevent card click
    }
    
    if (!currentUser) {
      alert('Please log in to bookmark events');
      return;
    }

    setBookmarking(true);
    try {
      const updatedEvent = await Event.toggleBookmark(event.id, currentUser.id);
      
      // Update local state without reloading
      setEvents(prevEvents => 
        prevEvents.map(e => e.id === event.id ? updatedEvent : e)
      );
      
      // Update selected event if it's the same one
      if (selectedEvent && selectedEvent.id === event.id) {
        setSelectedEvent(updatedEvent);
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      alert('Failed to update bookmark');
    } finally {
      setBookmarking(false);
    }
  };

  const isBookmarked = (event) => {
    if (!currentUser || !event.bookmarked_by) return false;
    return event.bookmarked_by.includes(currentUser.id);
  };

  const getEventStatus = (event) => {
    if (!event.start_time) return { label: 'Unknown', color: 'bg-gray-500' };
    
    const startDate = parseISO(event.start_time);
    const endDate = event.end_time ? parseISO(event.end_time) : null;
    const now = new Date();

    if (isPast(endDate || startDate)) {
      return { label: 'Past', color: 'bg-gray-500' };
    } else if (isToday(startDate)) {
      return { label: 'Today', color: 'bg-blue-500' };
    } else if (isFuture(startDate)) {
      return { label: 'Upcoming', color: 'bg-green-500' };
    }
    
    return { label: 'Ongoing', color: 'bg-orange-500' };
  };

  const formatEventDate = (dateString) => {
    if (!dateString) return 'Date TBA';
    try {
      const date = parseISO(dateString);
      return format(date, 'MMM d, yyyy');
    } catch {
      return 'Date TBA';
    }
  };

  const formatEventTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = parseISO(dateString);
      return format(date, 'h:mm a');
    } catch {
      return '';
    }
  };

  const formatEventDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return '';
    try {
      const start = parseISO(startTime);
      const end = parseISO(endTime);
      const diffMs = end - start;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffHours > 0) {
        return `${diffHours}h ${diffMinutes > 0 ? `${diffMinutes}m` : ''}`;
      }
      return `${diffMinutes}m`;
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-96 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Events</h1>
            <p className="text-slate-600 mt-1">Discover and explore upcoming events</p>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-slate-600">{filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search events by title, organizer, or venue..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Events</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="today">Today</option>
                  <option value="past">Past Events</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events Grid */}
        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => {
              const status = getEventStatus(event);
              const bookmarked = isBookmarked(event);
              
              return (
                <Card
                  key={event.id}
                  className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden"
                  onClick={() => setSelectedEvent(event)}
                >
                  {/* Event Image */}
                  <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500">
                    {event.image ? (
                      <img
                        src={event.image}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 ${event.image ? 'hidden' : 'flex'}`}
                    >
                      <CalendarDays className="w-16 h-16 text-white/30" />
                    </div>
                    
                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                      <Badge className={`${status.color} text-white border-0`}>
                        {status.label}
                      </Badge>
                    </div>

                    {/* Bookmark Button */}
                    {currentUser && (
                      <button
                        onClick={(e) => handleBookmark(event, e)}
                        className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all duration-200 z-10"
                        disabled={bookmarking}
                      >
                        {bookmarked ? (
                          <BookmarkCheck className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                        ) : (
                          <Bookmark className="w-5 h-5 text-slate-600" />
                        )}
                      </button>
                    )}
                  </div>

                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg line-clamp-2 min-h-[3.5rem]">
                      {event.title || 'Untitled Event'}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-slate-600 mt-2">
                      <UserIcon className="w-4 h-4" />
                      <span className="truncate">{event.organizer || 'Organizer TBA'}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>{formatEventDate(event.start_time)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock className="w-4 h-4 text-purple-600" />
                      <span>
                        {formatEventTime(event.start_time)}
                        {event.end_time && ` - ${formatEventTime(event.end_time)}`}
                        {event.end_time && ` (${formatEventDuration(event.start_time, event.end_time)})`}
                      </span>
                    </div>

                    {event.venue && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-4 h-4 text-red-600" />
                        <span className="truncate">{event.venue}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t">
                      <Button 
                        variant="outline" 
                        className="w-full group-hover:bg-blue-50 group-hover:border-blue-300 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <CalendarDays className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No events found</h3>
              <p className="text-slate-600">
                {searchTerm || dateFilter !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Events will appear here when they are added to the platform'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Event Detail Dialog */}
        {selectedEvent && (
          <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <DialogTitle className="text-2xl mb-2">{selectedEvent.title || 'Untitled Event'}</DialogTitle>
                    <DialogDescription className="text-base">
                      {selectedEvent.organizer || 'Organizer TBA'}
                    </DialogDescription>
                  </div>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Event Image */}
                {selectedEvent.image && (
                  <div className="relative h-64 w-full rounded-lg overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500">
                    <img
                      src={selectedEvent.image}
                      alt={selectedEvent.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 hidden">
                      <CalendarDays className="w-24 h-24 text-white/30" />
                    </div>
                  </div>
                )}

                {/* Event Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Date</p>
                      <p className="text-sm text-slate-600">{formatEventDate(selectedEvent.start_time)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                    <Clock className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Time</p>
                      <p className="text-sm text-slate-600">
                        {formatEventTime(selectedEvent.start_time)}
                        {selectedEvent.end_time && ` - ${formatEventTime(selectedEvent.end_time)}`}
                      </p>
                      {selectedEvent.end_time && (
                        <p className="text-xs text-slate-500 mt-1">
                          Duration: {formatEventDuration(selectedEvent.start_time, selectedEvent.end_time)}
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedEvent.venue && (
                    <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
                      <MapPin className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">Venue</p>
                        <p className="text-sm text-slate-600">{selectedEvent.venue}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                    <UserIcon className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Organizer</p>
                      <p className="text-sm text-slate-600">{selectedEvent.organizer || 'Organizer TBA'}</p>
                    </div>
                  </div>
                </div>

                {/* Status and Bookmark */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge className={`${getEventStatus(selectedEvent).color} text-white border-0`}>
                      {getEventStatus(selectedEvent).label}
                    </Badge>
                    {selectedEvent.bookmarked_by && selectedEvent.bookmarked_by.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <BookmarkCheck className="w-3 h-3 mr-1" />
                        {selectedEvent.bookmarked_by.length} bookmark{selectedEvent.bookmarked_by.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  {currentUser && (
                    <Button
                      variant="outline"
                      onClick={() => handleBookmark(selectedEvent, { stopPropagation: () => {} })}
                      disabled={bookmarking}
                      className="flex items-center gap-2"
                    >
                      {isBookmarked(selectedEvent) ? (
                        <>
                          <BookmarkCheck className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          Bookmarked
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-4 h-4" />
                          Bookmark
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Room Details */}
                {selectedEvent.room_id && (
                  <div className="border-t pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Building2 className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-lg font-semibold text-slate-900">Room Details</h3>
                    </div>
                    
                    {loadingRoom ? (
                      <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                        <p className="text-sm text-slate-600">Loading room details...</p>
                      </div>
                    ) : eventRoom ? (
                      <div className="space-y-4">
                        {/* Room Name and Type */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-lg">
                            <Building2 className="w-5 h-5 text-indigo-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-slate-700">Room Name</p>
                              <p className="text-sm text-slate-600 font-semibold">{eventRoom.name || 'N/A'}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                            <Layers className="w-5 h-5 text-purple-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-slate-700">Type</p>
                              <p className="text-sm text-slate-600 capitalize">{eventRoom.type || 'N/A'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Capacity and Floor */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                            <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-slate-700">Capacity</p>
                              <p className="text-sm text-slate-600">{eventRoom.capacity || 'N/A'} people</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                            <Layers className="w-5 h-5 text-green-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-slate-700">Floor</p>
                              <p className="text-sm text-slate-600">Floor {eventRoom.floor || 'N/A'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Location and Contact */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {eventRoom.location && (
                            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
                              <MapPin className="w-5 h-5 text-red-600 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-slate-700">Location</p>
                                <p className="text-sm text-slate-600">{eventRoom.location}</p>
                              </div>
                            </div>
                          )}

                          {eventRoom.contact && (
                            <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg">
                              <Phone className="w-5 h-5 text-orange-600 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-slate-700">Contact</p>
                                <p className="text-sm text-slate-600">{eventRoom.contact}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Description */}
                        {eventRoom.description && (
                          <div className="p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm font-medium text-slate-700 mb-2">Description</p>
                            <p className="text-sm text-slate-600">{eventRoom.description}</p>
                          </div>
                        )}

                        {/* Equipment */}
                        {eventRoom.equipment && eventRoom.equipment.length > 0 && (
                          <div className="p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm font-medium text-slate-700 mb-3">Available Equipment</p>
                            <div className="flex flex-wrap gap-2">
                              {eventRoom.equipment.map((item, idx) => {
                                const equipmentIcons = {
                                  'sound': Wifi,
                                  'projector': Monitor,
                                  'sitting': Users,
                                  'multimedia': Monitor,
                                  'wifi': Wifi,
                                  'coffee': Coffee
                                };
                                const IconComponent = equipmentIcons[item.toLowerCase()] || Building2;
                                
                                return (
                                  <Badge key={idx} variant="outline" className="flex items-center gap-1 px-3 py-1">
                                    <IconComponent className="w-3 h-3" />
                                    <span className="capitalize">{item}</span>
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Active Status */}
                        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                          <div className={`w-2 h-2 rounded-full ${eventRoom.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          <span className="text-sm text-slate-600">
                            {eventRoom.is_active ? 'Room is currently active' : 'Room is currently inactive'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-slate-50 rounded-lg">
                        <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-600">Room details not available</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
