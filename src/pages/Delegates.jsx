
import React, { useState, useEffect, useCallback } from "react";
import { User } from "@/api/entities";
import { MeetingRequest } from "@/api/entities";
import { Notification } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  Send,
  Search,
  Filter,
  Globe,
  Building2,
  User as UserIcon,
  AlertCircle,
  ExternalLink,
  Clock
} from "lucide-react";
import { createPageUrl } from "@/utils";

export default function UsersDirectory() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [meetingRequest, setMeetingRequest] = useState({
    personal_message: '',
    proposed_topic: '',
    proposed_duration: 45
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [user, allUsers] = await Promise.all([
        User.me(),
        User.list()
      ]);

      setCurrentUser(user);

      // Filter out current user and only show users with completed profiles who haven't hidden their profiles
      const availableUsers = allUsers.filter(u =>
        u.id !== user.id &&
        u.profile_completed &&
        u.consent_given &&
        !u.is_profile_hidden
      );

      setUsers(availableUsers);
    } catch (error) {
      console.error("Error loading users:", error);
    }
    setLoading(false);
  };

  const filterUsers = useCallback(() => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.organization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.job_title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(user =>
        user.representation_type === typeFilter
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, typeFilter]);

  useEffect(() => {
    filterUsers();
  }, [filterUsers]);

  const sendMeetingRequest = async () => {
    if (!selectedUser || !meetingRequest.proposed_topic) return;

    setSending(true);
    try {
      // Generate unique 8-character meeting code
      const meetingCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      const newRequest = await MeetingRequest.create({
        requester_id: currentUser.id,
        recipient_ids: [selectedUser.id],
        meeting_type: 'single',
        personal_message: meetingRequest.personal_message,
        proposed_topic: meetingRequest.proposed_topic,
        proposed_duration: meetingRequest.proposed_duration,
        meeting_code: meetingCode
      });

      // Create notification for the recipient
      const recipient = await User.get(selectedUser.id);
      if (recipient.notification_preferences?.new_meeting_request !== false) {
        await Notification.create({
          user_id: selectedUser.id,
          type: 'new_meeting_request',
          title: 'New Meeting Request',
          body: `You have received a new meeting request from ${currentUser.full_name}. Meeting Code: ${meetingCode}`,
          link: createPageUrl("Meetings"),
          related_entity_id: newRequest.id,
        });
      }

      setSelectedUser(null);
      setMeetingRequest({
        personal_message: '',
        proposed_topic: '',
        proposed_duration: 45
      });
    } catch (error) {
      console.error("Error sending meeting request:", error);
    }
    setSending(false);
  };

  const canAccessUsers = currentUser?.consent_given && currentUser?.profile_completed;

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-64 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!canAccessUsers) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Access Restricted:</strong> Please complete your consent process and profile to browse users.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">User Directory</h1>
            <p className="text-slate-600 mt-1">Connect with verified users from around the world</p>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-slate-600">{filteredUsers.length} users available</span>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, organization, country..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                    <SelectItem value="ngo">NGO</SelectItem>
                    <SelectItem value="private_sector">Private Sector</SelectItem>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="international_org">International Org</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {user.full_name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{user.full_name}</CardTitle>
                      <p className="text-sm text-slate-600">{user.job_title}</p>
                    </div>
                  </div>
                  {user.linkedin_profile && (
                    <a
                      href={user.linkedin_profile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Building2 className="w-4 h-4" />
                  <span>{user.organization}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Globe className="w-4 h-4" />
                  <span>{user.country}</span>
                </div>

                <div className="space-y-2">
                  <Badge variant="secondary" className="text-xs">
                    {user.representation_type?.replace(/_/g, ' ')}
                  </Badge>
                  <Badge variant="outline" className="text-xs ml-2">
                    {user.industry_sector}
                  </Badge>
                </div>

                {user.biography && (
                  <p className="text-sm text-slate-600 line-clamp-3">
                    {user.biography}
                  </p>
                )}

                {/* Interests Preview */}
                {user.topical_interests?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-500">Key Interests:</p>
                    <div className="flex flex-wrap gap-1">
                      {user.topical_interests.slice(0, 3).map((interest, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {interest.topic}
                        </Badge>
                      ))}
                      {user.topical_interests.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{user.topical_interests.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                      onClick={() => setSelectedUser(user)}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Request Meeting
                    </Button>
                  </DialogTrigger>

                  {selectedUser?.id === user.id && (
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Request Meeting with {user.full_name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="topic">Proposed Topic *</Label>
                          <Input
                            id="topic"
                            placeholder="e.g., Climate Policy Coordination"
                            value={meetingRequest.proposed_topic}
                            onChange={(e) => setMeetingRequest(prev => ({
                              ...prev,
                              proposed_topic: e.target.value
                            }))}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="duration">Duration (minutes)</Label>
                          <Select
                            value={meetingRequest.proposed_duration.toString()}
                            onValueChange={(value) => setMeetingRequest(prev => ({
                              ...prev,
                              proposed_duration: parseInt(value)
                            }))}
                          >
                            <SelectTrigger>
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
                          <Label htmlFor="message">Personal Message</Label>
                          <Textarea
                            id="message"
                            placeholder="Introduce yourself and explain why you'd like to meet..."
                            value={meetingRequest.personal_message}
                            onChange={(e) => setMeetingRequest(prev => ({
                              ...prev,
                              personal_message: e.target.value
                            }))}
                            className="h-24"
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setSelectedUser(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={sendMeetingRequest}
                            disabled={sending || !meetingRequest.proposed_topic}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {sending ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                Send Request
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  )}
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No users found</h3>
            <p className="text-slate-600">Try adjusting your search filters or check back later</p>
          </div>
        )}
      </div>
    </div>
  );
}
