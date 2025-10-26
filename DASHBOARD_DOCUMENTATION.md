# **Complete Documentation: Dashboard.jsx Page**

## **📋 Overview**

`Dashboard.jsx` is the main landing page for authenticated users in the GC21 platform. It provides a comprehensive overview of user activity, statistics, and platform interactions. The dashboard serves as a central hub for users to monitor their professional networking activities, meeting requests, messages, and venue bookings.

---

## **🔐 Access Control**

- **Role Required**: Any authenticated user
- **Profile Requirements**: No specific role restrictions, but shows alerts for incomplete profiles
- **Data Scope**: User-specific data only (filtered by current user's ID)

---

## **🎯 Key Features**

### **1. User Statistics Dashboard**
- **Pending Requests**: Count of meeting requests awaiting user's response
- **Accepted Meetings**: Count of confirmed/accepted meetings
- **Unread Messages**: Count of unread chat messages
- **Upcoming Bookings**: Count of future venue reservations

### **2. Recent Activity Feed**
- **Meeting Requests**: Recent meeting requests (last 7 days)
- **Messages**: Recent chat messages (last 5)
- **Bookings**: Recent venue bookings (last 3)
- **Timeline View**: Chronological activity display

### **3. Upcoming Schedule**
- **Future Bookings**: User's upcoming venue reservations
- **Meeting Details**: Related meeting information
- **Time Display**: Start/end times and duration

### **4. Popular Venues Analytics**
- **Room Statistics**: Most reserved rooms during the event
- **Usage Visualization**: Bar charts showing booking frequency
- **Top 3 Rooms**: Ranked by reservation count

### **5. Meeting Modification System**
- **Edit Meeting Details**: Update meeting topic, duration, and personal message
- **Notification System**: Notifies other participants of changes
- **Validation**: Ensures required fields are completed

---

## **🗄️ Database Schema Details**

### **1. `users` Table** (Current User Data)
```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  consent_given BOOLEAN DEFAULT FALSE,
  profile_completed BOOLEAN DEFAULT FALSE,
  is_profile_hidden BOOLEAN DEFAULT FALSE,
  notification_preferences JSONB DEFAULT '{}',
  -- ... other fields
);
```

### **2. `meeting_requests` Table** (Meeting Data)
```sql
CREATE TABLE public.meeting_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES public.users(id),
  recipient_ids UUID[] NOT NULL,
  meeting_type TEXT NOT NULL DEFAULT 'single',
  status TEXT NOT NULL DEFAULT 'pending',
  proposed_topic TEXT NOT NULL,
  proposed_duration INTEGER NOT NULL DEFAULT 45,
  personal_message TEXT,
  meeting_code TEXT NOT NULL UNIQUE,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW(),
  -- ... other fields
);
```

### **3. `chat_messages` Table** (Message Data)
```sql
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_request_id UUID NOT NULL REFERENCES public.meeting_requests(id),
  sender_id UUID NOT NULL REFERENCES public.users(id),
  recipient_id UUID NOT NULL REFERENCES public.users(id),
  message TEXT NOT NULL,
  read_status BOOLEAN DEFAULT FALSE NOT NULL,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  -- ... other fields
);
```

### **4. `venue_bookings` Table** (Booking Data)
```sql
CREATE TABLE public.venue_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.venue_rooms(id),
  room_name TEXT NOT NULL,
  booked_by UUID NOT NULL REFERENCES public.users(id),
  meeting_request_id UUID REFERENCES public.meeting_requests(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_date TIMESTAMPTZ DEFAULT NOW(),
  -- ... other fields
);
```

### **5. `notifications` Table** (Notification Data)
```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  related_entity_id UUID,
  read_status BOOLEAN DEFAULT FALSE NOT NULL,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  -- ... other fields
);
```

---

## **📊 Data Flow Analysis**

### **Dashboard Data Loading Process**:

```
User Login → Dashboard.jsx → loadDashboardData()
├── User.me() → Current User Info
├── User.list() → All Users (for lookup)
├── MeetingRequest.list() → All Meeting Requests
├── ChatMessage.list() → All Chat Messages
└── VenueBooking.list() → All Venue Bookings

Data Processing → User-Specific Filtering
├── Filter userMeetingRequests → User's meetings only
├── Filter userMessages → User's messages only
├── Calculate Statistics → Counts and metrics
├── Build Recent Activity → Timeline of actions
├── Get Upcoming Bookings → Future reservations
└── Calculate Popular Rooms → Booking analytics

State Updates → UI Rendering
├── setStats() → Statistics cards
├── setRecentActivity() → Activity feed
├── setUpcomingBookings() → Schedule display
└── setMostReservedRooms() → Analytics display
```

---

## **📈 Statistics Calculation Logic**

### **1. Pending Requests Count**:
```javascript
const pendingRequests = userMeetingRequests.filter(req =>
  (req.recipient_ids || []).includes(user.id) && req.status === 'pending'
).length;
```
- **Logic**: Count meetings where current user is a recipient and status is 'pending'
- **Purpose**: Shows meetings awaiting user's response

### **2. Accepted Meetings Count**:
```javascript
const acceptedMeetings = userMeetingRequests.filter(req =>
  req.status === 'accepted'
).length;
```
- **Logic**: Count all meetings with 'accepted' status
- **Purpose**: Shows confirmed meetings (both sent and received)

### **3. Unread Messages Count**:
```javascript
const unreadMessages = userMessages.filter(msg =>
  msg.recipient_id === user.id && !msg.read_status
).length;
```
- **Logic**: Count messages where user is recipient and read_status is false
- **Purpose**: Shows new messages requiring attention

### **4. Upcoming Bookings Count**:
```javascript
const userUpcomingBookings = allBookings.filter(booking => {
  const bookingStart = new Date(booking.start_time);
  return (
    booking.status === 'active' &&
    bookingStart > now &&
    (booking.booked_by === user.id || acceptedMeetingIds.has(booking.meeting_request_id))
  );
}).length;
```
- **Logic**: Count future active bookings where user is booker or participant
- **Purpose**: Shows upcoming venue reservations

---

## **🔄 Recent Activity Feed Logic**

### **Activity Types and Processing**:

#### **1. Meeting Request Activities**:
```javascript
const recentMeetings = userMeetingRequests
  .filter(req => {
    const daysSinceUpdate = (now - new Date(req.updated_date || req.created_date)) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate <= 7; // Last 7 days
  })
  .sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date))
  .slice(0, 5); // Top 5

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
```

#### **2. Message Activities**:
```javascript
const recentMessages = userMessages
  .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
  .slice(0, 5); // Top 5

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
```

#### **3. Booking Activities**:
```javascript
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
```

### **Activity Sorting and Display**:
```javascript
// Sort activities by timestamp and take top 10
activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
setRecentActivity(activities.slice(0, 10));
```

---

## **📅 Upcoming Schedule Logic**

### **Booking Filtering**:
```javascript
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
```

### **Display Logic**:
```javascript
{upcomingBookings.map((booking) => {
  const relatedMeeting = meetingRequests.find(m => m.id === booking.meeting_request_id);
  const durationMinutes = (new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / (1000 * 60);

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
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
```

---

## **📊 Popular Venues Analytics**

### **Room Statistics Calculation**:
```javascript
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
```

### **Visualization Display**:
```javascript
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
```

---

## **✏️ Meeting Modification System**

### **Meeting Edit Process**:

#### **1. Edit Initiation**:
```javascript
const handleEditMeeting = (meeting) => {
  setEditingMeeting(meeting);
  setModifyForm({
    proposed_topic: meeting.proposed_topic || '',
    proposed_duration: meeting.proposed_duration || 45,
    personal_message: meeting.personal_message || ''
  });
};
```

#### **2. Save Modification**:
```javascript
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
```

---

## **🎨 UI Components and Visual Design**

### **1. Statistics Cards**:
```javascript
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
  {/* Similar cards for other statistics */}
</div>
```

### **2. Activity Feed**:
```javascript
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
```

### **3. Status Alerts**:
```javascript
{/* Profile Hidden Alert */}
{currentUser?.is_profile_hidden && (
  <Alert className="border-blue-200 bg-blue-50">
    <EyeOff className="h-4 w-4 text-blue-600" />
    <AlertDescription className="text-blue-800">
      <strong>You are in Hidden Mode.</strong> Your profile is not visible in the user directory.
      <Link to={createPageUrl("Profile")} className="ml-2 underline font-semibold">
        Update Privacy
      </Link>
    </AlertDescription>
  </Alert>
)}

{/* Consent Required Alert */}
{needsConsent && (
  <Alert className="border-red-200 bg-red-50">
    <AlertCircle className="h-4 w-4 text-red-600" />
    <AlertDescription className="text-red-800">
      <strong>Consent Required:</strong> Please complete the data protection consent process.
      <Link to={createPageUrl("Profile")} className="ml-2 underline">
        Complete Now →
      </Link>
    </AlertDescription>
  </Alert>
)}

{/* Profile Incomplete Alert */}
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
```

---

## **⚡ Performance Optimizations**

### **1. Parallel Data Loading**:
```javascript
const [allUsers, allMeetingRequests, allMessages, allBookings] = await Promise.all([
  User.list(),
  MeetingRequest.list('-created_date'),
  ChatMessage.list('-created_date'),
  VenueBooking.list('-created_date')
]);
```

### **2. Efficient User Lookup**:
```javascript
// Create user lookup map for O(1) access
const userLookup = {};
allUsers.forEach(u => {
  userLookup[u.id] = u;
});
setUsers(userLookup);
```

### **3. Optimized Filtering**:
```javascript
// Use Set for efficient membership testing
const acceptedMeetingIds = new Set(
  userMeetingRequests
    .filter(req => req.status === 'accepted')
    .map(req => req.id)
);
```

### **4. Smart Activity Sorting**:
```javascript
// Sort activities by timestamp and take top 10
activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
setRecentActivity(activities.slice(0, 10));
```

---

## **🔔 Notification Integration**

### **Meeting Modification Notifications**:
```javascript
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
```

---

## **🎯 Activity Icon and Color Logic**

### **Icon Selection**:
```javascript
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
```

### **Color Selection**:
```javascript
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
```

---

## **📱 Responsive Design Features**

### **Grid Layouts**:
- **Statistics**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- **Main Content**: `grid-cols-1 lg:grid-cols-3`
- **Quick Actions**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`

### **Adaptive Components**:
- **Cards**: Responsive padding and spacing
- **Text**: Truncation for long content
- **Images**: Responsive sizing
- **Navigation**: Mobile-friendly layout

---

## **🛠️ Technical Implementation**

### **State Management**:
```javascript
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
const [users, setUsers] = useState({});
const [editingMeeting, setEditingMeeting] = useState(null);
const [mostReservedRooms, setMostReservedRooms] = useState([]);
const [modifyForm, setModifyForm] = useState({
  proposed_topic: '',
  proposed_duration: 45,
  personal_message: ''
});
const [saving, setSaving] = useState(false);
```

### **Loading States**:
```javascript
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
```

---

## **📝 Summary**

The `Dashboard.jsx` page provides a comprehensive user overview with:

1. **✅ Real-time Statistics**: Live counts of pending requests, accepted meetings, unread messages, and upcoming bookings
2. **✅ Activity Timeline**: Chronological feed of recent user interactions
3. **✅ Schedule Management**: Upcoming venue reservations with meeting details
4. **✅ Analytics Dashboard**: Popular venues with visual usage statistics
5. **✅ Meeting Modification**: Edit meeting details with participant notifications
6. **✅ Status Alerts**: Profile completion and privacy mode notifications
7. **✅ Performance Optimization**: Parallel data loading and efficient filtering
8. **✅ Responsive Design**: Adaptive layout for all screen sizes
9. **✅ User Experience**: Glass card design with smooth transitions
10. **✅ Data Integration**: Comprehensive use of multiple database tables

The dashboard serves as the central hub for users to monitor their professional networking activities, providing both high-level statistics and detailed activity tracking in a modern, responsive interface.
