# **Complete Documentation: Rooms.jsx and Venues.jsx Pages**

## **📋 Overview**

Both `Rooms.jsx` and `Venues.jsx` are venue management pages that provide different interfaces for managing and viewing venue schedules. They share the same underlying data sources but serve different user roles and purposes.

---

## **🏢 Rooms.jsx - Admin Room Management**

### **Purpose**
- **Admin-only** page for comprehensive room management
- Allows administrators to create, edit, delete, and manage venue rooms
- Provides both room management and schedule viewing capabilities

### **Access Control**
- **Role Required**: `admin` only
- **Access Check**: `if (user.role !== 'admin')` → Shows "Access Denied"
- **Non-admin users**: Cannot access this page

### **Key Features**
1. **Room Management**:
   - Add new rooms
   - Edit existing room details
   - Delete rooms
   - Toggle room active/inactive status
   - Private room reservations

2. **Schedule Viewing**:
   - General schedule view for all rooms
   - Date selection for schedule viewing
   - Real-time booking status

### **Data Sources**

#### **Primary Tables**:
1. **`venue_rooms`** - Room definitions and properties
2. **`venue_bookings`** - Room bookings and reservations
3. **`users`** - User information for booking details
4. **`meeting_requests`** - Meeting information linked to bookings

#### **Data Loading Process**:
```javascript
const [allUsers, allBookings, allRooms] = await Promise.all([
  User.list(),                    // From: public.users
  VenueBooking.list(),           // From: public.venue_bookings
  VenueRoom.list()               // From: public.venue_rooms
]);
```

#### **Data Filtering**:
- **Rooms**: Shows ALL rooms (active and inactive)
- **Bookings**: Shows ALL bookings (active, completed, cancelled)
- **Users**: Shows ALL users for lookup purposes

---

## **📅 Venues.jsx - User Venue Schedule**

### **Purpose**
- **Public** page for all users to view venue schedules
- Shows available rooms and their booking status
- Provides schedule navigation and booking information

### **Access Control**
- **Role Required**: Any authenticated user
- **No role restrictions**: All users can access

### **Key Features**
1. **Schedule Viewing**:
   - View all active rooms
   - Navigate through dates
   - See booking status and participants
   - Real-time schedule updates

2. **User-Specific Data**:
   - Shows user's accepted meetings
   - Displays meeting participants
   - Personal booking information

### **Data Sources**

#### **Primary Tables**:
1. **`venue_rooms`** - Room definitions (active only)
2. **`venue_bookings`** - Room bookings (active only)
3. **`users`** - User information for participants
4. **`meeting_requests`** - User's accepted meetings

#### **Data Loading Process**:
```javascript
const [allUsers, allBookings, allRequests, allRooms] = await Promise.all([
  User.list(),                    // From: public.users
  VenueBooking.list(),           // From: public.venue_bookings
  MeetingRequest.list(),         // From: public.meeting_requests
  VenueRoom.list()               // From: public.venue_rooms
]);
```

#### **Data Filtering**:
- **Rooms**: Shows only ACTIVE rooms (`r.is_active = true`)
- **Bookings**: Shows only ACTIVE bookings (`b.status = 'active'`)
- **Meetings**: Shows only user's ACCEPTED meetings
- **Users**: Shows ALL users for participant lookup

---

## **🗄️ Database Schema Details**

### **1. `venue_rooms` Table**
```sql
CREATE TABLE public.venue_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by TEXT,
  
  -- Room details
  name TEXT NOT NULL UNIQUE,                    -- Room name (e.g., "Conference Room A")
  type TEXT NOT NULL DEFAULT 'small',          -- 'small' or 'large'
  capacity INTEGER NOT NULL,                    -- Max capacity (1-1000)
  floor INTEGER NOT NULL,                      -- Floor number (-5 to 200)
  location TEXT,                               -- Building/location info
  contact TEXT,                                -- Contact information
  description TEXT,                            -- Room description
  equipment TEXT[] DEFAULT '{}',               -- Available equipment array
  is_active BOOLEAN DEFAULT TRUE NOT NULL      -- Room availability status
);
```

### **2. `venue_bookings` Table**
```sql
CREATE TABLE public.venue_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by TEXT,
  
  -- Room reference and snapshot data
  room_id UUID NOT NULL REFERENCES public.venue_rooms(id),
  room_name TEXT NOT NULL,                     -- Denormalized room name
  room_type TEXT NOT NULL,                    -- Denormalized room type
  capacity INTEGER NOT NULL,                  -- Denormalized capacity
  floor_level INTEGER NOT NULL,               -- Denormalized floor
  equipment TEXT[] DEFAULT '{}',              -- Denormalized equipment
  
  -- Booking details
  booked_by UUID NOT NULL REFERENCES public.users(id),
  booking_type TEXT NOT NULL DEFAULT 'meeting', -- 'meeting' or 'private'
  meeting_request_id UUID REFERENCES public.meeting_requests(id),
  private_meeting_topic TEXT,                 -- Topic for private bookings
  
  -- Time details
  start_time TIMESTAMPTZ NOT NULL,            -- Booking start time
  end_time TIMESTAMPTZ NOT NULL,              -- Booking end time
  status TEXT NOT NULL DEFAULT 'active'       -- 'active', 'completed', 'cancelled'
);
```

### **3. `meeting_requests` Table** (Relevant Fields)
```sql
CREATE TABLE public.meeting_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES public.users(id),
  recipient_ids UUID[] NOT NULL,
  meeting_type TEXT NOT NULL DEFAULT 'single', -- 'single' or 'multi'
  status TEXT NOT NULL DEFAULT 'pending',      -- 'pending', 'accepted', 'declined', 'cancelled'
  proposed_topic TEXT NOT NULL,
  proposed_duration INTEGER NOT NULL DEFAULT 45,
  venue_booking_id UUID,                       -- Links to venue_bookings
  -- ... other fields
);
```

---

## **📊 Data Flow Analysis**

### **Rooms.jsx Data Flow**:

```
Admin User → Rooms.jsx → Load Data
├── venue_rooms (ALL rooms) → Room Management Tab
│   ├── Add/Edit/Delete Rooms
│   ├── Toggle Room Status
│   └── Private Reservations
└── venue_bookings (ALL bookings) → Schedule View Tab
    ├── users (ALL users) → ScheduleView Component
    └── Meeting Requests (ALL requests) → Time Slot Grid
                                        └── Booking Status Display
```

### **Venues.jsx Data Flow**:

```
Any User → Venues.jsx → Load Data
├── venue_rooms (ACTIVE only) → ScheduleView Component
├── venue_bookings (ACTIVE only) → Room Schedule Display
├── users (ALL users) → Booking Information
└── meeting_requests (USER'S accepted only) → Participant Names
                                            └── Meeting Details
```

---

## **🎯 ScheduleView Component**

### **Purpose**
- **Shared component** used by both Rooms.jsx and Venues.jsx
- Renders the actual schedule grid with time slots
- Handles booking status and availability logic

### **Key Props**:
```javascript
<ScheduleView 
  rooms={rooms}                    // Array of room objects
  bookings={bookings}              // Array of booking objects
  selectedDate={selectedDate}     // Date string (YYYY-MM-DD)
  users={users}                    // User lookup object
  currentUser={currentUser}        // Current user object
  acceptedMeetings={acceptedMeetings} // User's accepted meetings
  onTimeSlotClick={() => {}}       // Click handler (empty in both pages)
  isRoomAvailable={() => true}     // Availability checker (always true)
/>
```

### **Time Slot Logic**:
- **Time Slots**: 8:00 AM to 8:00 PM (30-minute intervals)
- **Booking Detection**: Checks if time slot overlaps with existing bookings
- **Availability**: Green = Available, Red = Booked, Gray = Inactive room
- **Participant Display**: Shows meeting participants or "Private" for private bookings

---

## **📈 Key Differences Summary**

| Aspect | Rooms.jsx (Admin) | Venues.jsx (User) |
|--------|------------------|-------------------|
| **Access** | Admin only | All users |
| **Rooms Shown** | All rooms (active + inactive) | Active rooms only |
| **Bookings Shown** | All bookings (all statuses) | Active bookings only |
| **Meetings Shown** | All meetings | User's accepted meetings only |
| **Functionality** | Full CRUD operations | Read-only schedule view |
| **Room Management** | ✅ Add/Edit/Delete | ❌ None |
| **Private Bookings** | ✅ Can create | ❌ Cannot create |
| **Schedule Navigation** | ✅ Date picker | ✅ Date navigation |
| **Real-time Updates** | ✅ Refresh button | ✅ Refresh button |

---

## **🔗 Data Relationships**

### **Primary Relationships**:
1. **`venue_bookings.room_id`** → **`venue_rooms.id`**
2. **`venue_bookings.booked_by`** → **`users.id`**
3. **`venue_bookings.meeting_request_id`** → **`meeting_requests.id`**
4. **`meeting_requests.venue_booking_id`** → **`venue_bookings.id`**

### **Data Denormalization**:
- **`venue_bookings`** stores denormalized room data (name, type, capacity, floor, equipment)
- **Purpose**: Performance optimization and historical data preservation
- **Benefit**: No need to JOIN with `venue_rooms` for display purposes

---

## **⚡ Performance Considerations**

### **Data Loading**:
- **Parallel Loading**: All data loaded simultaneously using `Promise.all()`
- **Error Handling**: Individual table failures don't break the entire page
- **Caching**: User lookup object created once for efficient participant name resolution

### **Schedule Rendering**:
- **Time Slot Calculation**: Efficient overlap detection for booking status
- **Participant Resolution**: Cached user lookup for fast name resolution
- **Conditional Rendering**: Only renders necessary booking information

---

## **🛠️ Technical Implementation**

### **State Management**:
```javascript
// Rooms.jsx
const [rooms, setRooms] = useState([]);           // All rooms
const [bookings, setBookings] = useState([]);     // All bookings
const [users, setUsers] = useState({});           // User lookup
const [currentUser, setCurrentUser] = useState(null);

// Venues.jsx  
const [rooms, setRooms] = useState([]);           // Active rooms only
const [bookings, setBookings] = useState([]);     // Active bookings only
const [acceptedMeetings, setAcceptedMeetings] = useState([]); // User's meetings
const [users, setUsers] = useState({});           // User lookup
const [currentUser, setCurrentUser] = useState(null);
```

### **Data Filtering Logic**:
```javascript
// Rooms.jsx - Shows all data
setRooms(allRooms || []);
setBookings(allBookings || []);

// Venues.jsx - Filters data
setRooms(allRooms.filter(r => r.is_active));                    // Active rooms only
setBookings(allBookings.filter(b => b.status === 'active'));  // Active bookings only
setAcceptedMeetings(userMeetings);                             // User's accepted meetings
```

---

## **📋 Component Structure**

### **Rooms.jsx Components**:
```
Rooms.jsx
├── Header (Title + Refresh + Add Room)
├── Error Alert (if error)
├── Tabs
│   ├── Manage Rooms Tab
│   │   ├── Room Grid (if rooms exist)
│   │   │   └── Room Cards
│   │   │       ├── Room Info
│   │   │       ├── Equipment Badges
│   │   │       ├── Action Menu (Edit/Private Reserve/Delete)
│   │   │       └── Active Toggle Switch
│   │   └── Empty State (if no rooms)
│   └── General Schedule Tab
│       ├── Date Selector
│       └── ScheduleView Component
└── Loading State
```

### **Venues.jsx Components**:
```
Venues.jsx
├── Header (Title + Date Navigation + Refresh)
├── Error Alert (if error)
├── Schedule Card
│   ├── ScheduleView Component (if rooms exist)
│   └── Empty State (if no rooms)
└── Loading State
```

---

## **🎨 UI/UX Features**

### **Rooms.jsx UI Elements**:
- **Glass Card Design**: Modern translucent cards with backdrop blur
- **Equipment Icons**: Dynamic icons for different equipment types
- **Status Badges**: Active/Inactive room status indicators
- **Dropdown Menus**: Context menus for room actions
- **Switch Controls**: Toggle room active status
- **Responsive Grid**: Adaptive layout for different screen sizes

### **Venues.jsx UI Elements**:
- **Date Navigation**: Previous/Next day buttons with date picker
- **Schedule Grid**: Time-based grid showing room availability
- **Color Coding**: Green (available), Red (booked), Gray (inactive)
- **Participant Display**: Shows meeting participants in booking slots
- **Legend**: Visual guide for schedule status colors

---

## **🔄 Real-time Features**

### **Data Refresh**:
- **Manual Refresh**: Both pages have refresh buttons
- **Loading States**: Spinner animations during data loading
- **Error Handling**: Retry buttons for failed operations
- **State Management**: Proper loading and error state handling

### **Schedule Updates**:
- **Live Booking Status**: Real-time booking information
- **Participant Names**: Dynamic participant resolution
- **Room Availability**: Real-time room status updates

---

## **📝 Summary**

This comprehensive documentation covers all aspects of both venue management pages:

1. **Rooms.jsx**: Admin-only page for full room management with CRUD operations
2. **Venues.jsx**: User-accessible page for schedule viewing and navigation
3. **Shared ScheduleView**: Common component for schedule rendering
4. **Database Integration**: Four primary tables with proper relationships
5. **Performance Optimization**: Parallel loading and efficient data handling
6. **User Experience**: Modern UI with responsive design and real-time updates

Both pages serve different user needs while sharing the same underlying data architecture, providing a comprehensive venue management solution for the GC21 application.
