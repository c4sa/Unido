
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { MeetingRequest } from "@/api/entities";
import { ChatMessage } from "@/api/entities";
import { VenueBooking } from "@/api/entities";
import { Notification } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Shield,
  User as UserIcon,
  Calendar,
  MessageSquare,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  TrendingUp,
  Wifi,
  Monitor,
  Coffee,
  Edit,
  Send,
  Plus,
  BarChart2,
  EyeOff
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from 'date-fns';

const EQUIPMENT_ICONS = {
  "Wifi": Wifi,
  "Projector": Monitor,
  "Monitor": Monitor,
  "Coffee": Coffee
};

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [stats, setStats] = useState({
    pendingRequests: 0,
    acceptedMeetings: 0,
    unreadMessages: 0,
    activeBookings: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [meetingRequests, setMeetingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState({});
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [mostReservedRooms, setMostReservedRooms] = useState([]);
  const [modifyForm, setModifyForm] = useState({
    proposed_topic: '',
    proposed_duration: 45,
    personal_message: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleEditMeeting = (meeting) => {
    setEditingMeeting(meeting);
    setModifyForm({
      proposed_topic: meeting.proposed_topic || '',
      proposed_duration: meeting.proposed_duration || 45,
      personal_message: meeting.personal_message || ''
    });
  };

  const handleSaveModification = async () => {
    if (!editingMeeting || !modifyForm.proposed_topic) return;

    setSaving(true);
    try {
      await MeetingRequest.update(editingMeeting.id, {
        proposed_topic: modifyForm.proposed_topic,
        proposed_duration: modifyForm.proposed_duration,
        personal_message: modifyForm.personal_message
      });

      // Notify the other participant(s) about the change
      const participantsToNotify = [
        editingMeeting.requester_id,
        ...(editingMeeting.recipient_ids || []),
      ].filter((id) => id !== currentUser.id);

      for (const participantId of participantsToNotify) {
        const otherUser = users[participantId];
        if (otherUser?.notification_preferences?.request_status_update !== false) {
          await Notification.create({
            user_id: participantId,
            type: 'request_status_update',
            title: 'Meeting Details Updated',
            body: `${currentUser.full_name} has updated the details for your meeting "${modifyForm.proposed_topic}" (Code: ${editingMeeting.meeting_code}).`,
            link: createPageUrl("Meetings"),
            related_entity_id: editingMeeting.id,
          });
        }
      }

      setEditingMeeting(null);
      await loadDashboardData();
    } catch (error) {
      console.error("Error updating meeting:", error);
    }
    setSaving(false);
  };

  const loadDashboardData = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);

      // Load all data in parallel for better performance
      const [allUsers, allMeetingRequests, allMessages, allBookings] = await Promise.all([
        User.list(),
        MeetingRequest.list('-created_date'),
        ChatMessage.list('-created_date'),
        VenueBooking.list('-created_date')
      ]);

      setMeetingRequests(allMeetingRequests);

      // Create user lookup map
      const userLookup = {};
      allUsers.forEach(u => {
        userLookup[u.id] = u;
      });
      setUsers(userLookup);

      // Filter data for current user
      const userMeetingRequests = allMeetingRequests.filter(req =>
        req.requester_id === user.id || (req.recipient_ids || []).includes(user.id)
      );

      const userMessages = allMessages.filter(msg =>
        msg.sender_id === user.id || msg.recipient_id === user.id
      );

      // Calculate statistics
      const pendingRequests = userMeetingRequests.filter(req =>
        (req.recipient_ids || []).includes(user.id) && req.status === 'pending'
      ).length;

      const acceptedMeetings = userMeetingRequests.filter(req =>
        req.status === 'accepted'
      ).length;

      const unreadMessages = userMessages.filter(msg =>
        msg.recipient_id === user.id && !msg.read_status
      ).length;

      // Get upcoming bookings (future active bookings for user's meetings)
      const now = new Date();
      const acceptedMeetingIds = new Set(
        userMeetingRequests
          .filter(req => req.status === 'accepted')
          .map(req => req.id)
      );

      const userUpcomingBookings = allBookings.filter(booking => {
        const bookingStart = new Date(booking.start_time);
        return (
          booking.status === 'active' &&
          bookingStart > now &&
          (booking.booked_by === user.id || acceptedMeetingIds.has(booking.meeting_request_id))
        );
      }).sort((a, b) => new Date(a.start_time) - new Date(a.start_time));

      setUpcomingBookings(userUpcomingBookings);

      // Calculate most reserved rooms
      const roomCounts = allBookings
        .filter(b => b.status === 'active')
        .reduce((acc, booking) => {
            acc[booking.room_name] = (acc[booking.room_name] || 0) + 1;
            return acc;
        }, {});
      
      const sortedRooms = Object.entries(roomCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);
      setMostReservedRooms(sortedRooms);


      setStats({
        pendingRequests,
        acceptedMeetings,
        unreadMessages,
        activeBookings: userUpcomingBookings.length
      });

      // Build recent activity
      const activities = [];

      // Recent meeting requests (last 7 days)
      const recentMeetings = userMeetingRequests
        .filter(req => {
          const daysSinceUpdate = (now - new Date(req.updated_date || req.created_date)) / (1000 * 60 * 60 * 24);
          return daysSinceUpdate <= 7;
        })
        .sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date))
        .slice(0, 5);

      recentMeetings.forEach(meeting => {
        const isRequester = meeting.requester_id === user.id;
        const otherParties = (meeting.recipient_ids || []).map(id => userLookup[id]).filter(Boolean);

        activities.push({
          id: `meeting-${meeting.id}`,
          type: 'meeting_request',
          timestamp: meeting.updated_date || meeting.created_date,
          title: meeting.proposed_topic || 'Meeting Request',
          description: isRequester
            ? `Request sent to ${otherParties.length > 1 ? `${otherParties.length} users` : otherParties[0]?.full_name}`
            : `Request from ${userLookup[meeting.requester_id]?.full_name || 'user'}`,
          status: meeting.status,
          data: meeting
        });
      });

      // Recent messages (last 5)
      const recentMessages = userMessages
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .slice(0, 5);

      recentMessages.forEach(message => {
        const isSender = message.sender_id === user.id;
        const otherParty = userLookup[isSender ? message.recipient_id : message.sender_id];

        activities.push({
          id: `message-${message.id}`,
          type: 'message',
          timestamp: message.created_date,
          title: isSender ? 'Message sent' : 'Message received',
          description: `${isSender ? 'To' : 'From'} ${otherParty?.full_name || 'user'}`,
          status: message.read_status ? 'read' : 'unread',
          data: message
        });
      });

      // Recent bookings (last 3)
      userUpcomingBookings.slice(0, 3).forEach(booking => {
        const relatedMeeting = userMeetingRequests.find(m => m.id === booking.meeting_request_id);
        const bookedBy = userLookup[booking.booked_by];

        activities.push({
          id: `booking-${booking.id}`,
          type: 'booking',
          timestamp: booking.created_date,
          title: `${booking.room_name} booked`,
          description: `By ${bookedBy?.full_name || 'user'} for ${format(new Date(booking.start_time), 'MMM d')}`,
          status: booking.status,
          data: booking,
          relatedMeeting
        });
      });

      // Sort activities by timestamp and take top 10
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setRecentActivity(activities.slice(0, 10));

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const needsConsent = !currentUser?.consent_given;
  const needsProfile = !currentUser?.profile_completed;

  const getActivityIcon = (activity) => {
    switch (activity.type) {
      case 'meeting_request':
        return activity.status === 'accepted' ? CheckCircle2 :
          activity.status === 'pending' ? Clock : Calendar;
      case 'booking':
        return MapPin;
      case 'message':
        return MessageSquare;
      default:
        return Calendar;
    }
  };

  const getActivityColor = (activity) => {
    switch (activity.type) {
      case 'meeting_request':
        return activity.status === 'accepted' ? 'text-green-500' :
          activity.status === 'pending' ? 'text-orange-500' : 'text-slate-400';
      case 'booking':
        return 'text-purple-500';
      case 'message':
        return activity.status === 'unread' ? 'text-blue-500' : 'text-slate-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Welcome, {currentUser?.full_name || 'User'}
            </h1>
            <p className="text-slate-600 mt-1">Manage your professional connections and meetings</p>
          </div>
          <div className="flex items-center gap-4">
            {stats.pendingRequests > 0 && (
              <div className="flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">{stats.pendingRequests} request{stats.pendingRequests !== 1 ? 's' : ''} need{stats.pendingRequests === 1 ? 's' : ''} approval</span>
              </div>
            )}
             {currentUser?.profile_completed && (
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-slate-600">Profile Complete</span>
                </div>
            )}
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              <span className="text-sm text-slate-600">Secure Platform</span>
            </div>
          </div>
        </div>

        {/* Status Alerts */}
        <div className="space-y-4">
          {currentUser?.is_profile_hidden && (
              <Alert className="border-blue-200 bg-blue-50">
                  <EyeOff className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                      <strong>You are in Hidden Mode.</strong> Your profile is not visible in the user directory. You can change this in your profile settings.
                      <Link to={createPageUrl("Profile")} className="ml-2 underline font-semibold">
                          Update Privacy
                      </Link>
                  </AlertDescription>
              </Alert>
          )}
          {needsConsent && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Consent Required:</strong> Please complete the data protection consent process to access platform features.
                <Link to={createPageUrl("Profile")} className="ml-2 underline">
                  Complete Now →
                </Link>
              </AlertDescription>
            </Alert>
          )}
          {needsProfile && !currentUser?.profile_completed && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Profile Incomplete:</strong> Complete your profile to access matchmaking features.
                <Link to={createPageUrl("Profile")} className="ml-2 underline">
                  Complete Profile →
                </Link>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Quick Actions */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Quick Actions
            </CardTitle>
            <p className="text-sm text-slate-600">Access key platform features quickly</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link to={createPageUrl("Delegates")}>
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 hover:bg-blue-50 hover:border-blue-300">
                  <Users className="w-6 h-6 text-blue-600" />
                  <span>Browse Users</span>
                </Button>
              </Link>

              <Link to={createPageUrl("Meetings")}>
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 hover:bg-green-50 hover:border-green-300 relative">
                  <Calendar className="w-6 h-6 text-green-600" />
                  <span>View Meetings</span>
                  {stats.pendingRequests > 0 && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {stats.pendingRequests}
                    </div>
                  )}
                </Button>
              </Link>

              <Link to={createPageUrl("Chat")}>
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 hover:bg-blue-50 hover:border-blue-300 relative">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                  <span>Messages</span>
                  {stats.unreadMessages > 0 && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {stats.unreadMessages}
                    </div>
                  )}
                </Button>
              </Link>

              <Link to={createPageUrl("Venues")}>
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 hover:bg-purple-50 hover:border-purple-300">
                  <MapPin className="w-6 h-6 text-purple-600" />
                  <span>Book Venue</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Pending Requests</CardTitle>
              <Clock className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.pendingRequests}</div>
              <p className="text-xs text-slate-500 mt-2">Awaiting your response</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Accepted Meetings</CardTitle>
              <Calendar className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.acceptedMeetings}</div>
              <p className="text-xs text-slate-500 mt-2">Confirmed connections</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Unread Messages</CardTitle>
              <MessageSquare className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.unreadMessages}</div>
              <p className="text-xs text-slate-500 mt-2">New communications</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Upcoming Bookings</CardTitle>
              <MapPin className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.activeBookings}</div>
              <p className="text-xs text-slate-500 mt-2">Venue reservations</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity Column */}
          <div className="lg:col-span-2">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Recent Activity
                </CardTitle>
                <p className="text-sm text-slate-600">Your latest platform interactions</p>
              </CardHeader>
              <CardContent>
                {recentActivity.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {recentActivity.map((activity) => {
                      const IconComponent = getActivityIcon(activity);
                      const iconColor = getActivityColor(activity);

                      return (
                        <div key={activity.id} className="flex items-start gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                          <div className={`w-10 h-10 rounded-full bg-white flex-none flex items-center justify-center shadow-sm ${iconColor}`}>
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-slate-900 truncate">
                                {activity.title}
                              </p>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {activity.status && (
                                  <Badge variant={
                                    activity.status === 'accepted' ? 'default' :
                                      activity.status === 'pending' ? 'secondary' :
                                        'outline'
                                  } className="text-xs capitalize">
                                    {activity.status}
                                  </Badge>
                                )}
                                <span className="text-xs text-slate-500">
                                  {format(new Date(activity.timestamp), 'MMM d, HH:mm')}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-slate-600 mt-0.5 truncate">
                              {activity.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-40" />
                    <p>No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Side Column */}
          <div className="lg:col-span-1 space-y-8">
            {/* My Upcoming Schedule Column */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  My Upcoming Schedule
                </CardTitle>
                <p className="text-sm text-slate-600">Your next meetings and bookings ({upcomingBookings.length})</p>
              </CardHeader>
              <CardContent>
                {upcomingBookings.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {upcomingBookings.map((booking) => {
                      const relatedMeeting = meetingRequests.find(m => m.id === booking.meeting_request_id);
                      const durationMinutes = (new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / (1000 * 60);

                      return (
                        <div key={booking.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex-none flex flex-col items-center justify-center text-white">
                            <span className="text-sm font-bold">{format(new Date(booking.start_time), 'd')}</span>
                            <span className="text-xs">{format(new Date(booking.start_time), 'MMM')}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 truncate">
                              {booking.room_name}
                            </h3>
                            <p className="text-sm text-slate-600 truncate">
                              {format(new Date(booking.start_time), 'HH:mm')} - {format(new Date(booking.end_time), 'HH:mm')}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Floor {booking.floor_level} • {durationMinutes}min
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-40" />
                    <p>No upcoming bookings</p>
                    <p className="text-sm mt-1">Book a venue for an accepted meeting</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Most Reserved Rooms */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-indigo-600" />
                  Popular Venues
                </CardTitle>
                <p className="text-sm text-slate-600">Most reserved rooms during the event</p>
              </CardHeader>
              <CardContent>
                {mostReservedRooms.length > 0 ? (
                  <div className="space-y-3">
                    {mostReservedRooms.map(([roomName, count], index) => (
                      <div key={roomName} className="flex items-center gap-4">
                        <div className="text-lg font-bold text-indigo-600 w-6 text-center">{index + 1}</div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">{roomName}</p>
                          <div className="w-full bg-slate-200 rounded-full h-2.5 mt-1">
                            <div 
                              className="bg-indigo-500 h-2.5 rounded-full" 
                              style={{ width: `${(count / (mostReservedRooms[0][1] || 1)) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="font-bold text-slate-700">{count}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <MapPin className="w-12 h-12 mx-auto mb-4 opacity-40" />
                    <p>No booking data yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Meeting Modification Dialog */}
        {editingMeeting && (
          <Dialog open={!!editingMeeting} onOpenChange={(open) => !open && setEditingMeeting(null)}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Modify Meeting Details</DialogTitle>
                <DialogDescription>
                  Update the meeting information. Both participants will be notified of changes.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="meeting-topic">Meeting Topic *</Label>
                  <Input
                    id="meeting-topic"
                    value={modifyForm.proposed_topic}
                    onChange={(e) => setModifyForm(prev => ({ ...prev, proposed_topic: e.target.value }))}
                    placeholder="Meeting topic"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meeting-duration">Duration (minutes)</Label>
                  <Select
                    value={modifyForm.proposed_duration.toString()}
                    onValueChange={(value) => setModifyForm(prev => ({ ...prev, proposed_duration: parseInt(value) }))}
                  >
                    <SelectTrigger id="meeting-duration">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="90">90 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="personal-message">Personal Message (Optional)</Label>
                  <Textarea
                    id="personal-message"
                    value={modifyForm.personal_message}
                    onChange={(e) => setModifyForm(prev => ({ ...prev, personal_message: e.target.value }))}
                    placeholder="Additional notes about the meeting..."
                    className="h-20"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingMeeting(null)} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveModification}
                  disabled={saving || !modifyForm.proposed_topic.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
