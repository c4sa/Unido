# Diplomat Connect - Complete Project Documentation

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Database Schema](#2-database-schema)
3. [API Endpoints](#3-api-endpoints)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Authentication System](#5-authentication-system)
6. [Core Functionalities](#6-core-functionalities)
7. [Email System](#7-email-system)
8. [Deployment Configuration](#8-deployment-configuration)
9. [Environment Variables](#9-environment-variables)
10. [Development Setup](#10-development-setup)

---

## 1. Project Overview

### 1.1 Platform Description
**Diplomat Connect** is a comprehensive networking platform designed for diplomatic conferences and international meetings. It facilitates connections between delegates, meeting coordination, venue management, and secure communication.

### 1.2 Technology Stack
- **Frontend**: React 18 + Vite + TypeScript
- **Mobile App**: React Native / Flutter (Cross-platform)
- **Backend**: Node.js + Express (Development) / Vercel Serverless (Production)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Email**: Resend API (Primary) / Nodemailer with Gmail/Outlook/Custom SMTP (Fallback)
- **Deployment**: Vercel
- **UI Framework**: Tailwind CSS + Radix UI

### 1.3 Key Features
- **User Management**: Profile creation, role-based access (user/admin)
- **Passcode Registration**: One-time passcodes for new user registration
- **Connection System**: Delegate-to-delegate connection requests
- **Meeting Management**: Single and group meeting requests
- **Chat System**: Secure messaging between meeting participants
- **Venue Management**: Room booking and scheduling
- **Notification System**: Real-time notifications for platform events
- **Password Reset**: OTP-based password reset functionality
- **Admin Panel**: User management and system administration
- **Mobile App**: Cross-platform mobile application with full feature parity
- **Email Integration**: Resend API for reliable email delivery

---

## 2. Database Schema

### 2.1 Core Tables

#### **users** (extends Supabase auth.users)
```sql
CREATE TABLE public.users (
  -- System fields
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by TEXT,
  
  -- Authentication fields
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_password_reset BOOLEAN DEFAULT TRUE NOT NULL,
  
  -- Profile fields
  consent_given BOOLEAN DEFAULT FALSE NOT NULL,
  profile_completed BOOLEAN DEFAULT FALSE NOT NULL,
  is_profile_hidden BOOLEAN DEFAULT FALSE NOT NULL,
  representation_type TEXT CHECK (representation_type IN ('government', 'ngo', 'private_sector', 'academic', 'international_org', 'media')),
  country TEXT,
  job_title TEXT,
  organization TEXT,
  industry_sector TEXT,
  biography TEXT CHECK (biography IS NULL OR length(biography) >= 50),
  linkedin_profile TEXT CHECK (linkedin_profile IS NULL OR linkedin_profile ~ '^https?://.*linkedin\.com/.*$'),
  
  -- JSONB fields
  topical_interests JSONB DEFAULT '[]'::jsonb NOT NULL,
  geographical_interests JSONB DEFAULT '[]'::jsonb NOT NULL,
  preferred_meeting_duration INTEGER DEFAULT 45 CHECK (preferred_meeting_duration IN (30, 45, 60, 90, 120)),
  notification_preferences JSONB DEFAULT '{
    "new_meeting_request": true,
    "request_status_update": true,
    "new_message": true,
    "booking_confirmed": true
  }'::jsonb NOT NULL
);
```

#### **meeting_requests**
```sql
CREATE TABLE public.meeting_requests (
  -- System fields
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by TEXT,
  
  -- Meeting details
  requester_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_ids UUID[] NOT NULL CHECK (array_length(recipient_ids, 1) >= 1 AND array_length(recipient_ids, 1) <= 20),
  meeting_type TEXT NOT NULL DEFAULT 'single' CHECK (meeting_type IN ('single', 'multi')),
  meeting_code TEXT NOT NULL UNIQUE CHECK (meeting_code ~ '^[A-Z0-9]{8}$'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  
  -- Meeting content
  personal_message TEXT CHECK (length(personal_message) <= 1000),
  proposed_topic TEXT NOT NULL CHECK (length(proposed_topic) >= 5 AND length(proposed_topic) <= 200),
  proposed_duration INTEGER NOT NULL DEFAULT 45 CHECK (proposed_duration IN (30, 45, 60, 90, 120)),
  scheduled_time TIMESTAMPTZ,
  venue_booking_id UUID REFERENCES public.venue_bookings(id) ON DELETE SET NULL
);
```

#### **chat_messages**
```sql
CREATE TABLE public.chat_messages (
  -- System fields
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by TEXT,
  
  -- Message details
  meeting_request_id UUID NOT NULL REFERENCES public.meeting_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Message content
  message TEXT NOT NULL CHECK (length(message) >= 1 AND length(message) <= 5000),
  read_status BOOLEAN DEFAULT FALSE NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system')),
  
  -- Business logic constraints
  CONSTRAINT no_self_message CHECK (sender_id != recipient_id)
);
```

#### **venue_rooms**
```sql
CREATE TABLE public.venue_rooms (
  -- System fields
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by TEXT,
  
  -- Room details
  name TEXT NOT NULL UNIQUE CHECK (length(name) >= 2 AND length(name) <= 200),
  type TEXT NOT NULL DEFAULT 'small' CHECK (type IN ('small', 'large')),
  capacity INTEGER NOT NULL CHECK (capacity >= 1 AND capacity <= 1000),
  floor INTEGER NOT NULL CHECK (floor >= -5 AND floor <= 200),
  location TEXT CHECK (length(location) <= 500),
  contact TEXT CHECK (length(contact) <= 200),
  description TEXT CHECK (length(description) <= 1000),
  equipment TEXT[] DEFAULT '{}' CHECK (array_length(equipment, 1) IS NULL OR array_length(equipment, 1) <= 20),
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);
```

#### **venue_bookings**
```sql
CREATE TABLE public.venue_bookings (
  -- System fields
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by TEXT,
  
  -- Room reference and snapshot data
  room_id UUID NOT NULL REFERENCES public.venue_rooms(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL,
  room_type TEXT NOT NULL CHECK (room_type IN ('small', 'large')),
  capacity INTEGER NOT NULL CHECK (capacity >= 1 AND capacity <= 1000),
  floor_level INTEGER NOT NULL,
  equipment TEXT[] DEFAULT '{}',
  
  -- Booking details
  booked_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  booking_type TEXT NOT NULL DEFAULT 'meeting' CHECK (booking_type IN ('meeting', 'private')),
  meeting_request_id UUID REFERENCES public.meeting_requests(id) ON DELETE CASCADE,
  private_meeting_topic TEXT CHECK (length(private_meeting_topic) <= 200),
  
  -- Time details
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  
  -- Validation constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_duration CHECK (end_time - start_time <= INTERVAL '4 hours'),
  CONSTRAINT valid_future_booking CHECK (start_time >= NOW() - INTERVAL '15 minutes')
);
```

#### **notifications**
```sql
CREATE TABLE public.notifications (
  -- System fields
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by TEXT,
  
  -- Notification details
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'new_meeting_request',
    'request_accepted', 
    'request_declined',
    'request_status_update',
    'meeting_updated',
    'new_message',
    'booking_confirmed',
    'booking_cancelled'
  )),
  
  -- Content
  title TEXT NOT NULL CHECK (length(title) >= 3 AND length(title) <= 200),
  body TEXT NOT NULL CHECK (length(body) >= 10 AND length(body) <= 1000),
  link TEXT CHECK (length(link) <= 500),
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  related_entity_id UUID
);
```

### 2.2 Additional Tables

#### **passcodes** (Passcode Registration System)
```sql
CREATE TABLE public.passcodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^UN-[0-9]{4}$'),
  is_used BOOLEAN DEFAULT FALSE NOT NULL,
  used_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_date TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### **password_reset_otps** (Password Reset System)
```sql
CREATE TABLE public.password_reset_otps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL CHECK (otp_code ~ '^[0-9]{6}$'),
  is_used BOOLEAN DEFAULT FALSE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_date TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### **delegate_connections** (Connection System)
```sql
CREATE TABLE public.delegate_connections (
  -- System fields
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by TEXT,
  
  -- Connection details
  requester_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  connection_message TEXT CHECK (length(connection_message) <= 500),
  
  -- Constraints
  CONSTRAINT no_self_connection CHECK (requester_id != recipient_id),
  CONSTRAINT unique_connection_pair UNIQUE (requester_id, recipient_id)
);
```

### 2.3 Database Functions

#### **Profile Completion Function**
```sql
CREATE OR REPLACE FUNCTION check_profile_completion()
RETURNS TRIGGER AS $$
BEGIN
  NEW.profile_completed := (
    NEW.consent_given = TRUE AND
    NEW.representation_type IS NOT NULL AND
    NEW.country IS NOT NULL AND
    NEW.job_title IS NOT NULL AND
    NEW.organization IS NOT NULL AND
    NEW.industry_sector IS NOT NULL AND
    NEW.biography IS NOT NULL AND
    length(NEW.biography) >= 50 AND
    jsonb_array_length(NEW.topical_interests) >= 1 AND
    jsonb_array_length(NEW.geographical_interests) >= 1
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### **Meeting Code Generation**
```sql
CREATE OR REPLACE FUNCTION generate_meeting_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

#### **Connection Management Functions**
```sql
-- Check if two users are connected
CREATE OR REPLACE FUNCTION are_users_connected(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.delegate_connections 
    WHERE status = 'accepted' 
    AND (
      (requester_id = user1_id AND recipient_id = user2_id) OR
      (requester_id = user2_id AND recipient_id = user1_id)
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Get user's connections
CREATE OR REPLACE FUNCTION get_user_connections(user_id UUID)
RETURNS TABLE (
  connection_id UUID,
  connected_user_id UUID,
  connection_status TEXT,
  connection_created_date TIMESTAMPTZ,
  is_requester BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id as connection_id,
    CASE 
      WHEN dc.requester_id = user_id THEN dc.recipient_id
      ELSE dc.requester_id
    END as connected_user_id,
    dc.status as connection_status,
    dc.created_date as connection_created_date,
    (dc.requester_id = user_id) as is_requester
  FROM public.delegate_connections dc
  WHERE (dc.requester_id = user_id OR dc.recipient_id = user_id)
  ORDER BY dc.created_date DESC;
END;
$$ LANGUAGE plpgsql;
```

### 2.4 Indexes and Performance

#### **User Indexes**
```sql
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_organization ON public.users(organization);
CREATE INDEX idx_users_country ON public.users(country);
CREATE INDEX idx_users_representation_type ON public.users(representation_type);
CREATE INDEX idx_users_profile_completed ON public.users(profile_completed);
```

#### **Meeting Request Indexes**
```sql
CREATE INDEX idx_meeting_requests_requester ON public.meeting_requests(requester_id);
CREATE INDEX idx_meeting_requests_recipients ON public.meeting_requests USING GIN(recipient_ids);
CREATE INDEX idx_meeting_requests_status ON public.meeting_requests(status);
CREATE INDEX idx_meeting_requests_code ON public.meeting_requests(meeting_code);
CREATE INDEX idx_meeting_requests_created ON public.meeting_requests(created_date DESC);
CREATE INDEX idx_meeting_requests_type ON public.meeting_requests(meeting_type);
```

#### **Chat Message Indexes**
```sql
CREATE INDEX idx_chat_messages_meeting ON public.chat_messages(meeting_request_id, created_date);
CREATE INDEX idx_chat_messages_sender ON public.chat_messages(sender_id);
CREATE INDEX idx_chat_messages_recipient ON public.chat_messages(recipient_id, read_status);
CREATE INDEX idx_chat_messages_created ON public.chat_messages(created_date DESC);
```

#### **Venue Booking Indexes**
```sql
CREATE INDEX idx_venue_bookings_room_time ON public.venue_bookings(room_id, start_time, end_time, status);
CREATE INDEX idx_venue_bookings_booked_by ON public.venue_bookings(booked_by);
CREATE INDEX idx_venue_bookings_meeting ON public.venue_bookings(meeting_request_id);
CREATE INDEX idx_venue_bookings_status ON public.venue_bookings(status);
CREATE INDEX idx_venue_bookings_start_time ON public.venue_bookings(start_time);
CREATE INDEX idx_venue_bookings_type ON public.venue_bookings(booking_type);
```

#### **Connection Indexes**
```sql
CREATE INDEX idx_delegate_connections_requester ON public.delegate_connections(requester_id);
CREATE INDEX idx_delegate_connections_recipient ON public.delegate_connections(recipient_id);
CREATE INDEX idx_delegate_connections_status ON public.delegate_connections(status);
CREATE INDEX idx_delegate_connections_user_status ON public.delegate_connections(requester_id, recipient_id, status);
```

---

## 3. API Endpoints

### 3.1 Authentication APIs

#### **POST /api/verify-passcode**
- **Purpose**: Verify passcode and create new user account
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "code": "UN-1234"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "email": "user@example.com",
    "tempPassword": "generated_password",
    "userId": "user_uuid",
    "role": "user"
  }
  ```

#### **POST /api/send-password-reset-otp**
- **Purpose**: Send OTP for password reset
- **Request Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "OTP sent successfully"
  }
  ```

#### **POST /api/update-password-after-otp**
- **Purpose**: Update password after OTP verification
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "otp": "123456",
    "newPassword": "new_password"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Password updated successfully"
  }
  ```

### 3.2 User Management APIs

#### **POST /api/create-user**
- **Purpose**: Admin creates new user account
- **Request Body**:
  ```json
  {
    "email": "newuser@example.com",
    "role": "user"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "email": "newuser@example.com",
    "tempPassword": "generated_password",
    "userId": "user_uuid",
    "role": "user"
  }
  ```

### 3.3 Connection APIs

#### **POST /api/send-connection-request**
- **Purpose**: Send connection request to another user
- **Request Body**:
  ```json
  {
    "recipient_id": "user_uuid",
    "message": "Optional connection message"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "connection_id": "connection_uuid",
    "message": "Connection request sent successfully"
  }
  ```

#### **GET /api/user-connections**
- **Purpose**: Get user's connections
- **Query Parameters**: `user_id`
- **Response**:
  ```json
  {
    "success": true,
    "connections": [
      {
        "connection_id": "uuid",
        "connected_user_id": "uuid",
        "connection_status": "accepted",
        "connection_created_date": "2025-01-20T10:00:00Z",
        "is_requester": true
      }
    ]
  }
  ```

#### **GET /api/check-connection**
- **Purpose**: Check if two users are connected
- **Query Parameters**: `user1`, `user2`
- **Response**:
  ```json
  {
    "success": true,
    "connected": true
  }
  ```

#### **POST /api/respond-connection-request**
- **Purpose**: Accept or decline connection request
- **Request Body**:
  ```json
  {
    "connection_id": "connection_uuid",
    "response": "accepted"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Connection request accepted"
  }
  ```

#### **POST /api/validate-group-connections**
- **Purpose**: Validate connections for group meeting
- **Request Body**:
  ```json
  {
    "requester_id": "user_uuid",
    "recipient_ids": ["user1_uuid", "user2_uuid"]
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "valid": true,
    "connections": [
      {
        "user_id": "user1_uuid",
        "is_connected": true
      }
    ]
  }
  ```

### 3.4 Email APIs

#### **POST /api/send-email**
- **Purpose**: Send general email
- **Request Body**:
  ```json
  {
    "to": "recipient@example.com",
    "subject": "Email Subject",
    "html": "<html>Email content</html>",
    "text": "Plain text content"
  }
  ```
- **Response**:
  ```json
  {
    "success": true
  }
  ```

### 3.5 Supabase Entity APIs

The project uses Supabase's auto-generated REST APIs for core entities:

#### **Meeting Requests**
- `GET /api/entities/MeetingRequest` - List meeting requests
- `POST /api/entities/MeetingRequest` - Create meeting request
- `PUT /api/entities/MeetingRequest/{id}` - Update meeting request
- `DELETE /api/entities/MeetingRequest/{id}` - Delete meeting request

#### **Chat Messages**
- `GET /api/entities/ChatMessage` - List chat messages
- `POST /api/entities/ChatMessage` - Send message
- `PUT /api/entities/ChatMessage/{id}` - Update message (mark as read)

#### **Venue Bookings**
- `GET /api/entities/VenueBooking` - List bookings
- `POST /api/entities/VenueBooking` - Create booking
- `PUT /api/entities/VenueBooking/{id}` - Update booking
- `DELETE /api/entities/VenueBooking/{id}` - Cancel booking

#### **Venue Rooms**
- `GET /api/entities/VenueRoom` - List rooms
- `POST /api/entities/VenueRoom` - Create room (admin)
- `PUT /api/entities/VenueRoom/{id}` - Update room (admin)
- `DELETE /api/entities/VenueRoom/{id}` - Delete room (admin)

#### **Notifications**
- `GET /api/entities/Notification` - List notifications
- `PUT /api/entities/Notification/{id}` - Mark as read
- `DELETE /api/entities/Notification/{id}` - Delete notification

---

## 4. Frontend Architecture

### 4.1 Mobile App Integration

#### **Cross-Platform Mobile App**
- **React Native**: For iOS and Android development
- **Flutter**: Alternative cross-platform framework
- **API Integration**: Same backend APIs used by web frontend
- **Authentication**: Supabase Auth with mobile SDKs
- **Real-time Features**: WebSocket connections for chat and notifications
- **Offline Support**: Local data caching for core functionalities

#### **Mobile App Features**
- **Native Navigation**: Tab-based navigation for main sections
- **Push Notifications**: Real-time notifications via Firebase/Expo
- **Camera Integration**: Profile photo capture and upload
- **File Sharing**: Document sharing in meetings
- **Location Services**: Venue location and directions
- **Biometric Authentication**: Touch ID / Face ID support

### 4.2 Page Structure

#### **Authentication Pages**
- **Login.jsx**: User login with email/password
- **ForgotPassword.jsx**: Password reset request
- **ResetPassword.jsx**: Password reset with OTP
- **VerifyCode.jsx**: Passcode verification for new users
- **VerifyOTP.jsx**: OTP verification for password reset

#### **Main Application Pages**
- **Dashboard.jsx**: Main dashboard with overview
- **Profile.jsx**: User profile management
- **Delegates.jsx**: Delegate directory and connections
- **Meetings.jsx**: Meeting management
- **Chat.jsx**: Chat interface for meeting participants
- **Rooms.jsx**: Room management and booking
- **Venues.jsx**: Venue schedule view
- **Schedule.jsx**: Personal schedule
- **Admin.jsx**: Admin panel for user management

#### **Component Pages**
- **Layout.jsx**: Main application layout with sidebar
- **index.jsx**: Route configuration
- **ProtectedRoute.jsx**: Authentication guard

### 4.2 Component Structure

#### **Authentication Components**
- **PasswordResetModal.jsx**: Modal for password reset

#### **Meeting Components**
- **BookingDialog.jsx**: Room booking dialog
- **RequestMeetingDialog.jsx**: Meeting request dialog

#### **Notification Components**
- **NotificationBell.jsx**: Notification bell with unread count

#### **Venue Components**
- **PrivateBookingDialog.jsx**: Private room booking
- **RoomFormDialog.jsx**: Room creation/editing
- **ScheduleView.jsx**: Room schedule display

#### **Upload Components**
- **FileUploadZone.jsx**: File upload interface

#### **UI Components**
Complete set of Radix UI components including:
- **Button, Input, Dialog, Card, Badge, Avatar**
- **Form, Select, Textarea, Checkbox, Radio**
- **Table, Tabs, Accordion, Alert, Toast**
- **Calendar, DatePicker, Progress, Skeleton**
- **Navigation, Sidebar, Breadcrumb, Pagination**

### 4.3 State Management

#### **Authentication State**
- User session management via Supabase Auth
- Role-based access control
- Password reset state tracking

#### **Application State**
- Meeting requests and responses
- Chat message state and polling
- Notification state and real-time updates
- Connection request management
- Venue booking state

#### **UI State**
- Modal and dialog states
- Form validation states
- Loading and error states
- Navigation state

---

## 5. Authentication System

### 5.1 User Registration Flow

#### **Passcode Registration (New Users)**
1. User visits login page
2. Clicks "Check" button for new users
3. Redirected to `/verify-code`
4. Enters email and passcode (UN-xxxx format)
5. System verifies passcode and creates account
6. Temporary password generated and sent via email
7. User redirected to login with credentials

#### **Admin User Creation**
1. Admin accesses Admin panel
2. Clicks "Create User" button
3. Enters email and selects role
4. System creates user account with temporary password
5. Welcome email sent with credentials
6. New user must reset password on first login

### 5.2 Password Reset Flow

#### **OTP-Based Password Reset**
1. User clicks "Forgot Password" on login page
2. Enters email address
3. System generates 6-digit OTP
4. OTP sent via email (expires in 60 minutes)
5. User enters OTP on reset page
6. System verifies OTP and allows password update
7. User redirected to login with new password

### 5.3 Authentication Features

#### **Password Reset Flag**
- New users have `is_password_reset: true`
- Forces password reset on first login
- Prevents access until password is changed

#### **Role-Based Access**
- **User Role**: Standard delegate access
- **Admin Role**: Full system access including user management

#### **Session Management**
- Supabase Auth handles session tokens
- Automatic token refresh
- Secure logout functionality

---

## 6. Core Functionalities

### 6.1 Connection System

#### **Connection Request Flow**
1. User browses delegate directory
2. Clicks "Connect" on another delegate's profile
3. Optionally adds connection message
4. Connection request sent to recipient
5. Recipient receives notification
6. Recipient can accept or decline
7. Accepted connections enable meeting requests

#### **Connection Management**
- View all connections (sent and received)
- Filter by connection status
- Remove connections
- Connection history

### 6.2 Meeting System

#### **Single Delegate Meetings**
1. User selects connected delegate
2. Creates meeting request with topic and duration
3. Adds personal message
4. Sends request to delegate
5. Recipient receives notification
6. Recipient can accept, decline, or request changes
7. Accepted meetings enable venue booking

#### **Group Meetings**
1. User selects multiple connected delegates
2. Creates group meeting request
3. All recipients must be connected to requester
4. System validates connections before sending
5. All recipients receive notifications
6. Meeting proceeds when accepted

#### **Meeting Management**
- View all meeting requests (sent and received)
- Filter by meeting status
- Update meeting details
- Cancel meetings
- Meeting history and analytics

### 6.3 Chat System

#### **Meeting-Based Chat**
- Chat only available for accepted meetings
- Secure messaging between meeting participants
- Real-time message delivery
- Message read status tracking
- Message history and search

#### **Chat Features**
- Send text messages
- Mark messages as read
- Message timestamps
- Participant identification
- Message threading by meeting

### 6.4 Venue Management

#### **Room Booking**
1. User selects available room
2. Chooses date and time slot
3. Links booking to meeting request
4. System checks for conflicts
5. Booking confirmed and room reserved
6. Participants receive booking notifications

#### **Private Bookings**
- Admin can create private bookings
- No meeting request required
- Direct room reservation
- Custom booking topics

#### **Room Management**
- Create and edit rooms
- Set room capacity and equipment
- Activate/deactivate rooms
- Room availability calendar
- Booking conflict detection

### 6.5 Notification System

#### **Notification Types**
- **New Meeting Request**: When receiving meeting request
- **Request Accepted**: When meeting request is accepted
- **Request Declined**: When meeting request is declined
- **New Message**: When receiving chat message
- **Booking Confirmed**: When venue booking is confirmed
- **Booking Cancelled**: When venue booking is cancelled

#### **Notification Management**
- Real-time notification delivery
- Mark notifications as read
- Notification history
- Notification preferences
- Email notifications for important events

---

## 7. Email System

### 7.1 Email Configuration

#### **Primary Email Service**
- **Resend API**: Primary email service for reliable delivery
- **High Deliverability**: Professional email delivery with 99.9% uptime
- **Template Management**: Built-in email template system
- **Analytics**: Email open rates, click tracking, and delivery reports
- **Webhook Support**: Real-time delivery status updates

#### **Fallback Providers**
- **Gmail**: Fallback email provider via Nodemailer
- **Outlook/Hotmail**: Alternative provider via Nodemailer
- **Custom SMTP**: For enterprise email servers

#### **Email Templates**
- **Welcome Email**: New user registration
- **Password Reset**: OTP-based password reset
- **Meeting Notifications**: Meeting request updates
- **Booking Confirmations**: Venue booking confirmations
- **Connection Requests**: Delegate connection notifications

#### **Resend API Integration**
- **API Key Authentication**: Secure API key-based authentication
- **Template Variables**: Dynamic content insertion
- **Batch Sending**: Efficient bulk email delivery
- **Rate Limiting**: Built-in rate limiting and throttling
- **Domain Verification**: Custom domain setup for professional emails

### 7.2 Email Features

#### **Dynamic Content**
- Personalized email content
- Dynamic logo URLs for branding
- Responsive HTML templates
- Plain text fallbacks

#### **Email Security**
- **Resend API**: HTTPS encryption for all API calls
- **API Key Security**: Environment-based API key management
- **Domain Authentication**: SPF, DKIM, and DMARC setup
- **Rate Limiting**: Built-in protection against abuse
- **Fallback Security**: SSL/TLS encryption for SMTP fallback

### 7.3 Email Templates

#### **Welcome Email Template**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="https://your-app.vercel.app/main_logo.svg" alt="Unido Logo" style="height: 60px; width: auto; margin-bottom: 15px;" />
    <h1 style="color: #0064b0; margin: 0;">Welcome to Unido</h1>
    <p style="color: #666; margin: 10px 0 0 0;">Your account has been created successfully</p>
  </div>
  
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h2 style="color: #333; margin: 0 0 15px 0;">Your Login Credentials</h2>
    <p style="margin: 10px 0;"><strong>Email:</strong> {email}</p>
    <p style="margin: 10px 0;"><strong>Temporary Password:</strong> {tempPassword}</p>
    <p style="margin: 10px 0; color: #666; font-size: 14px;">Please change your password on first login</p>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="https://your-app.vercel.app/login" 
       style="display: inline-block; background: #0064b0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
      Login to Your Account
    </a>
  </div>
</div>
```

---

## 8. Deployment Configuration

### 8.1 Vercel Configuration

#### **vercel.json**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "functions": {
    "api/create-user.js": {
      "maxDuration": 30
    },
    "api/send-email.js": {
      "maxDuration": 30
    },
    "api/send-password-reset-otp.js": {
      "maxDuration": 30
    }
  }
}
```

#### **.vercelignore**
```
server/
node_modules/
.env
.env.local
*.log
```

### 8.2 Build Configuration

#### **vite.config.js**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
        }
      }
    }
  }
})
```

### 8.3 Package.json Scripts
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "dev:frontend": "vite",
    "dev:backend": "node server.js",
    "build": "vite build",
    "preview": "vite preview",
    "vercel-build": "vite build"
  }
}
```

---

## 9. Environment Variables

### 9.1 Frontend Environment Variables
```bash
# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_SERVICE_ROLE_KEY=your-service-role-key
```

### 9.2 Backend Environment Variables
```bash
# Supabase Configuration
SUPABASE_SERVICE_KEY=your-service-role-key

# Email Configuration (Resend API - Primary)
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=noreply@yourdomain.com

# Email Configuration (Fallback - SMTP)
EMAIL_PROVIDER=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# Development Server
PORT=3000
```

### 9.3 Vercel Environment Variables
```bash
# Supabase
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY

# Email (Resend API - Primary)
RESEND_API_KEY
EMAIL_FROM

# Email (Fallback - SMTP)
EMAIL_PROVIDER
EMAIL_USER
EMAIL_PASSWORD
EMAIL_HOST
EMAIL_PORT
```

---

## 10. Development Setup

### 10.1 Prerequisites
- Node.js 18+ 
- npm or pnpm
- Git
- Supabase account
- Resend account with API key
- Gmail account with App Password (fallback)
- React Native / Flutter development environment (for mobile app)

### 10.2 Installation Steps

#### **1. Clone Repository**
```bash
git clone <repository-url>
cd diplomat-connect
```

#### **2. Install Dependencies**
```bash
npm install
# or
pnpm install
```

#### **3. Environment Setup**
```bash
# Copy environment template
cp env.template .env

# Edit .env with your configuration
# Add Supabase credentials
# Add Resend API key for email
# Add fallback SMTP configuration
```

#### **4. Database Setup**
```bash
# Run database migrations in Supabase SQL Editor
# 1. diplomat-connect-supabase-schema.sql
# 2. passcode-migration.sql
# 3. password-reset-otp-migration.sql
# 4. connections-migration.sql
```

#### **5. Generate Passcodes**
```sql
-- Run in Supabase SQL Editor
SELECT generate_passcodes(3000);
```

#### **6. Start Development**
```bash
# Start both frontend and backend
npm run dev

# Or start individually
npm run dev:frontend  # Frontend on http://localhost:5173
npm run dev:backend   # Backend on http://localhost:3000
```

#### **7. Mobile App Development**
```bash
# For React Native
npx react-native init DiplomatConnectMobile
cd DiplomatConnectMobile
npm install @supabase/supabase-js

# For Flutter
flutter create diplomat_connect_mobile
cd diplomat_connect_mobile
flutter pub add supabase_flutter
```

### 10.3 Development Features

#### **Hot Reload**
- Frontend: Vite HMR for instant updates
- Backend: Nodemon for automatic restarts

#### **Environment Detection**
- Automatic API URL detection
- Development vs Production configurations
- Environment-specific email settings

#### **Debugging**
- Console logging for API calls
- Network request inspection
- Database query monitoring
- Email delivery testing (Resend dashboard)
- Mobile app debugging with React Native Debugger / Flutter Inspector

---

## 📊 Project Statistics

### **Database Tables**: 9
- users, meeting_requests, chat_messages
- venue_rooms, venue_bookings, notifications
- passcodes, password_reset_otps, delegate_connections

### **API Endpoints**: 15+
- Authentication: 3 endpoints
- User Management: 1 endpoint
- Connections: 4 endpoints
- Email: 1 endpoint
- Supabase Entities: 6+ endpoints

### **Frontend Pages**: 17
- Authentication: 5 pages
- Main Application: 8 pages
- Component Pages: 4 pages

### **Components**: 50+
- UI Components: 40+ Radix UI components
- Custom Components: 10+ application-specific components

### **Features**: 25+
- User Registration & Authentication
- Passcode System
- Connection Management
- Meeting Coordination
- Chat System
- Venue Management
- Notification System
- Admin Panel
- Email Integration (Resend API)
- Real-time Updates
- Mobile App (Cross-platform)
- Push Notifications
- Offline Support
- Biometric Authentication
- Camera Integration

---

## 🎯 Key Design Principles

1. **Security First**: All data protected with proper authentication and authorization
2. **User Experience**: Intuitive interface with clear navigation and feedback
3. **Scalability**: Designed to handle large conferences with thousands of delegates
4. **Real-time**: Live updates for messages, notifications, and status changes
5. **Cross-Platform**: Seamless experience across web and mobile platforms
6. **Accessibility**: WCAG compliant with proper ARIA labels and keyboard navigation
7. **Performance**: Optimized for fast loading and smooth interactions
8. **Maintainability**: Clean code structure with proper separation of concerns
9. **Email Reliability**: Resend API for professional email delivery
10. **Mobile-First**: Native mobile app with full feature parity

---

**End of Complete Project Documentation**

This document provides comprehensive coverage of the Diplomat Connect platform, including database schema, API endpoints, frontend architecture, authentication system, core functionalities, email system, deployment configuration, and development setup.
