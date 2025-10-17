
import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/api/entities';
import { MeetingRequest } from '@/api/entities';
import { Notification } from '@/api/entities';
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
import { Send, Users as UsersIcon, User as UserIcon, Plus } from 'lucide-react';

export default function RequestMeetingDialog({ currentUser, afterSubmit }) {
  const [open, setOpen] = useState(false);
  const [delegates, setDelegates] = useState([]);
  const [meetingType, setMeetingType] = useState('single');
  const [selectedSingle, setSelectedSingle] = useState('');
  const [selectedMulti, setSelectedMulti] = useState([]);
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(45);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const loadDelegates = useCallback(async () => {
    if (!currentUser) return;
    const allUsers = await User.list();
    const availableDelegates = allUsers.filter(
      (u) => u.id !== currentUser.id && u.profile_completed && u.consent_given
    );
    setDelegates(availableDelegates);
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

  const handleSubmit = async () => {
    const recipientIds =
      meetingType === 'single' ? [selectedSingle] : selectedMulti;
    if (!topic || recipientIds.length === 0 || (meetingType === 'single' && !recipientIds[0])) return;

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
    }
    setSending(false);
  };

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
                <Label htmlFor="single-delegate">Delegate</Label>
                <Select value={selectedSingle} onValueChange={setSelectedSingle}>
                  <SelectTrigger id="single-delegate">
                    <SelectValue placeholder="Select a delegate" />
                  </SelectTrigger>
                  <SelectContent>
                    {delegates.map((delegate) => (
                      <SelectItem key={delegate.id} value={delegate.id}>
                        {delegate.full_name} ({delegate.organization})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Delegates ({selectedMulti.length} selected)</Label>
                <ScrollArea className="h-48 w-full rounded-md border p-4">
                  <div className="space-y-2">
                    {delegates.map((delegate) => (
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
              />
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
            disabled={sending}
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
