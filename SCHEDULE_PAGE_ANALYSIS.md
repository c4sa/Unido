# Schedule.jsx Page - Complete Analysis

## Overview
The `Schedule.jsx` page is a comprehensive calendar/scheduling interface that displays a user's upcoming meetings and venue bookings in multiple view formats (day, week, month). It provides a visual timeline of events and allows users to navigate through different time periods.

## Data Sources and Database Tables

### 1. **Accepted Meetings** (Primary Data Source)
- **Table**: `meeting_requests`
- **Entity**: `MeetingRequest` (from `src/api/entities.js`)
- **Query**: `MeetingRequest.list('-created_date')`
- **Filtering Logic**:
  ```javascript
  const userMeetings = allMeetings.filter(meeting =>
    ((meeting.recipient_ids || []).includes(user.id) || meeting.requester_id === user.id) &&
    meeting.status === 'accepted'
  );
  ```
- **Purpose**: Shows meetings where the current user is either the requester or a recipient, and the meeting status is 'accepted'

### 2. **Venue Bookings** (Secondary Data Source)
- **Table**: `venue_bookings`
- **Entity**: `VenueBooking` (from `src/api/entities.js`)
- **Query**: `VenueBooking.list('-created_date')`
- **Filtering Logic**:
  ```javascript
  const userBookings = allBookings.filter(booking =>
    booking.status === 'active' && myMeetingIds.has(booking.meeting_request_id)
  );
  ```
- **Purpose**: Shows active venue bookings that are linked to the user's accepted meetings

### 3. **User Data** (Supporting Data)
- **Table**: `users`
- **Entity**: `User` (from `src/api/entities.js`)
- **Query**: `User.list()`
- **Purpose**: Creates a lookup object to display participant names and details

## Event Generation Logic

### **Events for a Date** come from TWO sources:

#### **Source 1: Venue Bookings (Priority)**
- **Table**: `venue_bookings`
- **Condition**: `isSameDay(parseISO(booking.start_time), date)`
- **Event Type**: `'booking'`
- **Color**: `'bg-blue-500'`
- **Data Mapping**:
  - `title`: `meeting.proposed_topic`
  - `subtitle`: `"${booking.room_name} - Floor ${booking.floor_level}"`
  - `time`: Formatted start and end times
  - `meeting_code`: From linked meeting
  - `participants`: Other participants (excluding current user)

#### **Source 2: Meetings Without Bookings (Fallback)**
- **Table**: `meeting_requests`
- **Condition**: `meeting.scheduled_time && isSameDay(parseISO(meeting.scheduled_time), date) && !hasBooking`
- **Event Type**: `'meeting'`
- **Color**: `'bg-orange-500'`
- **Data Mapping**:
  - `title`: `meeting.proposed_topic`
  - `subtitle`: `'No venue booked'`
  - `time`: Formatted scheduled time
  - `meeting_code`: From meeting
  - `participants`: Other participants (excluding current user)

## Statistics Calculations

### **1. Accepted Meetings Count**
- **Source**: `meetings.length`
- **Data**: Filtered `meeting_requests` where `status === 'accepted'`
- **Display**: "Accepted Meetings" card

### **2. Venue Bookings Count**
- **Source**: `bookings.length`
- **Data**: Filtered `venue_bookings` where `status === 'active'` and linked to user's meetings
- **Display**: "Venue Bookings" card

### **3. Total Minutes Scheduled**
- **Source**: `meetings.reduce((total, meeting) => total + (meeting.proposed_duration || 0), 0)`
- **Data**: Sum of `proposed_duration` from all accepted meetings
- **Display**: "Total Minutes Scheduled" card

## View Types and Date Calculations

### **Day View**
- **Dates**: `[currentDate]`
- **Navigation**: Previous/Next day
- **Display**: Single day with timeline

### **Week View**
- **Dates**: `eachDayOfInterval({ start: weekStart, end: weekEnd })`
- **Week Start**: Monday (`weekStartsOn: 1`)
- **Navigation**: Previous/Next week
- **Display**: 7-day grid

### **Month View**
- **Dates**: `eachDayOfInterval({ start: calendarStart, end: calendarEnd })`
- **Calendar Range**: Full calendar month (including partial weeks)
- **Navigation**: Previous/Next month
- **Display**: Full month grid with day cells

## Key Functions Analysis

### **`loadData()` Function**
```javascript
const loadData = async () => {
  // 1. Get current user
  const user = await User.me();
  
  // 2. Load all data in parallel
  const [allUsers, allMeetings, allBookings] = await Promise.all([
    User.list(),
    MeetingRequest.list('-created_date'),
    VenueBooking.list('-created_date')
  ]);
  
  // 3. Create user lookup
  const userLookup = {};
  allUsers.forEach(u => { userLookup[u.id] = u; });
  
  // 4. Filter user's accepted meetings
  const userMeetings = allMeetings.filter(meeting =>
    ((meeting.recipient_ids || []).includes(user.id) || meeting.requester_id === user.id) &&
    meeting.status === 'accepted'
  );
  
  // 5. Filter user's active bookings
  const myMeetingIds = new Set(userMeetings.map(m => m.id));
  const userBookings = allBookings.filter(booking =>
    booking.status === 'active' && myMeetingIds.has(booking.meeting_request_id)
  );
};
```

### **`getEventsForDate(date)` Function**
```javascript
const getEventsForDate = (date) => {
  const events = [];
  
  // 1. Add venue bookings as events
  bookings.forEach(booking => {
    if (isSameDay(parseISO(booking.start_time), date)) {
      const meeting = meetings.find(m => m.id === booking.meeting_request_id);
      if (meeting) {
        events.push({
          id: booking.id,
          type: 'booking',
          title: meeting.proposed_topic,
          subtitle: `${booking.room_name} - Floor ${booking.floor_level}`,
          time: `${format(parseISO(booking.start_time), 'HH:mm')} - ${format(parseISO(booking.end_time), 'HH:mm')}`,
          // ... more properties
        });
      }
    }
  });
  
  // 2. Add meetings without bookings as events
  meetings.forEach(meeting => {
    if (meeting.scheduled_time && isSameDay(parseISO(meeting.scheduled_time), date)) {
      const hasBooking = bookings.some(b => b.meeting_request_id === meeting.id);
      if (!hasBooking) {
        events.push({
          id: meeting.id,
          type: 'meeting',
          title: meeting.proposed_topic,
          subtitle: 'No venue booked',
          time: format(parseISO(meeting.scheduled_time), 'HH:mm'),
          // ... more properties
        });
      }
    }
  });
  
  // 3. Sort events by time
  return events.sort((a, b) => {
    if (a.fullTime && b.fullTime) {
      return a.fullTime.start - b.fullTime.start;
    }
    return a.time.localeCompare(b.time);
  });
};
```

## Database Schema Dependencies

### **meeting_requests Table**
- **Primary Key**: `id`
- **Fields Used**:
  - `requester_id` - Meeting creator
  - `recipient_ids` - Array of recipient user IDs
  - `status` - Meeting status ('accepted', 'pending', 'declined', 'cancelled')
  - `proposed_topic` - Meeting title
  - `scheduled_time` - When meeting is scheduled
  - `proposed_duration` - Meeting duration in minutes
  - `meeting_code` - Unique meeting identifier

### **venue_bookings Table**
- **Primary Key**: `id`
- **Fields Used**:
  - `meeting_request_id` - Links to meeting_requests.id
  - `status` - Booking status ('active', 'cancelled', etc.)
  - `start_time` - Booking start time
  - `end_time` - Booking end time
  - `room_name` - Venue room name
  - `floor_level` - Floor number

### **users Table**
- **Primary Key**: `id`
- **Fields Used**:
  - `id` - User identifier
  - `full_name` - Display name for participants

## Event Display Logic

### **Event Prioritization**
1. **Venue Bookings** are shown first (blue color)
2. **Meetings without bookings** are shown second (orange color)
3. **No duplicate events** - if a meeting has a booking, only the booking is shown

### **Event Sorting**
- Events are sorted by start time
- Uses `fullTime.start` for precise time comparison
- Falls back to string comparison for time display

### **Participant Display**
- Shows all participants except the current user
- Displays as comma-separated list: "With: John Doe, Jane Smith"
- Uses `full_name` from users table

## UI Components and Features

### **View Switcher**
- Day, Week, Month views
- Navigation controls (Previous/Next/Today)
- Responsive design for mobile/desktop

### **Event Cards**
- Color-coded by event type
- Shows meeting code as badge
- Displays participant information
- Clickable for day detail view

### **Statistics Cards**
- Real-time counts of meetings and bookings
- Total scheduled minutes calculation
- Visual icons for each metric

## Performance Considerations

### **Data Loading**
- Uses `Promise.all()` for parallel data fetching
- Single query for each table type
- Client-side filtering for user-specific data

### **Event Generation**
- Events are generated on-demand for each date
- No pre-computation or caching
- Efficient date comparison using `date-fns`

### **Memory Usage**
- Stores all meetings and bookings in state
- Creates user lookup object for O(1) participant name resolution
- No pagination for meeting data

## Dependencies

### **External Libraries**
- `date-fns` - Date manipulation and formatting
- `react-router-dom` - Navigation
- `lucide-react` - Icons

### **Internal Dependencies**
- `@/api/entities` - Data access layer
- `@/components/ui/*` - UI components
- `@/utils` - Utility functions

## Summary

The Schedule page is a comprehensive calendar interface that aggregates data from three main database tables (`meeting_requests`, `venue_bookings`, `users`) to provide users with a visual representation of their upcoming meetings and venue bookings. It prioritizes venue bookings over standalone meetings and provides multiple view formats for different use cases.
