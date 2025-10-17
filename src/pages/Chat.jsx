
import React, { useState, useEffect, useRef, useCallback } from "react";
import { User } from "@/api/entities";
import { MeetingRequest } from "@/api/entities";
import { ChatMessage } from "@/api/entities";
import { Notification } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Calendar,
  User as UserIcon,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Chat() {
  const [currentUser, setCurrentUser] = useState(null);
  const [acceptedMeetings, setAcceptedMeetings] = useState([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadData();

    // Check URL for specific meeting request
    const urlParams = new URLSearchParams(window.location.search);
    const requestId = urlParams.get('request');
    if (requestId) {
      setSelectedMeetingId(requestId);
    }
  }, []);

  const loadMessages = useCallback(async () => {
    if (!selectedMeetingId) return;

    try {
      const chatMessages = await ChatMessage.filter(
        { meeting_request_id: selectedMeetingId },
        'created_date'
      );
      setMessages(chatMessages);

      // Mark messages as read
      const unreadMessages = chatMessages.filter(
        msg => msg.recipient_id === currentUser?.id && !msg.read_status
      );

      for (const msg of unreadMessages) {
        await ChatMessage.update(msg.id, { read_status: true });
      }

    } catch (error) {
      console.error("Error loading messages:", error);
    }
  }, [selectedMeetingId, currentUser?.id]);

  useEffect(() => {
    if (selectedMeetingId) {
      loadMessages();
      const interval = setInterval(loadMessages, 3000); // Poll for new messages
      return () => clearInterval(interval);
    }
  }, [selectedMeetingId, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadData = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);

      const [allUsers, allRequests] = await Promise.all([
        User.list(),
        MeetingRequest.list('-updated_date')
      ]);

      // Create user lookup
      const userLookup = {};
      allUsers.forEach(u => {
        userLookup[u.id] = u;
      });
      setUsers(userLookup);

      // Get accepted meetings where current user is involved
      const accepted = allRequests.filter(req =>
        ((req.recipient_ids || []).includes(user.id) || req.requester_id === user.id) &&
        req.status === 'accepted' &&
        req.meeting_type === 'single' // Only allow chat for single meetings
      );

      setAcceptedMeetings(accepted);

    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedMeetingId) return;

    setSending(true);
    try {
      const selectedMeeting = acceptedMeetings.find(m => m.id === selectedMeetingId);
      const recipientId = selectedMeeting.requester_id === currentUser.id
        ? (selectedMeeting.recipient_ids || [])[0]
        : selectedMeeting.requester_id;

      const newMsg = await ChatMessage.create({
        meeting_request_id: selectedMeetingId,
        sender_id: currentUser.id,
        recipient_id: recipientId,
        message: newMessage,
        message_type: 'text'
      });

      // Create notification for recipient
      const recipient = await User.get(recipientId);
      if (recipient.notification_preferences?.new_message !== false) {
        await Notification.create({
          user_id: recipientId,
          type: 'new_message',
          title: 'New Message',
          body: `You have a new message from ${currentUser.full_name}.`,
          link: createPageUrl(`Chat?request=${selectedMeetingId}`),
          related_entity_id: newMsg.id,
        });
      }

      setNewMessage('');
      loadMessages();
    } catch (error) {
      console.error("Error sending message:", error);
    }
    setSending(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-64"></div>
            <div className="h-96 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const selectedMeeting = acceptedMeetings.find(m => m.id === selectedMeetingId);
  const chatPartner = selectedMeeting ? (
    selectedMeeting.requester_id === currentUser?.id
      ? users[(selectedMeeting.recipient_ids || [])[0]]
      : users[selectedMeeting.requester_id]
  ) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Meetings")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Secure Messaging</h1>
              <p className="text-slate-600 mt-1">Chat with connected users</p>
            </div>
          </div>
          <MessageSquare className="w-8 h-8 text-blue-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Meeting Selection Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Active Conversations</CardTitle>
              </CardHeader>
              <CardContent>
                {acceptedMeetings.length > 0 ? (
                  <div className="space-y-3">
                    {acceptedMeetings.map((meeting) => {
                      const otherParty = meeting.requester_id === currentUser?.id
                        ? users[(meeting.recipient_ids || [])[0]]
                        : users[meeting.requester_id];

                      return (
                        <div
                          key={meeting.id}
                          className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                            selectedMeetingId === meeting.id
                              ? 'bg-blue-50 border-blue-200'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                          }`}
                          onClick={() => setSelectedMeetingId(meeting.id)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-xs">
                              <span className="text-white font-semibold">
                                {otherParty?.full_name?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {otherParty?.full_name}
                              </p>
                              <p className="text-xs text-slate-600 truncate">
                                {meeting.proposed_topic}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-600">No active conversations</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Accept 1-on-1 meeting requests to start chatting.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg h-[600px] flex flex-col">
              {selectedMeeting && chatPartner ? (
                <>
                  {/* Chat Header */}
                  <CardHeader className="border-b bg-slate-50 rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {chatPartner.full_name?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {chatPartner.full_name}
                          </h3>
                          <p className="text-sm text-slate-600">
                            {chatPartner.job_title} • {selectedMeeting.proposed_topic}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">
                          Meeting Duration: {selectedMeeting.proposed_duration} minutes
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Messages Area */}
                  <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length > 0 ? (
                      messages.map((message) => {
                        const isCurrentUser = message.sender_id === currentUser?.id;
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                isCurrentUser
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 text-slate-900'
                              }`}
                            >
                              <p className="text-sm">{message.message}</p>
                              <p className={`text-xs mt-1 ${
                                isCurrentUser ? 'text-blue-100' : 'text-slate-500'
                              }`}>
                                {format(new Date(message.created_date), 'HH:mm')}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-600">Start your conversation</p>
                          <p className="text-sm text-slate-500">
                            Send a message to begin chatting with {chatPartner.full_name}
                          </p>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </CardContent>

                  {/* Message Input */}
                  <div className="p-4 border-t bg-slate-50 rounded-b-lg">
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message..."
                        className="flex-1"
                        disabled={sending}
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={sending || !newMessage.trim()}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {sending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <CardContent className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">Select a conversation</h3>
                    <p className="text-slate-600">
                      Choose a meeting from the sidebar to start chatting
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>

        {/* Info Alert */}
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Secure Messaging:</strong> All conversations are encrypted and only visible to meeting participants.
            Chat is available for single-user meetings once they are accepted.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
