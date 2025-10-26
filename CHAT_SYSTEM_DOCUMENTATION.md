# **Complete Documentation: Chat.jsx Page**

## **📋 Overview**

`Chat.jsx` is a comprehensive real-time messaging system that enables secure communication between users for both single-user and multi-user meetings. It provides a modern chat interface with advanced features like message deduplication, smart polling, access control, and notification integration.

---

## **🔐 Access Control**

- **Role Required**: Any authenticated user
- **Meeting Access**: Only participants of accepted meetings can access chats
- **Chat Eligibility**: Users can only chat in meetings they are participants of

---

## **🎯 Key Features**

### **1. Meeting-Based Chat System**
- **Single Meeting Chats**: Direct messaging between two participants
- **Group Meeting Chats**: Multi-participant group conversations
- **Meeting Selection**: Sidebar with all eligible meetings
- **Real-time Updates**: Live message polling and updates

### **2. Advanced Messaging Features**
- **Message Deduplication**: Prevents duplicate messages in group chats
- **Smart Polling**: Adaptive polling based on tab visibility
- **Read Status Tracking**: Marks messages as read automatically
- **Message History**: Complete conversation history
- **Typing Indicators**: Real-time message sending status

### **3. Notification Integration**
- **In-app Notifications**: Creates notifications for new messages
- **Email Integration**: Optional email notifications
- **Notification Preferences**: Respects user notification settings

### **4. Performance Optimizations**
- **Batch Operations**: Efficient message loading and updates
- **Error Handling**: Robust error recovery and retry logic
- **Memory Management**: Optimized state updates and cleanup

---

## **🗄️ Database Schema Details**

### **1. `chat_messages` Table**
```sql
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by TEXT,
  
  -- Message details
  meeting_request_id UUID NOT NULL REFERENCES public.meeting_requests(id),
  sender_id UUID NOT NULL REFERENCES public.users(id),
  recipient_id UUID NOT NULL REFERENCES public.users(id),
  
  -- Message content
  message TEXT NOT NULL CHECK (length(message) >= 1 AND length(message) <= 5000),
  read_status BOOLEAN DEFAULT FALSE NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system')),
  
  -- Business logic constraints
  CONSTRAINT no_self_message CHECK (sender_id != recipient_id)
);
```

### **2. `meeting_requests` Table** (Relevant Fields)
```sql
CREATE TABLE public.meeting_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES public.users(id),
  recipient_ids UUID[] NOT NULL,
  meeting_type TEXT NOT NULL DEFAULT 'single', -- 'single' or 'multi'
  status TEXT NOT NULL DEFAULT 'pending',      -- 'pending', 'accepted', 'declined', 'cancelled'
  proposed_topic TEXT NOT NULL,
  proposed_duration INTEGER NOT NULL DEFAULT 45,
  -- ... other fields
);
```

### **3. `meeting_participants` Table** (For Group Meetings)
```sql
CREATE TABLE public.meeting_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_request_id UUID NOT NULL REFERENCES public.meeting_requests(id),
  participant_id UUID NOT NULL REFERENCES public.users(id),
  participant_type TEXT NOT NULL CHECK (participant_type IN ('requester', 'recipient')),
  response_status TEXT NOT NULL DEFAULT 'pending' CHECK (response_status IN ('pending', 'accepted', 'declined')),
  -- ... other fields
);
```

### **4. `notifications` Table** (For Message Notifications)
```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  type TEXT NOT NULL CHECK (type IN ('new_message', 'meeting_request', 'connection_request', 'venue_booking')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  related_entity_id UUID,
  read_status BOOLEAN DEFAULT FALSE NOT NULL,
  -- ... other fields
);
```

---

## **📊 Data Flow Analysis**

### **Chat.jsx Data Flow**:

```
User Login → Chat.jsx → Load Data
├── User.me() → Current User Info
├── User.list() → All Users (for lookup)
├── MeetingRequest.list() → All Meeting Requests
└── Filter Eligible Meetings → Accepted Meetings Only
    ├── Single Meetings: status === 'accepted'
    └── Group Meetings: Check meeting_participants table
    
Selected Meeting → Load Messages
├── ChatMessage.canAccessMeetingChat() → Access Verification
├── ChatMessage.getMeetingMessages() → Message Retrieval
│   ├── Single Chat: Direct sender/recipient messages
│   └── Group Chat: All messages with deduplication
└── Mark Messages as Read → Update read_status

Send Message → Message Processing
├── Single Chat: ChatMessage.create() → Single message
├── Group Chat: ChatMessage.sendGroupMessage() → Multiple messages
├── Notification.create() → In-app notifications
└── Refresh Messages → Real-time update
```

---

## **🔧 Single vs Multi-User Meeting Chat Logic**

### **Single Meeting Chats**:

#### **Access Control**:
```javascript
// User can access if:
// 1. Meeting status is 'accepted'
// 2. User is either requester or recipient
const canAccess = meetingData.status === 'accepted' && 
                  (meetingData.requester_id === userId || 
                   (meetingData.recipient_ids || []).includes(userId));
```

#### **Message Storage**:
- **One message per recipient**: Each message is stored individually
- **Direct communication**: Messages between two participants only
- **Simple retrieval**: Get messages where user is sender or recipient

#### **Message Flow**:
```
User A sends message → ChatMessage.create()
├── meeting_request_id: meetingId
├── sender_id: User A
├── recipient_id: User B
├── message: "Hello"
└── message_type: "text"
```

### **Multi-User Meeting Chats**:

#### **Access Control**:
```javascript
// User can access if:
// 1. User is in meeting_participants table
// 2. response_status is 'accepted'
const { data: participant } = await supabase
  .from('meeting_participants')
  .select('response_status')
  .eq('meeting_request_id', meetingId)
  .eq('participant_id', userId)
  .eq('response_status', 'accepted')
  .single();
```

#### **Message Storage**:
- **Multiple messages per send**: One message for each recipient
- **Group communication**: Messages visible to all participants
- **Deduplication**: Prevents duplicate messages in UI

#### **Message Flow**:
```
User A sends message → ChatMessage.sendGroupMessage()
├── Get all accepted participants except sender
├── Create message for each recipient:
│   ├── meeting_request_id: meetingId
│   ├── sender_id: User A
│   ├── recipient_id: User B
│   ├── message: "Hello everyone"
│   └── message_type: "text"
│   ├── meeting_request_id: meetingId
│   ├── sender_id: User A
│   ├── recipient_id: User C
│   ├── message: "Hello everyone"
│   └── message_type: "text"
└── Return all created messages
```

---

## **🔄 Real-time Features**

### **Smart Polling System**:

#### **Active Tab (Visible)**:
- **Polling Frequency**: 5 seconds
- **Full Updates**: Includes read status updates
- **Error Recovery**: Resets error count on successful load

#### **Inactive Tab (Hidden)**:
- **Polling Frequency**: 30 seconds
- **Reduced Updates**: Skips read status updates for performance
- **Error Handling**: Continues polling with reduced frequency

#### **Error Management**:
```javascript
let consecutiveErrors = 0;
// Stop polling after 5 consecutive errors
if (consecutiveErrors >= 5) {
  clearInterval(interval);
}
```

### **Message Deduplication**:

#### **Algorithm**:
```javascript
// Create robust deduplication key
const messageTime = new Date(msg.created_date).getTime();
const contentHash = msg.message.trim().split('').reduce((a, b) => {
  a = ((a << 5) - a) + b.charCodeAt(0);
  return a & a;
}, 0).toString(36).slice(0, 8);
const deduplicationKey = `${msg.sender_id}-${contentHash}-${Math.floor(messageTime / 1000)}`;
```

#### **Purpose**:
- **Prevents Duplicates**: Eliminates duplicate messages in group chats
- **Time Window**: 1-second window for message grouping
- **Content Hash**: Uses message content for deduplication
- **Sender ID**: Includes sender for proper attribution

---

## **📱 User Interface Components**

### **1. Chat Selection Sidebar**:
```javascript
// Meeting Chats Section
<div className="space-y-2">
  {acceptedMeetings.map((meeting) => {
    const isGroup = meeting.meeting_type === 'multi';
    const otherParty = !isGroup 
      ? (meeting.requester_id === currentUser?.id
          ? users[(meeting.recipient_ids || [])[0]]
          : users[meeting.requester_id])
      : null;
    
    return (
      <div className="p-3 rounded-lg cursor-pointer">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full">
            {isGroup ? <Users className="w-4 h-4 text-white" /> : 
             <span className="text-white font-semibold">
               {otherParty?.full_name?.charAt(0)?.toUpperCase()}
             </span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {isGroup ? `Group: ${meeting.proposed_topic}` : otherParty?.full_name}
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
```

### **2. Chat Header**:
```javascript
// Dynamic header based on chat type
<div className="flex items-center gap-3">
  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full">
    {selectedMeeting && selectedMeeting.meeting_type === 'multi' ? (
      <Users className="w-5 h-5 text-white" />
    ) : (
      <span className="text-white font-semibold">
        {chatPartner.full_name?.charAt(0)?.toUpperCase()}
      </span>
    )}
  </div>
  <div>
    <h3 className="font-semibold text-slate-900">
      {selectedMeeting && selectedMeeting.meeting_type === 'multi' 
        ? selectedMeeting.proposed_topic
        : chatPartner.full_name
      }
    </h3>
    <p className="text-sm text-slate-600">
      {selectedMeeting && selectedMeeting.meeting_type === 'multi' 
        ? `Group Meeting • ${(selectedMeeting.recipient_ids || []).length + 1} participants`
        : `${chatPartner.job_title} • ${selectedMeeting.proposed_topic}`
      }
    </p>
  </div>
</div>
```

### **3. Message Display**:
```javascript
// Message rendering with sender attribution
{messages.map((message) => {
  const isCurrentUser = message.sender_id === currentUser?.id;
  const isGroupChat = selectedMeeting?.meeting_type === 'multi';
  
  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isCurrentUser ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'
      }`}>
        {/* Show sender name for group chats (except current user) */}
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
})}
```

---

## **🔔 Notification System**

### **Message Notifications**:

#### **Single Chat Notifications**:
```javascript
// Create notification for recipient
Notification.create({
  user_id: recipientId,
  type: 'new_message',
  title: 'New Message',
  body: `You have a new message from ${currentUser.full_name}.`,
  link: createPageUrl(`Chat?request=${selectedMeetingId}`),
  related_entity_id: newMsg.id,
});
```

#### **Group Chat Notifications**:
```javascript
// Create notifications for all recipients
const notificationPromises = messages.map(async (message) => {
  const recipient = await User.get(message.recipient_id);
  
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
});

// Execute all notifications in parallel (non-blocking)
Promise.all(notificationPromises).catch(error => {
  console.error('Some notifications failed:', error);
});
```

---

## **⚡ Performance Optimizations**

### **1. Message Loading Optimization**:
```javascript
// Only update state if messages have actually changed
const currentMessageIds = messages.map(m => m.id).sort().join(',');
const newMessageIds = chatMessages.map(m => m.id).sort().join(',');

if (currentMessageIds !== newMessageIds) {
  setMessages(chatMessages);
}
```

### **2. Batch Read Status Updates**:
```javascript
// Batch update for better performance
const unreadMessages = chatMessages.filter(
  msg => msg.recipient_id === currentUser.id && !msg.read_status
);

if (unreadMessages.length > 0) {
  const updatePromises = unreadMessages.map(msg => 
    ChatMessage.update(msg.id, { read_status: true })
  );
  await Promise.all(updatePromises);
}
```

### **3. Parallel Processing**:
```javascript
// Send message and create notification in parallel
const [newMsg, recipient] = await Promise.all([
  ChatMessage.create({...}),
  User.get(recipientId)
]);
```

### **4. Error Recovery**:
```javascript
// Session storage for error tracking
if (!sessionStorage.getItem(`chat_access_error_${selectedMeetingId}`)) {
  alert('You do not have access to this chat...');
  sessionStorage.setItem(`chat_access_error_${selectedMeetingId}`, 'shown');
}
```

---

## **🛠️ Technical Implementation**

### **State Management**:
```javascript
const [currentUser, setCurrentUser] = useState(null);
const [acceptedMeetings, setAcceptedMeetings] = useState([]);
const [selectedMeetingId, setSelectedMeetingId] = useState('');
const [selectedChatType, setSelectedChatType] = useState('meeting');
const [messages, setMessages] = useState([]);
const [newMessage, setNewMessage] = useState('');
const [users, setUsers] = useState({});
const [loading, setLoading] = useState(true);
const [sending, setSending] = useState(false);
```

### **URL Parameter Handling**:
```javascript
// Check URL for specific meeting request
const urlParams = new URLSearchParams(window.location.search);
const requestId = urlParams.get('request');
if (requestId) {
  setSelectedMeetingId(requestId);
}
```

### **Message Sending Logic**:
```javascript
const sendMessage = async () => {
  if (!newMessage.trim() || !selectedMeetingId || !currentUser?.id) return;

  const messageText = newMessage.trim();
  setSending(true);
  setNewMessage(''); // Clear input immediately for better UX
  
  try {
    if (selectedMeeting?.meeting_type === 'multi') {
      // Group chat: use optimized group message method
      const messages = await ChatMessage.sendGroupMessage(selectedMeetingId, currentUser.id, messageText);
      // Create notifications for all recipients
    } else {
      // Single meeting chat: use original method
      const recipientId = selectedMeeting.requester_id === currentUser.id
        ? (selectedMeeting.recipient_ids || [])[0]
        : selectedMeeting.requester_id;
      
      const newMsg = await ChatMessage.create({
        meeting_request_id: selectedMeetingId,
        sender_id: currentUser.id,
        recipient_id: recipientId,
        message: messageText,
        message_type: 'text'
      });
      // Create notification for recipient
    }
    
    // Optimized message reload
    setTimeout(() => {
      loadMessages(true); // Skip read updates for immediate reload
    }, 100);
    
  } catch (error) {
    console.error("Error sending message:", error);
    alert(error.message || 'Failed to send message');
    setNewMessage(messageText); // Restore message text on error
  }
  setSending(false);
};
```

---

## **🔒 Security Features**

### **1. Access Control**:
- **Meeting Verification**: Only participants can access chats
- **Status Checking**: Only accepted meetings allow chat
- **Participant Validation**: Group meetings require accepted participant status

### **2. Message Validation**:
- **Length Limits**: Messages must be 1-5000 characters
- **No Self-Messages**: Users cannot send messages to themselves
- **Content Filtering**: Basic message content validation

### **3. Error Handling**:
- **Access Denied**: Clear error messages for unauthorized access
- **Network Failures**: Retry logic for network issues
- **Session Management**: Error tracking to prevent spam

---

## **📈 Key Differences: Single vs Multi-User Chats**

| Aspect | Single Meeting Chat | Multi-User Meeting Chat |
|--------|-------------------|------------------------|
| **Participants** | 2 users only | 3+ users |
| **Message Storage** | 1 message per send | Multiple messages per send |
| **Access Control** | Simple requester/recipient check | meeting_participants table check |
| **Message Retrieval** | Direct sender/recipient filter | All messages with deduplication |
| **UI Display** | Simple conversation | Group chat with sender names |
| **Notifications** | Single notification | Multiple notifications |
| **Deduplication** | Not needed | Advanced deduplication algorithm |
| **Performance** | Lightweight | Optimized for multiple participants |

---

## **🎨 UI/UX Features**

### **Visual Design**:
- **Glass Card Design**: Modern translucent cards with backdrop blur
- **Gradient Avatars**: Colorful user avatars with initials
- **Message Bubbles**: Distinct styling for sent vs received messages
- **Status Indicators**: Real-time sending status and read receipts
- **Responsive Layout**: Adaptive design for different screen sizes

### **User Experience**:
- **Auto-scroll**: Messages automatically scroll to bottom
- **Keyboard Shortcuts**: Enter to send, Shift+Enter for new line
- **Loading States**: Clear feedback during message sending
- **Error Recovery**: Graceful handling of network issues
- **Empty States**: Helpful messages when no conversations exist

---

## **📝 Summary**

The `Chat.jsx` page provides a comprehensive real-time messaging system with:

1. **✅ Dual Chat Support**: Both single and multi-user meeting chats
2. **✅ Real-time Updates**: Smart polling with adaptive frequency
3. **✅ Advanced Features**: Message deduplication, read status, notifications
4. **✅ Performance Optimization**: Batch operations, parallel processing
5. **✅ Security**: Robust access control and validation
6. **✅ Error Handling**: Comprehensive error recovery and retry logic
7. **✅ Modern UI**: Responsive design with glass card aesthetics
8. **✅ Database Integration**: Efficient use of multiple tables
9. **✅ Notification System**: In-app and email notification support
10. **✅ URL Integration**: Direct links to specific meeting chats

The system efficiently handles both simple two-person conversations and complex group discussions while maintaining performance, security, and user experience standards.
