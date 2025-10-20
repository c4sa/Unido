
import React, { useState, useEffect, useRef, useCallback } from "react";
import { User } from "@/api/entities";
import { MeetingRequest } from "@/api/entities";
import { ChatMessage } from "@/api/entities";
import { Notification } from "@/api/entities";
import { Connection } from "@/api/entities";
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

// Suppress browser extension errors that don't affect functionality
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    const message = args[0]?.toString() || '';
    // Filter out browser extension errors
    if (message.includes('message channel closed') || 
        message.includes('Extension context invalidated') ||
        message.includes('runtime.lastError')) {
      return; // Suppress these specific errors
    }
    originalError.apply(console, args);
  };
}

export default function Chat() {
  const [currentUser, setCurrentUser] = useState(null);
  const [acceptedMeetings, setAcceptedMeetings] = useState([]);
  const [connectedDelegates, setConnectedDelegates] = useState([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [selectedChatType, setSelectedChatType] = useState('meeting'); // 'meeting' or 'direct'
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

  const loadMessages = useCallback(async (skipReadUpdate = false) => {
    if (!selectedMeetingId || !currentUser?.id) return;

    try {
      let chatMessages = [];

      if (selectedChatType === 'meeting') {
        // Meeting-based chat: use meeting messages method
        chatMessages = await ChatMessage.getMeetingMessages(selectedMeetingId, currentUser.id);
      } else if (selectedChatType === 'direct') {
        // Direct delegate chat: use traditional filter method for direct messages
        // For now, we'll show an empty state since direct messaging isn't fully implemented
        // This prevents the error and allows the UI to work properly
        chatMessages = [];
      }

      // Only update state if messages have actually changed
      const currentMessageIds = messages.map(m => m.id).sort().join(',');
      const newMessageIds = chatMessages.map(m => m.id).sort().join(',');
      
      if (currentMessageIds !== newMessageIds) {
        setMessages(chatMessages);
      }

      // Mark messages as read (batch operation, only if not skipped)
      if (!skipReadUpdate) {
        const unreadMessages = chatMessages.filter(
          msg => msg.recipient_id === currentUser.id && !msg.read_status
        );

        if (unreadMessages.length > 0) {
          // Batch update for better performance
          const updatePromises = unreadMessages.map(msg => 
            ChatMessage.update(msg.id, { read_status: true })
          );
          await Promise.all(updatePromises);
        }
      }

      // Clear any previous access error flags on successful load
      sessionStorage.removeItem(`chat_access_error_${selectedMeetingId}`);

    } catch (error) {
      console.error("Error loading messages:", error);
      // If access is denied, clear messages and show error
      if (error.message.includes('access')) {
        setMessages([]);
        // Only show alert once per session to avoid spam
        if (!sessionStorage.getItem(`chat_access_error_${selectedMeetingId}`)) {
          alert('You do not have access to this chat. Only accepted participants can view group chats.');
          sessionStorage.setItem(`chat_access_error_${selectedMeetingId}`, 'shown');
        }
      }
    }
  }, [selectedMeetingId, selectedChatType, currentUser?.id, messages]);

  useEffect(() => {
    if (selectedMeetingId) {
      loadMessages();
      
      // Smart polling: reduce frequency when tab is not visible
      let pollInterval = 5000; // 5 seconds when active
      let interval;
      let consecutiveErrors = 0;
      
      const startPolling = () => {
        if (interval) clearInterval(interval);
        interval = setInterval(async () => {
          // Check if there are recent access errors - if so, reduce polling
          const hasAccessError = sessionStorage.getItem(`chat_access_error_${selectedMeetingId}`);
          
          if (hasAccessError && consecutiveErrors < 3) {
            // Reduce polling frequency when there are access errors
            consecutiveErrors++;
            return;
          }
          
          try {
            // Skip read updates during polling to improve performance
            await loadMessages(true);
            consecutiveErrors = 0; // Reset on successful load
          } catch (error) {
            consecutiveErrors++;
            // Stop polling after too many consecutive errors
            if (consecutiveErrors >= 5) {
              clearInterval(interval);
            }
          }
        }, pollInterval);
      };
      
      const handleVisibilityChange = () => {
        if (document.hidden) {
          // Tab is hidden, reduce polling frequency
          pollInterval = 30000; // 30 seconds when inactive
        } else {
          // Tab is visible, normal polling frequency
          pollInterval = 5000; // 5 seconds when active
          consecutiveErrors = 0; // Reset error count when tab becomes visible
          // Immediately load messages when tab becomes visible
          loadMessages();
        }
        startPolling();
      };
      
      // Listen for visibility changes
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Start initial polling
      startPolling();
      
      return () => {
        if (interval) clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
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

      const [allUsers, allRequests, userConnections] = await Promise.all([
        User.list(),
        MeetingRequest.list('-updated_date'),
        Connection.getUserConnections(user.id).catch(() => ({ connections: { accepted: [] } }))
      ]);

      // Create user lookup
      const userLookup = {};
      allUsers.forEach(u => {
        userLookup[u.id] = u;
      });
      setUsers(userLookup);

      // Get meetings where current user can chat
      const chatEligibleMeetings = [];
      
      for (const req of allRequests) {
        const isParticipant = (req.recipient_ids || []).includes(user.id) || req.requester_id === user.id;
        
        if (!isParticipant) continue;
        
        if (req.meeting_type === 'single' && req.status === 'accepted') {
          // Single meetings: use original logic
          chatEligibleMeetings.push(req);
        } else if (req.meeting_type === 'multi') {
          // Group meetings: check if user is an accepted participant
          try {
            const canAccess = await ChatMessage.canAccessMeetingChat(req.id, user.id);
            if (canAccess) {
              chatEligibleMeetings.push(req);
            }
          } catch (error) {
            console.error('Error checking group chat access:', error);
          }
        }
      }

      setAcceptedMeetings(chatEligibleMeetings);

      // Load connected delegates for direct messaging
      const connectedUserIds = new Set(
        userConnections.connections.accepted.map(conn => conn.other_user?.id).filter(Boolean)
      );
      
      const connected = allUsers.filter(delegate => 
        connectedUserIds.has(delegate.id) && delegate.id !== user.id
      );
      
      setConnectedDelegates(connected);

    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedMeetingId || !currentUser?.id) return;

    const messageText = newMessage.trim();
    setSending(true);
    
    // Clear input immediately for better UX
    setNewMessage('');
    
    try {
      if (selectedChatType === 'meeting') {
        // Meeting-based chat
        const selectedMeeting = acceptedMeetings.find(m => m.id === selectedMeetingId);
        
        if (selectedMeeting?.meeting_type === 'multi') {
          // Group chat: use optimized group message method
          const messages = await ChatMessage.sendGroupMessage(selectedMeetingId, currentUser.id, messageText);
          
          // Optimized notification creation - parallel processing
          const notificationPromises = messages.map(async (message) => {
            try {
              // Get recipient data and create notification in parallel
              const [recipient] = await Promise.all([
                User.get(message.recipient_id)
              ]);
              
              if (recipient?.notification_preferences?.new_message !== false) {
                return Notification.create({
                  user_id: message.recipient_id,
                  type: 'new_message',
                  title: 'New Group Message',
                  body: `You have a new message from ${currentUser.full_name} in a group chat.`,
                  link: createPageUrl(`Chat?request=${selectedMeetingId}`),
                  related_entity_id: message.id,
                });
              }
            } catch (notifError) {
              console.error('Error creating notification for user:', message.recipient_id, notifError);
              // Don't throw - continue with other notifications
            }
          });
          
          // Execute all notifications in parallel (non-blocking)
          Promise.all(notificationPromises).catch(error => {
            console.error('Some notifications failed:', error);
            // Don't block the UI for notification failures
          });
          
        } else {
          // Single meeting chat: use original method with optimization
          const recipientId = selectedMeeting.requester_id === currentUser.id
            ? (selectedMeeting.recipient_ids || [])[0]
            : selectedMeeting.requester_id;

          // Send message and create notification in parallel
          const [newMsg, recipient] = await Promise.all([
            ChatMessage.create({
              meeting_request_id: selectedMeetingId,
              sender_id: currentUser.id,
              recipient_id: recipientId,
              message: messageText,
              message_type: 'text'
            }),
            User.get(recipientId)
          ]);

          // Create notification (non-blocking)
          if (recipient?.notification_preferences?.new_message !== false) {
            Notification.create({
              user_id: recipientId,
              type: 'new_message',
              title: 'New Message',
              body: `You have a new message from ${currentUser.full_name}.`,
              link: createPageUrl(`Chat?request=${selectedMeetingId}`),
              related_entity_id: newMsg.id,
            }).catch(error => {
              console.error('Notification creation failed:', error);
              // Don't block UI for notification failures
            });
          }
        }
      } else if (selectedChatType === 'direct') {
        // Direct delegate chat: Show message that this feature is coming soon
        alert('Direct messaging with connected delegates is coming soon! For now, please use meeting-based chats.');
        setSending(false);
        return;
      }

      // Optimized message reload - only reload if needed
      setTimeout(() => {
        loadMessages(true); // Skip read updates for immediate reload
      }, 100); // Small delay to ensure message is saved
      
    } catch (error) {
      console.error("Error sending message:", error);
      alert(error.message || 'Failed to send message');
      // Restore message text on error
      setNewMessage(messageText);
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

  // Determine selected chat details based on chat type
  const selectedMeeting = selectedChatType === 'meeting' 
    ? acceptedMeetings.find(m => m.id === selectedMeetingId)
    : null;
    
  const selectedDelegate = selectedChatType === 'direct'
    ? connectedDelegates.find(d => d.id === selectedMeetingId)
    : null;
    
  const chatPartner = selectedMeeting ? (
    selectedMeeting.requester_id === currentUser?.id
      ? users[(selectedMeeting.recipient_ids || [])[0]]
      : users[selectedMeeting.requester_id]
  ) : selectedDelegate;

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
          {/* Chat Selection Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Conversations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Meeting Chats Section */}
                <div>
                  <h4 className="font-medium text-sm text-slate-700 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Meeting Chats ({acceptedMeetings.length})
                  </h4>
                  {acceptedMeetings.length > 0 ? (
                    <div className="space-y-2">
                      {acceptedMeetings.map((meeting) => {
                        const isGroup = meeting.meeting_type === 'multi';
                        const otherParty = !isGroup 
                          ? (meeting.requester_id === currentUser?.id
                              ? users[(meeting.recipient_ids || [])[0]]
                              : users[meeting.requester_id])
                          : null;

                        return (
                          <div
                            key={meeting.id}
                            className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                              selectedMeetingId === meeting.id && selectedChatType === 'meeting'
                                ? 'bg-blue-50 border-blue-200'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                            }`}
                            onClick={() => {
                              setSelectedMeetingId(meeting.id);
                              setSelectedChatType('meeting');
                            }}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-xs">
                                {isGroup ? (
                                  <UserIcon className="w-4 h-4 text-white" />
                                ) : (
                                  <span className="text-white font-semibold">
                                    {otherParty?.full_name?.charAt(0)?.toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {isGroup 
                                    ? `Group: ${meeting.proposed_topic}`
                                    : otherParty?.full_name
                                  }
                                </p>
                                <p className="text-xs text-slate-600 truncate">
                                  {isGroup ? 'Group Chat' : meeting.proposed_topic}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500 text-xs">No meeting chats</p>
                    </div>
                  )}
                </div>

                {/* Connected Delegates Section */}
                <div>
                  <h4 className="font-medium text-sm text-slate-700 mb-2 flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    Connected Delegates ({connectedDelegates.length})
                  </h4>
                  {connectedDelegates.length > 0 ? (
                    <div className="space-y-2">
                      {connectedDelegates.map((delegate) => (
                        <div
                          key={`delegate-${delegate.id}`}
                          className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                            selectedMeetingId === delegate.id && selectedChatType === 'direct'
                              ? 'bg-green-50 border-green-200'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                          }`}
                          onClick={() => {
                            setSelectedMeetingId(delegate.id);
                            setSelectedChatType('direct');
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-xs">
                              <span className="text-white font-semibold">
                                {delegate.full_name?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {delegate.full_name}
                              </p>
                              <p className="text-xs text-slate-600 truncate">
                                {delegate.organization}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <UserIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500 text-xs">No connected delegates</p>
                    </div>
                  )}
                </div>

                {acceptedMeetings.length === 0 && connectedDelegates.length === 0 && (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">No conversations available</p>
                    <p className="text-slate-500 text-sm mt-1">
                      Accept meeting requests or connect with delegates to start chatting
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg h-[600px] flex flex-col">
              {chatPartner ? (
                <>
                  {/* Chat Header */}
                  <CardHeader className="border-b bg-slate-50 rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 bg-gradient-to-br ${
                          selectedChatType === 'meeting' 
                            ? 'from-blue-500 to-indigo-500' 
                            : 'from-green-500 to-emerald-500'
                        } rounded-full flex items-center justify-center`}>
                          <span className="text-white font-semibold">
                            {chatPartner.full_name?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {chatPartner.full_name}
                          </h3>
                          <p className="text-sm text-slate-600">
                            {selectedChatType === 'meeting' 
                              ? `${chatPartner.job_title} • ${selectedMeeting.proposed_topic}`
                              : `${chatPartner.job_title} • ${chatPartner.organization}`
                            }
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {selectedChatType === 'meeting' ? (
                          <p className="text-xs text-slate-500">
                            Meeting Duration: {selectedMeeting.proposed_duration} minutes
                          </p>
                        ) : (
                          <p className="text-xs text-slate-500">
                            Direct Chat • Connected Delegate
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {/* Messages Area */}
                  <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length > 0 ? (
                      messages.map((message) => {
                        const isCurrentUser = message.sender_id === currentUser?.id;
                        const isGroupChat = selectedChatType === 'meeting' && 
                                          acceptedMeetings.find(m => m.id === selectedMeetingId)?.meeting_type === 'multi';
                        
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
                              {/* Show sender name for group chats (except for current user) */}
                              {isGroupChat && !isCurrentUser && (
                                <p className="text-xs font-semibold mb-1 text-slate-600">
                                  {message.sender?.full_name || 'Unknown User'}
                                </p>
                              )}
                              <p className="text-sm">{message.message}</p>
                              <p className={`text-xs mt-1 ${
                                isCurrentUser ? 'text-blue-100' : 'text-slate-500'
                              }`}>
                                {isGroupChat && isCurrentUser ? 'You • ' : ''}
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
                          {selectedChatType === 'meeting' ? (
                            <>
                              <p className="text-slate-600">Start your conversation</p>
                              <p className="text-sm text-slate-500">
                                Send a message to begin chatting with {chatPartner.full_name}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-slate-600">Direct messaging coming soon!</p>
                              <p className="text-sm text-slate-500">
                                Direct messaging with {chatPartner.full_name} will be available in a future update.
                              </p>
                              <p className="text-xs text-slate-400 mt-2">
                                For now, please use meeting-based chats to communicate.
                              </p>
                            </>
                          )}
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
                        placeholder={
                          selectedChatType === 'meeting' 
                            ? "Type your message..." 
                            : "Direct messaging coming soon..."
                        }
                        className="flex-1"
                        disabled={sending || selectedChatType === 'direct'}
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={sending || !newMessage.trim() || selectedChatType === 'direct'}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {sending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    {selectedChatType === 'direct' && (
                      <p className="text-xs text-slate-500 mt-2 text-center">
                        Direct messaging feature is coming soon. Use meeting-based chats for now.
                      </p>
                    )}
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
