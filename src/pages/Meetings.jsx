
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { MeetingRequest } from "@/api/entities";
import { Notification } from "@/api/entities";
import { VenueBooking } from "@/api/entities";
import { Connection } from "@/api/entities";
import { supabase } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import RequestMeetingDialog from "../components/meetings/RequestMeetingDialog";
import BookingDialog from "../components/meetings/BookingDialog";
import {
  Calendar,
  Check,
  X,
  Clock,
  User as UserIcon,
  Users as UsersIcon,
  MessageSquare,
  MapPin,
  AlertCircle,
  Building2,
  Globe,
  CheckCircle2,
  Edit,
  Trash2,
  UserPlus
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Group Participant Status Component
function GroupParticipantStatus({ meetingId, currentUserId, users }) {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadParticipants = async () => {
      try {
        const participantData = await MeetingRequest.getParticipants(meetingId);
        setParticipants(participantData);
      } catch (error) {
        console.error('Error loading participants:', error);
      }
      setLoading(false);
    };

    loadParticipants();
  }, [meetingId]);

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  const acceptedParticipants = participants.filter(p => p.response_status === 'accepted');
  const pendingParticipants = participants.filter(p => p.response_status === 'pending');
  const declinedParticipants = participants.filter(p => p.response_status === 'declined');

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
        <UsersIcon className="w-4 h-4" />
        Group Participants ({participants.length})
      </h4>
      
      <div className="space-y-3">
        {/* Accepted participants */}
        {acceptedParticipants.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-700">
                Accepted ({acceptedParticipants.length})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-5">
              {acceptedParticipants.map(participant => (
                <div key={participant.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="font-medium">{participant.participant?.full_name}</span>
                  {participant.participant_id === currentUserId && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">(You)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending participants */}
        {pendingParticipants.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-sm font-medium text-orange-700">
                Pending ({pendingParticipants.length})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-5">
              {pendingParticipants.map(participant => (
                <div key={participant.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="font-medium">{participant.participant?.full_name}</span>
                  {participant.participant_id === currentUserId && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">(You - Respond below)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Declined participants */}
        {declinedParticipants.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm font-medium text-red-700">
                Declined ({declinedParticipants.length})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-5">
              {declinedParticipants.map(participant => (
                <div key={participant.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="font-medium">{participant.participant?.full_name}</span>
                  {participant.participant_id === currentUserId && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">(You)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Acceptance Progress</span>
          <span>{acceptedParticipants.length}/{participants.length} accepted</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${(acceptedParticipants.length / participants.length) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

export default function Meetings() {
  const [currentUser, setCurrentUser] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]); // Renamed from incomingRequests
  const [requestHistory, setRequestHistory] = useState([]);   // Replaced sentRequests with requestHistory
  const [acceptedMeetings, setAcceptedMeetings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState({});
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [modifyForm, setModifyForm] = useState({
    proposed_topic: '',
    proposed_duration: 45,
    personal_message: ''
  });
  const [saving, setSaving] = useState(false);
  const [cancellingMeeting, setCancellingMeeting] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  
  // Connection-related state
  const [connectionRequests, setConnectionRequests] = useState([]);
  const [respondingToConnection, setRespondingToConnection] = useState(false);

  useEffect(() => {
    loadData();
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
      const originalDuration = editingMeeting.proposed_duration;
      const newDuration = modifyForm.proposed_duration;
      const durationChanged = originalDuration !== newDuration;

      let venueCleared = false;
      let associatedBooking = null;

      // If duration is changing, find the associated booking first
      if (durationChanged) {
        associatedBooking = bookings.find(booking =>
          booking.meeting_request_id === editingMeeting.id && booking.status === 'active'
        );
      }

      // Update the meeting request. If duration changed, clear the venue_booking_id field.
      await MeetingRequest.update(editingMeeting.id, {
        proposed_topic: modifyForm.proposed_topic,
        proposed_duration: newDuration,
        personal_message: modifyForm.personal_message,
        ...(durationChanged && { venue_booking_id: null }), // Clear venue_booking_id if duration changed
      });

      // If a booking was found due to duration change, cancel it
      if (associatedBooking) {
        await VenueBooking.update(associatedBooking.id, { status: 'cancelled' });
        venueCleared = true;
      }

      // Notify the other participant(s) about the change
      const participantsToNotify = [
        editingMeeting.requester_id,
        ...(editingMeeting.recipient_ids || []),
      ].filter((id) => id !== currentUser.id);

      for (const participantId of participantsToNotify) {
        const otherUser = users[participantId] || await User.get(participantId);
        if (otherUser && otherUser.notification_preferences?.request_status_update !== false) {
          await Notification.create({
            user_id: participantId,
            type: 'meeting_updated',
            title: 'Meeting Details Updated',
            body: `${currentUser.full_name} has updated the details for your meeting "${modifyForm.proposed_topic}". ${venueCleared ? 'The venue has been cleared and needs to be re-booked.' : ''}`,
            link: createPageUrl("Meetings"),
            related_entity_id: editingMeeting.id,
          });
        }
      }

      setEditingMeeting(null);
      await loadData();
    } catch (error) {
      console.error("Error updating meeting:", error);
    }
    setSaving(false);
  };

  const handleCancelMeeting = async (meeting) => {
    setCancelling(true);
    try {
      const isRequester = meeting.requester_id === currentUser.id;
      const isSingleMeeting = meeting.meeting_type === 'single';
      
      if (isSingleMeeting || isRequester) {
        // Single meetings: cancel for everyone
        // Group meetings: if requester cancels, cancel for everyone
        await MeetingRequest.update(meeting.id, { status: 'cancelled' });

        // Cancel any associated venue booking
        const associatedBooking = bookings.find(booking =>
          booking.meeting_request_id === meeting.id && booking.status === 'active'
        );

        if (associatedBooking) {
          await VenueBooking.update(associatedBooking.id, { status: 'cancelled' });
        }

        // Notify the other participant(s)
        const participantsToNotify = [
          meeting.requester_id,
          ...(meeting.recipient_ids || []),
        ].filter((id) => id !== currentUser.id);

        for (const participantId of participantsToNotify) {
          const otherUser = users[participantId] || await User.get(participantId);
          if (otherUser && otherUser.notification_preferences?.request_status_update !== false) {
            await Notification.create({
              user_id: participantId,
              type: 'request_status_update',
              title: 'Meeting Cancelled',
              body: `${currentUser.full_name} has cancelled your meeting "${meeting.proposed_topic}" (Code: ${meeting.meeting_code}).`,
              link: createPageUrl("Meetings"),
              related_entity_id: meeting.id,
            });
          }
        }
      } else {
        // Group meetings: if participant cancels, only cancel their participation
        await MeetingRequest.respondAsParticipant(meeting.id, currentUser.id, 'declined');

        // Notify the requester about the participant's cancellation
        const requester = users[meeting.requester_id] || await User.get(meeting.requester_id);
        if (requester && requester.notification_preferences?.request_status_update !== false) {
          await Notification.create({
            user_id: meeting.requester_id,
            type: 'request_declined',
            title: 'Participant Cancelled Meeting',
            body: `${currentUser.full_name} has cancelled their participation in the group meeting "${meeting.proposed_topic}" (Code: ${meeting.meeting_code}).`,
            link: createPageUrl("Meetings"),
            related_entity_id: meeting.id,
          });
        }
      }

      setCancellingMeeting(null);
      await loadData(); // Reload data to reflect changes
    } catch (error) {
      console.error("Error cancelling meeting:", error);
    }
    setCancelling(false);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);

      // Fetch all necessary data concurrently
      const [allUsers, allRequests, allBookings, userConnections] = await Promise.all([
        User.list(),
        MeetingRequest.list('-created_date'),
        VenueBooking.list(),
        Connection.getUserConnections(user.id).catch(() => ({ connections: { pending_received: [] } }))
      ]);

      // Create user lookup
      const userLookup = {};
      allUsers.forEach(u => {
        userLookup[u.id] = u;
      });
      setUsers(userLookup);

      // Get participant data for current user to filter by individual status
      const userParticipantData = {};
      
      // Fetch participant status for all meetings where user is involved
      const userMeetingIds = allRequests
        .filter(req => req.requester_id === user.id || (req.recipient_ids || []).includes(user.id))
        .map(req => req.id);
        
      if (userMeetingIds.length > 0) {
        try {
          const { data: participantRecords } = await supabase
            .from('meeting_participants')
            .select('meeting_request_id, response_status, participant_type')
            .eq('participant_id', user.id)
            .in('meeting_request_id', userMeetingIds);
            
          // Create lookup map
          (participantRecords || []).forEach(record => {
            userParticipantData[record.meeting_request_id] = record;
          });
        } catch (error) {
          console.error('Error loading participant data:', error);
        }
      }

      // Filter meetings based on individual participant status
      const pending = allRequests.filter(req => {
        const isRecipient = (req.recipient_ids || []).includes(user.id);
        if (!isRecipient) return false;
        
        const participantStatus = userParticipantData[req.id];
        return participantStatus?.response_status === 'pending';
      });

      const history = allRequests.filter(req => {
        const isParticipant = req.requester_id === user.id || (req.recipient_ids || []).includes(user.id);
        if (!isParticipant) return false;
        
        const participantStatus = userParticipantData[req.id];
        
        // For requesters: show in history if meeting is declined/cancelled OR if it's still pending (sent but not yet accepted)
        if (req.requester_id === user.id) {
          return req.status === 'declined' || req.status === 'cancelled' || req.status === 'pending';
        }
        
        // For recipients: show in history if they declined OR if meeting was cancelled
        // For group meetings: also show if they declined (cancelled their participation)
        return participantStatus?.response_status === 'declined' || req.status === 'cancelled';
      });

      const accepted = allRequests.filter(req => {
        const isParticipant = req.requester_id === user.id || (req.recipient_ids || []).includes(user.id);
        if (!isParticipant) return false;
        
        const participantStatus = userParticipantData[req.id];
        
        // For requesters: show in accepted only if meeting status is accepted (all participants accepted)
        if (req.requester_id === user.id) {
          return req.status === 'accepted';
        }
        
        // For recipients: show in accepted if they accepted AND meeting is not cancelled
        // For group meetings: show if they accepted and meeting is still active (not cancelled)
        return participantStatus?.response_status === 'accepted' && req.status !== 'cancelled';
      });

      setPendingRequests(pending);
      setRequestHistory(history);
      setAcceptedMeetings(accepted);
      setBookings(allBookings);
      
      // Set pending connection requests
      setConnectionRequests(userConnections.connections.pending_received || []);

    } catch (error) {
      console.error("Error loading meetings:", error);
    }
    setLoading(false);
  };

  const handleRequestResponse = async (requestId, response) => {
    try {
      const request = await MeetingRequest.get(requestId);
      
      // Use new participant-based response system
      const result = await MeetingRequest.respondAsParticipant(requestId, currentUser.id, response);
      
      if (result && result.success) {
        // Create notification for requester
        if (request && request.requester_id) {
          const requester = users[request.requester_id] || await User.get(request.requester_id);

          if (requester && requester.notification_preferences?.request_status_update !== false) {
            // Get meeting status info for better notification
            const statusInfo = await MeetingRequest.getAcceptanceStatus(requestId);
            
            let notificationBody;
            if (request.meeting_type === 'single') {
              notificationBody = `${currentUser.full_name} has ${response} your meeting request regarding "${request.proposed_topic}".`;
            } else {
              // Group meeting - provide more context
              const acceptedCount = statusInfo?.accepted_count || 0;
              const totalCount = statusInfo?.total_participants || 0;
              notificationBody = `${currentUser.full_name} has ${response} your group meeting request "${request.proposed_topic}". ${acceptedCount}/${totalCount} participants have accepted.`;
            }

            await Notification.create({
              user_id: request.requester_id,
              type: response === 'accepted' ? 'request_accepted' : 'request_declined',
              title: `Meeting Request ${response === 'accepted' ? 'Accepted' : 'Declined'}`,
              body: notificationBody,
              link: createPageUrl("Meetings"),
              related_entity_id: requestId,
            });
          }
        }
      } else {
        throw new Error(result?.message || 'Failed to respond to meeting request');
      }

      await loadData();
    } catch (error) {
      console.error("Error updating request:", error);
      alert(error.message || 'Failed to respond to meeting request');
    }
  };

  const handleConnectionResponse = async (connectionId, response) => {
    setRespondingToConnection(true);
    try {
      const apiUrl = import.meta.env.DEV 
        ? 'http://localhost:3000/api/respond-connection-request'
        : '/api/respond-connection-request';
        
      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          connection_id: connectionId,
          response: response
        })
      });
      
      if (!apiResponse.ok) {
        const error = await apiResponse.json();
        throw new Error(error.error || 'Failed to respond to connection request');
      }

      // Reload data to refresh connection requests
      await loadData();
    } catch (error) {
      console.error("Error responding to connection request:", error);
      alert(error.message || 'Failed to respond to connection request');
    }
    setRespondingToConnection(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-slate-100 text-slate-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-64"></div>
            <div className="space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Meeting Management</h1>
            <p className="text-slate-600 mt-1">Manage your meeting requests and scheduled connections</p>
          </div>
          <div className="flex items-center gap-4">
            {pendingRequests.length > 0 && (
              <div className="flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-2 rounded-lg">
                <Clock className="w-4 h-4" />
                <span className="font-medium">{pendingRequests.length} pending approval{pendingRequests.length !== 1 ? 's' : ''}</span>
              </div>
            )}
            <RequestMeetingDialog currentUser={currentUser} afterSubmit={loadData} />
          </div>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <TabsTrigger value="pending" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <div className="flex items-center gap-2">
                Meeting Requests ({pendingRequests.length})
                {pendingRequests.length > 0 && (
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                )}
              </div>
            </TabsTrigger>
            <TabsTrigger value="connections" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <div className="flex items-center gap-2">
                Connection Requests ({connectionRequests.length})
                {connectionRequests.length > 0 && (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                )}
              </div>
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Request History ({requestHistory.length})
            </TabsTrigger>
            <TabsTrigger value="accepted" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Accepted Meetings ({acceptedMeetings.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending Approval */}
          <TabsContent value="pending" className="space-y-4">
            {pendingRequests.length > 0 ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-900">Action Required</h3>
                  </div>
                  <p className="text-sm text-blue-800 mt-1">
                    You have {pendingRequests.length} meeting request{pendingRequests.length !== 1 ? 's' : ''} awaiting your response.
                    Please review and approve or decline each request below.
                  </p>
                </div>

                {pendingRequests.map((request) => {
                  const requester = users[request.requester_id];
                  return (
                    <Card key={request.id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg border-l-4 border-l-orange-500">
                      <CardContent className="p-6">
                        <div className="flex flex-col gap-6">
                          {/* Header with delegate info */}
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                              {request.meeting_type === 'multi' ? (
                                <UsersIcon className="w-6 h-6 text-white"/>
                              ) : (
                                <span className="text-white font-semibold text-lg">
                                  {requester?.full_name?.charAt(0)?.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl font-semibold text-slate-900 mb-1">
                                Meeting Request from {requester?.full_name}
                                {request.meeting_type === 'multi' && ' (Group)'}
                              </h3>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 mb-2">
                                <div className="flex items-center gap-1">
                                  <Building2 className="w-4 h-4" />
                                  <span>{requester?.job_title} at {requester?.organization}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Globe className="w-4 h-4" />
                                  <span>{requester?.country}</span>
                                </div>
                              </div>
                              <div className="text-xs text-slate-500">
                                Received {format(new Date(request.created_date), 'MMMM d, yyyy \'at\' h:mm a')}
                              </div>
                            </div>
                          </div>

                          {/* Meeting details */}
                          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                            <div className="flex items-start gap-3">
                              <Calendar className="w-5 h-5 text-slate-500 mt-0.5" />
                              <div>
                                <h4 className="font-medium text-slate-900 mb-1">Proposed Topic</h4>
                                <p className="text-slate-700">{request.proposed_topic}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Clock className="w-5 h-5 text-slate-500" />
                              <div>
                                <span className="font-medium text-slate-900">Duration: </span>
                                <span className="text-slate-700">{request.proposed_duration} minutes</span>
                              </div>
                            </div>
                          </div>

                          {/* Personal message */}
                          {request.personal_message && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                Personal Message
                              </h4>
                              <p className="text-blue-800 italic">"{request.personal_message}"</p>
                            </div>
                          )}

                          {/* Group meeting participant status */}
                          {request.meeting_type === 'multi' && (
                            <GroupParticipantStatus 
                              meetingId={request.id} 
                              currentUserId={currentUser.id}
                              users={users}
                            />
                          )}

                          {/* Action buttons */}
                          <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button
                              variant="outline"
                              onClick={() => handleRequestResponse(request.id, 'declined')}
                              className="border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 px-6"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Decline Request
                            </Button>
                            <Button
                              onClick={() => handleRequestResponse(request.id, 'accepted')}
                              className="bg-green-600 hover:bg-green-700 px-8"
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Accept Meeting
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </>
            ) : (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">All caught up!</h3>
                  <p className="text-slate-600">You don't have any pending meeting requests</p>
                  <p className="text-sm text-slate-500 mt-2">New requests from other delegates will appear here</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Connection Requests */}
          <TabsContent value="connections" className="space-y-4">
            {connectionRequests.length > 0 ? (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-green-900">Connection Requests</h3>
                  </div>
                  <p className="text-sm text-green-800 mt-1">
                    You have {connectionRequests.length} connection request{connectionRequests.length !== 1 ? 's' : ''} awaiting your response.
                    Accept connections to enable meeting requests with these delegates.
                  </p>
                </div>

                {connectionRequests.map((connection) => {
                  const requester = connection.other_user;
                  return (
                    <Card key={connection.id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg border-l-4 border-l-green-500">
                      <CardContent className="p-6">
                        <div className="flex flex-col gap-6">
                          {/* Header with delegate info */}
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-lg">
                                {requester?.full_name?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl font-semibold text-slate-900 mb-1">
                                Connection Request from {requester?.full_name}
                              </h3>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 mb-2">
                                <div className="flex items-center gap-1">
                                  <Building2 className="w-4 h-4" />
                                  <span>{requester?.job_title} at {requester?.organization}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Globe className="w-4 h-4" />
                                  <span>{requester?.country}</span>
                                </div>
                              </div>
                              <div className="text-xs text-slate-500">
                                Received {format(new Date(connection.created_date), 'MMMM d, yyyy \'at\' h:mm a')}
                              </div>
                            </div>
                          </div>

                          {/* Connection message */}
                          {connection.connection_message && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                              <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                Message from {requester?.full_name}
                              </h4>
                              <p className="text-green-800 italic">"{connection.connection_message}"</p>
                            </div>
                          )}

                          {/* Info about connection benefits */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-medium text-blue-900 mb-2">What happens when you connect?</h4>
                            <ul className="text-sm text-blue-800 space-y-1">
                              <li>• You can send meeting requests to each other</li>
                              <li>• They can see your profile and send you meeting requests</li>
                              <li>• You'll both appear in each other's meeting request dialogs</li>
                            </ul>
                          </div>

                          {/* Action buttons */}
                          <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button
                              variant="outline"
                              onClick={() => handleConnectionResponse(connection.id, 'declined')}
                              disabled={respondingToConnection}
                              className="border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 px-6"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Decline
                            </Button>
                            <Button
                              onClick={() => handleConnectionResponse(connection.id, 'accepted')}
                              disabled={respondingToConnection}
                              className="bg-green-600 hover:bg-green-700 px-8"
                            >
                              {respondingToConnection ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4 mr-2" />
                                  Accept Connection
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </>
            ) : (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <UserPlus className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No connection requests</h3>
                  <p className="text-slate-600">
                    When other delegates want to connect with you, their requests will appear here.
                  </p>
                  <p className="text-sm text-slate-500 mt-2">
                    You can also visit the Delegates page to send connection requests to others.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Request History */}
          <TabsContent value="history" className="space-y-4">
            {requestHistory.length > 0 ? (
              requestHistory.map((request) => {
                const isSentByMe = request.requester_id === currentUser.id;
                const otherParties = (request.recipient_ids || []).map(id => users[id]).filter(Boolean);

                return (
                  <Card key={request.id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                               {request.meeting_type === 'multi' ? (
                                <UsersIcon className="w-5 h-5 text-white" />
                               ) : (
                                <span className="text-white font-semibold">
                                  {isSentByMe ? otherParties[0]?.full_name?.charAt(0)?.toUpperCase() : users[request.requester_id]?.full_name?.charAt(0)?.toUpperCase()}
                                </span>
                               )}
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900">
                                {isSentByMe ? `To: ${otherParties.length > 1 ? `${otherParties.length} delegates` : otherParties[0]?.full_name}` : `From: ${users[request.requester_id]?.full_name}`}
                              </h3>
                              <p className="text-sm text-slate-600 truncate max-w-sm">
                                {isSentByMe
                                  ? (otherParties.length > 1 ? otherParties.map(p=>p.full_name).join(', ') : `${otherParties[0]?.job_title} at ${otherParties[0]?.organization}`)
                                  : `${users[request.requester_id]?.job_title} at ${users[request.requester_id]?.organization}`
                                }
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-500" />
                              <span className="font-medium">{request.proposed_topic}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-slate-500" />
                              <span className="text-sm text-slate-600">
                                {request.proposed_duration} minutes
                              </span>
                              <span className="text-xs text-slate-500">
                                • {isSentByMe ? 'Sent' : 'Received'} {format(new Date(request.created_date), 'MMM d, yyyy')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No request history</h3>
                  <p className="text-slate-600">
                    Sent, declined, and cancelled requests will appear here.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Accepted Meetings with Modify and Cancel Options */}
          <TabsContent value="accepted" className="space-y-4">
            {acceptedMeetings.length > 0 ? (
              acceptedMeetings.map((meeting) => {
                const otherParticipants = (meeting.recipient_ids || [])
                  .filter(id => id !== currentUser.id)
                  .concat(meeting.requester_id !== currentUser.id ? [meeting.requester_id] : [])
                  .map(id => users[id])
                  .filter(Boolean);

                const existingBooking = bookings.find(booking =>
                  booking.meeting_request_id === meeting.id && booking.status === 'active'
                );

                return (
                  <Card key={meeting.id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                               {meeting.meeting_type === 'multi' ? (
                                <UsersIcon className="w-5 h-5 text-white" />
                               ) : (
                                <span className="text-white font-semibold">
                                  {otherParticipants[0]?.full_name?.charAt(0)?.toUpperCase()}
                                </span>
                               )}
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900">
                                Meeting with {otherParticipants.length > 1 ? `${otherParticipants.length} delegates` : otherParticipants[0]?.full_name}
                              </h3>
                              <p className="text-sm text-slate-600 truncate max-w-md">
                                {otherParticipants.length > 1
                                  ? otherParticipants.map(p => p.full_name).join(', ')
                                  : `${otherParticipants[0]?.job_title} at ${otherParticipants[0]?.organization}`
                                }
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-500" />
                              <span className="font-medium">{meeting.proposed_topic}</span>
                              <Badge variant="outline" className="text-xs">
                                Code: {meeting.meeting_code}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-slate-500" />
                              <span className="text-sm text-slate-600">
                                {meeting.proposed_duration} minutes
                              </span>
                              <span className="text-xs text-slate-500">
                                • Confirmed {format(new Date(meeting.updated_date), 'MMM d, yyyy')}
                              </span>
                            </div>
                            {existingBooking && (
                                <div className="flex items-center gap-2 text-purple-600">
                                    <MapPin className="w-4 h-4" />
                                    <span className="text-sm font-medium">
                                        Booked: {existingBooking.room_name} at {format(new Date(existingBooking.start_time), 'h:mm a')}
                                    </span>
                                </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditMeeting(meeting)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Modify
                          </Button>
                          {meeting.meeting_type === 'single' && (
                            <Link to={createPageUrl(`Chat?request=${meeting.id}`)}>
                              <Button size="sm" variant="outline">
                                <MessageSquare className="w-4 h-4 mr-1" />
                                Chat
                              </Button>
                            </Link>
                          )}
                          <BookingDialog meeting={meeting} currentUser={currentUser} onBookingSuccess={loadData} />
                          <Dialog
                            open={cancellingMeeting?.id === meeting.id}
                            onOpenChange={(open) => !open && setCancellingMeeting(null)}
                          >
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCancellingMeeting(meeting)}
                                className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Cancel
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle className="text-red-700">Cancel Meeting</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to cancel this meeting? This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="py-4 space-y-3">
                                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                                  <p className="text-sm text-red-800">
                                    <strong>Meeting:</strong> {meeting.proposed_topic}
                                  </p>
                                  <p className="text-sm text-red-800">
                                    <strong>With:</strong> {otherParticipants.map(p => p.full_name).join(', ')}
                                  </p>
                                  <p className="text-sm text-red-800">
                                    <strong>Code:</strong> {meeting.meeting_code}
                                  </p>
                                </div>
                                {existingBooking && (
                                  <Alert className="border-orange-200 bg-orange-50">
                                    <AlertCircle className="h-4 w-4 text-orange-600" />
                                    <AlertDescription className="text-orange-800">
                                      This will also cancel the venue booking for {existingBooking.room_name}.
                                    </AlertDescription>
                                  </Alert>
                                )}
                                <Alert className="border-red-200 bg-red-50">
                                  <AlertCircle className="h-4 w-4 text-red-600" />
                                  <AlertDescription className="text-red-800">
                                    All participants will be notified about the cancellation.
                                  </AlertDescription>
                                </Alert>
                              </div>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setCancellingMeeting(null)}
                                  disabled={cancelling}
                                >
                                  Keep Meeting
                                </Button>
                                <Button
                                  onClick={() => handleCancelMeeting(meeting)}
                                  disabled={cancelling}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  {cancelling ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                      Cancelling...
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Cancel Meeting
                                    </>
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <Check className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No accepted meetings</h3>
                  <p className="text-slate-600">Accepted meeting requests will appear here</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Meeting Modification Dialog */}
        {editingMeeting && (
          <Dialog open={!!editingMeeting} onOpenChange={(open) => !open && setEditingMeeting(null)}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Modify Meeting Details</DialogTitle>
                <DialogDescription>
                  Update the meeting information. The other participant will be notified of changes.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Meeting Code:</strong> {editingMeeting.meeting_code}
                  </p>
                </div>
                 <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Changing the duration will cancel any existing venue booking for this meeting.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="proposed_topic">Meeting Topic *</Label>
                  <Input
                    id="proposed_topic"
                    value={modifyForm.proposed_topic}
                    onChange={(e) => setModifyForm(prev => ({ ...prev, proposed_topic: e.target.value }))}
                    placeholder="Meeting topic"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proposed_duration">Duration (minutes)</Label>
                  <Select
                    value={modifyForm.proposed_duration.toString()}
                    onValueChange={(value) => setModifyForm(prev => ({ ...prev, proposed_duration: parseInt(value) }))}
                  >
                    <SelectTrigger id="proposed_duration">
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
                  <Label htmlFor="personal_message">Personal Message (Optional)</Label>
                  <Textarea
                    id="personal_message"
                    value={modifyForm.personal_message}
                    onChange={(e) => setModifyForm(prev => ({ ...prev, personal_message: e.target.value }))}
                    placeholder="Additional notes about the meeting..."
                    className="h-20"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingMeeting(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveModification}
                  disabled={saving || !modifyForm.proposed_topic}
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
