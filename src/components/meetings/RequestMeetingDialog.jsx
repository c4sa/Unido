
import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/api/entities';
import { MeetingRequest } from '@/api/entities';
import { Notification } from '@/api/entities';
import { Connection } from '@/api/entities';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { createPageUrl } from '@/utils';
import { Send, Users as UsersIcon, User as UserIcon, Plus, AlertCircle, CheckCircle } from 'lucide-react';

export default function RequestMeetingDialog({ currentUser, afterSubmit }) {
  const [open, setOpen] = useState(false);
  const [delegates, setDelegates] = useState([]);
  const [connectedDelegates, setConnectedDelegates] = useState([]);
  const [meetingType, setMeetingType] = useState('single');
  const [selectedSingle, setSelectedSingle] = useState('');
  const [selectedMulti, setSelectedMulti] = useState([]);
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(45);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [validatingConnections, setValidatingConnections] = useState(false);
  const [connectionValidation, setConnectionValidation] = useState(null);

  const loadDelegates = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const [allUsers, userConnections] = await Promise.all([
        User.list(),
        Connection.getUserConnections(currentUser.id)
      ]);
      
      const availableDelegates = allUsers.filter(
        (u) => u.id !== currentUser.id && u.profile_completed && u.consent_given
      );
      
      // Filter only connected delegates for meeting requests
      const connectedUserIds = new Set(
        userConnections.connections.accepted.map(conn => conn.other_user?.id).filter(Boolean)
      );
      
      const connected = availableDelegates.filter(delegate => 
        connectedUserIds.has(delegate.id)
      );
      
      setDelegates(availableDelegates);
      setConnectedDelegates(connected);
    } catch (error) {
      console.error('Error loading delegates and connections:', error);
      // Fallback to all delegates if connection loading fails
      const allUsers = await User.list();
      const availableDelegates = allUsers.filter(
        (u) => u.id !== currentUser.id && u.profile_completed && u.consent_given
      );
      setDelegates(availableDelegates);
      setConnectedDelegates([]);
    }
  }, [currentUser]);

  useEffect(() => {
    if (open) {
      loadDelegates();
    }
  }, [open, loadDelegates]);

  const handleMultiSelect = (delegateId) => {
    setSelectedMulti((prev) =>
      prev.includes(delegateId)
        ? prev.filter((id) => id !== delegateId)
        : [...prev, delegateId]
    );
  };

  const resetForm = () => {
    setMeetingType('single');
    setSelectedSingle('');
    setSelectedMulti([]);
    setTopic('');
    setDuration(45);
    setMessage('');
    setSending(false);
  };

  const validateGroupConnections = async (recipientIds) => {
    if (!currentUser || recipientIds.length === 0) return null;
    
    setValidatingConnections(true);
    try {
      const apiUrl = import.meta.env.DEV 
        ? 'http://localhost:3000/api/validate-group-connections'
        : '/api/validate-group-connections';
        
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          requester_id: currentUser.id,
          recipient_ids: recipientIds
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to validate connections');
      }
      
      const result = await response.json();
      setConnectionValidation(result);
      return result;
    } catch (error) {
      console.error('Error validating group connections:', error);
      return null;
    } finally {
      setValidatingConnections(false);
    }
  };

  const handleSubmit = async () => {
    const recipientIds =
      meetingType === 'single' ? [selectedSingle] : selectedMulti;
    if (!topic || recipientIds.length === 0 || (meetingType === 'single' && !recipientIds[0])) return;

    // Validate topic length (database requires 5-200 characters)
    if (topic.length < 5) {
      alert('Meeting topic must be at least 5 characters long.');
      return;
    }

    if (topic.length > 200) {
      alert('Meeting topic must be no more than 200 characters long.');
      return;
    }

    // Validate connections for single meetings (already handled by showing only connected delegates)
    if (meetingType === 'single' && !connectedDelegates.some(d => d.id === selectedSingle)) {
      alert('Please select a connected delegate.');
      return;
    }

    // Validate connections for group meetings
    if (meetingType === 'multi') {
      const validation = await validateGroupConnections(recipientIds);
      if (!validation || !validation.can_send_group_meeting) {
        // Don't proceed if validation fails
        alert(validation?.error || 'You must be connected to all selected delegates to send a group meeting request.');
        return;
      }
    }

    setSending(true);
    try {
      const meetingCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      const newRequest = await MeetingRequest.create({
        requester_id: currentUser.id,
        recipient_ids: recipientIds,
        meeting_type: meetingType,
        proposed_topic: topic,
        proposed_duration: duration,
        personal_message: message,
        meeting_code: meetingCode,
      });

      for (const recipientId of recipientIds) {
        const recipient = await User.get(recipientId);
        if (recipient.notification_preferences?.new_meeting_request !== false) {
          await Notification.create({
            user_id: recipientId,
            type: 'new_meeting_request',
            title: `New ${meetingType === 'multi' ? 'Group ' : ''}Meeting Request`,
            body: `You have received a new meeting request from ${currentUser.full_name}.`,
            link: createPageUrl('Meetings'),
            related_entity_id: newRequest.id,
          });
        }
      }

      resetForm();
      setOpen(false);
      if (afterSubmit) {
        afterSubmit();
      }
    } catch (error) {
      console.error('Error creating meeting request:', error);
      alert(error.message || 'Failed to create meeting request');
    }
    setSending(false);
  };

  // Trigger validation when multi-delegate selection changes
  useEffect(() => {
    if (meetingType === 'multi' && selectedMulti.length > 0) {
      validateGroupConnections(selectedMulti);
    } else {
      setConnectionValidation(null);
    }
  }, [meetingType, selectedMulti, currentUser]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Request Meeting
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Request a New Meeting</DialogTitle>
          <DialogDescription>
            Organize a new meeting with one or more delegates.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Meeting Type</Label>
              <RadioGroup
                defaultValue="single"
                onValueChange={setMeetingType}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="r1" />
                  <Label htmlFor="r1" className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4" /> Single Delegate
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="multi" id="r2" />
                  <Label htmlFor="r2" className="flex items-center gap-2">
                    <UsersIcon className="w-4 h-4" /> Multi-Delegate
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {meetingType === 'single' ? (
              <div className="space-y-2">
                <Label htmlFor="single-delegate">Connected Delegate</Label>
                {connectedDelegates.length === 0 ? (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <p className="text-sm text-orange-800">
                        You need to connect with delegates before sending meeting requests. 
                        Visit the Delegates page to send connection requests.
                      </p>
                    </div>
                  </div>
                ) : (
                  <Select value={selectedSingle} onValueChange={setSelectedSingle}>
                    <SelectTrigger id="single-delegate">
                      <SelectValue placeholder="Select a connected delegate" />
                    </SelectTrigger>
                    <SelectContent>
                      {connectedDelegates.map((delegate) => (
                        <SelectItem key={delegate.id} value={delegate.id}>
                          {delegate.full_name} ({delegate.organization})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Connected Delegates ({selectedMulti.length} selected)</Label>
                {connectedDelegates.length === 0 ? (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <p className="text-sm text-orange-800">
                        You need to connect with delegates before sending group meeting requests. 
                        Visit the Delegates page to send connection requests.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <ScrollArea className="h-48 w-full rounded-md border p-4">
                      <div className="space-y-2">
                        {connectedDelegates.map((delegate) => (
                          <div
                            key={delegate.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`delegate-${delegate.id}`}
                              checked={selectedMulti.includes(delegate.id)}
                              onCheckedChange={() => handleMultiSelect(delegate.id)}
                            />
                            <label
                              htmlFor={`delegate-${delegate.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {delegate.full_name} ({delegate.organization})
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    
                    {/* Connection validation results */}
                    {validatingConnections && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <p className="text-sm text-blue-800">Validating connections...</p>
                        </div>
                      </div>
                    )}
                    
                    {connectionValidation && !validatingConnections && (
                      <div className={`p-3 border rounded-lg ${
                        connectionValidation.can_send_group_meeting 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-start gap-2">
                          {connectionValidation.can_send_group_meeting ? (
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              connectionValidation.can_send_group_meeting 
                                ? 'text-green-800' 
                                : 'text-red-800'
                            }`}>
                              {connectionValidation.can_send_group_meeting 
                                ? `✅ Connected to all ${connectionValidation.connected_count} selected delegates`
                                : `❌ Not connected to ${connectionValidation.unconnected_count} selected delegates`
                              }
                            </p>
                            {!connectionValidation.can_send_group_meeting && connectionValidation.connection_checks && (
                              <div className="mt-2">
                                <p className="text-xs text-red-700 mb-1">You need connections with:</p>
                                <ul className="text-xs text-red-700 space-y-1">
                                  {connectionValidation.connection_checks
                                    .filter(check => !check.connected)
                                    .map((check, idx) => (
                                      <li key={idx}>
                                        • {check.user_details?.full_name || 'Unknown User'}
                                        {check.user_details?.organization && ` (${check.user_details.organization})`}
                                      </li>
                                    ))
                                  }
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Proposed Topic *</Label>
              <Input
                id="topic"
                placeholder="e.g., Climate Policy Coordination"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className={
                  topic && topic.length < 5
                    ? 'border-red-300 focus:border-red-500'
                    : ''
                }
              />
              <div className="text-xs text-gray-500">
                {topic.length}/200 characters
                {topic && topic.length < 5 && (
                  <span className="text-red-600 ml-2">• Minimum 5 characters required</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Select
                value={duration.toString()}
                onValueChange={(val) => setDuration(parseInt(val))}
              >
                <SelectTrigger id="duration">
                  <SelectValue />
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
              <Label htmlFor="message">Personal Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Introduce yourself and explain why you'd like to meet..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="h-24"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              sending || 
              !topic || 
              topic.length < 5 ||
              (meetingType === 'single' && (!selectedSingle || connectedDelegates.length === 0)) ||
              (meetingType === 'multi' && (selectedMulti.length === 0 || connectedDelegates.length === 0 || (connectionValidation && !connectionValidation.can_send_group_meeting)))
            }
            className="bg-blue-600 hover:bg-blue-700"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
