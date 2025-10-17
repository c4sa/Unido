# UNIConnect - Complete Database Schema Documentation

---

## 📋 Table of Contents

1. [Schema Overview](https://app.base44.com/apps/68c805b798648b889071442d/editor/preview/Meetings#1-schema-overview)
2. [Entity Relationship Diagram](https://app.base44.com/apps/68c805b798648b889071442d/editor/preview/Meetings#2-entity-relationship-diagram)
3. [Entity Definitions](https://app.base44.com/apps/68c805b798648b889071442d/editor/preview/Meetings#3-entity-definitions)
4. [Built-in System Fields](https://app.base44.com/apps/68c805b798648b889071442d/editor/preview/Meetings#4-built-in-system-fields)
5. [Row-Level Security Policies](https://app.base44.com/apps/68c805b798648b889071442d/editor/preview/Meetings#5-row-level-security-policies)
6. [Entity Relationships](https://app.base44.com/apps/68c805b798648b889071442d/editor/preview/Meetings#6-entity-relationships)
7. [Data Validation Rules](https://app.base44.com/apps/68c805b798648b889071442d/editor/preview/Meetings#7-data-validation-rules)
8. [Entity Lifecycle &amp; State Transitions](https://app.base44.com/apps/68c805b798648b889071442d/editor/preview/Meetings#8-entity-lifecycle--state-transitions)
9. [Indexes &amp; Performance](https://app.base44.com/apps/68c805b798648b889071442d/editor/preview/Meetings#9-indexes--performance)
10. [API Endpoints](https://app.base44.com/apps/68c805b798648b889071442d/editor/preview/Meetings#10-api-endpoints)
11. [Sample Data Structures](https://app.base44.com/apps/68c805b798648b889071442d/editor/preview/Meetings#11-sample-data-structures)
12. [Schema Migration Guide](https://app.base44.com/apps/68c805b798648b889071442d/editor/preview/Meetings#12-schema-migration-guide)

---

## 1. Schema Overview

### 1.1 Database Platform

* **Platform** : Base44 (Built on PostgreSQL/Supabase)
* **Version** : PostgreSQL 15+
* **Character Encoding** : UTF-8
* **Timezone** : UTC (all timestamps)
* **JSON Support** : Native JSONB for flexible fields

### 1.2 Total Entities

The UNIConnect platform uses **6 custom entities** + 1 built-in entity:

| Entity Name              | Type     | Records Estimate | Primary Purpose                         |
| ------------------------ | -------- | ---------------- | --------------------------------------- |
| **User**           | Built-in | 50-10,000        | User accounts, profiles, authentication |
| **MeetingRequest** | Custom   | 100-50,000       | Meeting proposals between users         |
| **ChatMessage**    | Custom   | 500-200,000      | 1-on-1 secure messaging                 |
| **VenueBooking**   | Custom   | 50-20,000        | Room reservations                       |
| **VenueRoom**      | Custom   | 10-500           | Available meeting rooms                 |
| **Notification**   | Custom   | 1,000-500,000    | User notifications                      |

### 1.3 Schema Characteristics

* **ACID Compliant** : Full transactional support
* **RESTful API** : Auto-generated from schema
* **Real-time Capable** : Support for live updates (polling)
* **Row-Level Security** : Every entity protected by RLS policies
* **Audit Trail** : Built-in created_date, updated_date, created_by

---

## 2. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     ENTITY RELATIONSHIPS                     │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│       User           │
│ (Built-in Entity)    │
│──────────────────────│
│ • id (PK)            │
│ • email              │
│ • full_name          │
│ • role               │
│ • profile_completed  │
│ • consent_given      │
│ • topical_interests  │
│ • geographical_...   │
└──────────────────────┘
     │     │     │
     │     │     │ (One-to-Many)
     │     │     └─────────────────────────┐
     │     │                               │
     │     │ (One-to-Many)                 │
     │     └───────────────┐               │
     │                     │               │
     │ (One-to-Many)       │               │
     ▼                     ▼               ▼
┌──────────────┐  ┌─────────────┐  ┌──────────────┐
│MeetingRequest│  │ ChatMessage │  │ VenueBooking │
│──────────────│  │─────────────│  │──────────────│
│• id (PK)     │  │• id (PK)    │  │• id (PK)     │
│• requester_id│──┤• sender_id  │  │• booked_by   │
│  (FK→User)   │  │  (FK→User)  │  │  (FK→User)   │
│• recipient...│  │• recipient..│  │• room_id     │
│  (FK→User[]) │  │  (FK→User)  │  │  (FK→Room)   │
│• meeting_code│  │• meeting_...│──┤• meeting_... │
│• status      │  │  (FK→Mtg)   │  │  (FK→Mtg)    │
│• proposed_...│  │• message    │  │• start_time  │
│• venue_boo...│──┼─────────────┘  │• end_time    │
│  (FK→Booking)│  │                │• status      │
└──────────────┘  │                └──────────────┘
     │            │                      │
     │            │                      │
     │            │        ┌─────────────┘
     │            │        │ (Many-to-One)
     │            │        ▼
     │            │  ┌──────────────┐
     │            │  │  VenueRoom   │
     │            │  │──────────────│
     │            │  │• id (PK)     │
     │            │  │• name        │
     │            │  │• type        │
     │            │  │• capacity    │
     │            │  │• floor       │
     │            │  │• equipment[] │
     │            │  │• is_active   │
     │            │  └──────────────┘
     │            │
     │            └──────────┐
     │                       │ (One-to-Many)
     │                       ▼
     │                 ┌──────────────┐
     │                 │ Notification │
     │                 │──────────────│
     │                 │• id (PK)     │
     │                 │• user_id     │
     │                 │  (FK→User)   │
     │                 │• type        │
     │                 │• title       │
     │                 │• body        │
     │                 │• link        │
     │                 │• is_read     │
     │                 │• related_... │
     └─────────────────│  (FK→Any)    │
                       └──────────────┘

RELATIONSHIP TYPES:
─────────── One-to-Many
═══════════ Many-to-Many (through junction)

KEY:
PK = Primary Key
FK = Foreign Key
[] = Array/Collection field
```


---

## 3. Entity Definitions

### 3.1 User Entity (Built-in)

```json
{
  "name": "User",
  "type": "object",
  "description": "Core user entity for authentication and profile management",
  "table_name": "users",
  "properties": {
    "consent_given": {
      "type": "boolean",
      "default": false,
      "description": "Whether user has given consent for data processing (GDPR compliance)",
      "ui_label": "Data Processing Consent",
      "required_for_platform_access": true
    },
    "profile_completed": {
      "type": "boolean",
      "default": false,
      "description": "Whether delegate has completed their profile setup",
      "computed": true,
      "ui_label": "Profile Status"
    },
    "is_profile_hidden": {
      "type": "boolean",
      "default": false,
      "description": "Whether user wants to hide their profile from other users in directory",
      "ui_label": "Hide from Directory",
      "privacy_setting": true
    },
    "representation_type": {
      "type": "string",
      "enum": [
        "government",
        "ngo", 
        "private_sector",
        "academic",
        "international_org",
        "media"
      ],
      "description": "Type of organization or representation",
      "ui_label": "Representation Type",
      "required": true,
      "indexed": true
    },
    "country": {
      "type": "string",
      "description": "Country or entity represented",
      "ui_label": "Country/Entity",
      "required": true,
      "max_length": 100,
      "indexed": true
    },
    "job_title": {
      "type": "string",
      "description": "Current job title or position",
      "ui_label": "Job Title",
      "required": true,
      "max_length": 200
    },
    "organization": {
      "type": "string",
      "description": "Name of organization",
      "ui_label": "Organization",
      "required": true,
      "max_length": 200,
      "indexed": true
    },
    "industry_sector": {
      "type": "string",
      "description": "Industry or sector focus",
      "ui_label": "Industry Sector",
      "required": true,
      "max_length": 100
    },
    "biography": {
      "type": "string",
      "description": "Professional biography and background",
      "ui_label": "Biography",
      "required": true,
      "min_length": 50,
      "max_length": 2000,
      "ui_component": "textarea"
    },
    "linkedin_profile": {
      "type": "string",
      "description": "LinkedIn profile URL",
      "ui_label": "LinkedIn Profile",
      "required": false,
      "format": "uri",
      "pattern": "^https?://.*linkedin\\.com/.*$",
      "validation_message": "Must be a valid LinkedIn URL"
    },
    "topical_interests": {
      "type": "array",
      "description": "Areas of topical interest with priority levels",
      "ui_label": "Topical Interests",
      "required": true,
      "min_items": 1,
      "max_items": 20,
      "items": {
        "type": "object",
        "properties": {
          "topic": {
            "type": "string",
            "description": "Interest topic name",
            "max_length": 100
          },
          "priority": {
            "type": "string",
            "enum": ["high", "medium", "low"],
            "default": "medium",
            "description": "Priority level of this interest"
          }
        },
        "required": ["topic", "priority"]
      },
      "default": []
    },
    "geographical_interests": {
      "type": "array",
      "description": "Geographical areas of interest with priority levels",
      "ui_label": "Geographical Interests",
      "required": true,
      "min_items": 1,
      "max_items": 15,
      "items": {
        "type": "object",
        "properties": {
          "region": {
            "type": "string",
            "description": "Geographic region name",
            "max_length": 100
          },
          "priority": {
            "type": "string",
            "enum": ["high", "medium", "low"],
            "default": "medium",
            "description": "Priority level of this region"
          }
        },
        "required": ["region", "priority"]
      },
      "default": []
    },
    "preferred_meeting_duration": {
      "type": "number",
      "description": "Preferred meeting duration in minutes",
      "ui_label": "Preferred Meeting Duration",
      "default": 45,
      "minimum": 15,
      "maximum": 180,
      "enum": [30, 45, 60, 90, 120],
      "ui_component": "select"
    },
    "notification_preferences": {
      "type": "object",
      "description": "User's notification settings",
      "ui_label": "Notification Preferences",
      "properties": {
        "new_meeting_request": {
          "type": "boolean",
          "default": true,
          "description": "Notify when receiving new meeting request"
        },
        "request_status_update": {
          "type": "boolean",
          "default": true,
          "description": "Notify when meeting request status changes"
        },
        "new_message": {
          "type": "boolean",
          "default": true,
          "description": "Notify when receiving new chat message"
        },
        "booking_confirmed": {
          "type": "boolean",
          "default": true,
          "description": "Notify when venue booking is confirmed"
        }
      },
      "default": {
        "new_meeting_request": true,
        "request_status_update": true,
        "new_message": true,
        "booking_confirmed": true
      }
    }
  },
  "required": [],
  "built_in_fields": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique user identifier",
      "primary_key": true,
      "generated": true
    },
    "email": {
      "type": "string",
      "format": "email",
      "description": "User email address (from OAuth)",
      "unique": true,
      "immutable": true,
      "indexed": true
    },
    "full_name": {
      "type": "string",
      "description": "User's full name (from OAuth)",
      "max_length": 200
    },
    "role": {
      "type": "string",
      "enum": ["user", "admin"],
      "default": "user",
      "description": "User role in the system",
      "admin_only": true
    },
    "created_date": {
      "type": "string",
      "format": "date-time",
      "description": "Account creation timestamp",
      "generated": true,
      "immutable": true
    },
    "updated_date": {
      "type": "string",
      "format": "date-time",
      "description": "Last profile update timestamp",
      "generated": true,
      "auto_update": true
    }
  },
  "indexes": [
    {
      "name": "idx_user_email",
      "columns": ["email"],
      "unique": true
    },
    {
      "name": "idx_user_role",
      "columns": ["role"]
    },
    {
      "name": "idx_user_organization",
      "columns": ["organization"]
    },
    {
      "name": "idx_user_country",
      "columns": ["country"]
    },
    {
      "name": "idx_user_representation_type",
      "columns": ["representation_type"]
    },
    {
      "name": "idx_user_profile_completed",
      "columns": ["profile_completed"]
    }
  ],
  "rls": {
    "read": {
      "$or": [
        {"id": "{{user.id}}"},
        {"profile_completed": true, "consent_given": true, "is_profile_hidden": false},
        {"user_condition": {"role": "admin"}}
      ]
    },
    "write": {
      "$or": [
        {"id": "{{user.id}}"},
        {"user_condition": {"role": "admin"}}
      ]
    }
  }
}
```

**Profile Completion Logic:**

```javascript
profile_completed = (
  consent_given === true &&
  representation_type !== null &&
  country !== null &&
  job_title !== null &&
  organization !== null &&
  industry_sector !== null &&
  biography !== null &&
  biography.length >= 50 &&
  topical_interests.length >= 1 &&
  geographical_interests.length >= 1
)
```

---

### 3.2 MeetingRequest Entity

```json
{
  "name": "MeetingRequest",
  "type": "object",
  "description": "Meeting proposals and coordination between delegates",
  "table_name": "meeting_requests",
  "properties": {
    "requester_id": {
      "type": "string",
      "format": "uuid",
      "description": "ID of the delegate making the request",
      "ui_label": "Requester",
      "foreign_key": {
        "entity": "User",
        "field": "id",
        "on_delete": "CASCADE"
      },
      "required": true,
      "indexed": true
    },
    "recipient_ids": {
      "type": "array",
      "description": "IDs of the delegates receiving the request",
      "ui_label": "Recipients",
      "items": {
        "type": "string",
        "format": "uuid"
      },
      "foreign_key": {
        "entity": "User",
        "field": "id",
        "on_delete": "CASCADE"
      },
      "required": true,
      "min_items": 1,
      "max_items": 20,
      "indexed": true
    },
    "meeting_type": {
      "type": "string",
      "enum": ["single", "multi"],
      "default": "single",
      "description": "Type of meeting (1-on-1 or group)",
      "ui_label": "Meeting Type",
      "indexed": true,
      "validation": {
        "rule": "If meeting_type === 'single', recipient_ids.length must be 1"
      }
    },
    "meeting_code": {
      "type": "string",
      "description": "Unique 8-character meeting code for identification",
      "ui_label": "Meeting Code",
      "pattern": "^[A-Z0-9]{8}$",
      "min_length": 8,
      "max_length": 8,
      "unique": true,
      "indexed": true,
      "generated": true,
      "generation_strategy": "random_alphanumeric_uppercase"
    },
    "status": {
      "type": "string",
      "enum": ["pending", "accepted", "declined", "cancelled"],
      "default": "pending",
      "description": "Current status of the meeting request",
      "ui_label": "Status",
      "indexed": true,
      "state_machine": {
        "initial": "pending",
        "transitions": {
          "pending": ["accepted", "declined", "cancelled"],
          "accepted": ["cancelled"],
          "declined": [],
          "cancelled": []
        }
      }
    },
    "personal_message": {
      "type": "string",
      "description": "Personal message from requester to recipients",
      "ui_label": "Personal Message",
      "max_length": 1000,
      "ui_component": "textarea"
    },
    "proposed_topic": {
      "type": "string",
      "description": "Proposed meeting topic or agenda",
      "ui_label": "Meeting Topic",
      "required": true,
      "min_length": 5,
      "max_length": 200
    },
    "proposed_duration": {
      "type": "number",
      "description": "Proposed duration in minutes",
      "ui_label": "Duration (minutes)",
      "default": 45,
      "enum": [30, 45, 60, 90, 120],
      "minimum": 15,
      "maximum": 180,
      "ui_component": "select"
    },
    "scheduled_time": {
      "type": "string",
      "format": "date-time",
      "description": "When the meeting is scheduled (optional, for reference)",
      "ui_label": "Scheduled Time",
      "ui_component": "datetime-picker"
    },
    "venue_booking_id": {
      "type": "string",
      "format": "uuid",
      "description": "ID of associated venue booking",
      "ui_label": "Venue Booking",
      "foreign_key": {
        "entity": "VenueBooking",
        "field": "id",
        "on_delete": "SET_NULL"
      },
      "indexed": true
    }
  },
  "required": ["requester_id", "recipient_ids", "proposed_topic"],
  "indexes": [
    {
      "name": "idx_meeting_requester",
      "columns": ["requester_id"]
    },
    {
      "name": "idx_meeting_recipients",
      "columns": ["recipient_ids"],
      "type": "gin"
    },
    {
      "name": "idx_meeting_status",
      "columns": ["status"]
    },
    {
      "name": "idx_meeting_code",
      "columns": ["meeting_code"],
      "unique": true
    },
    {
      "name": "idx_meeting_created",
      "columns": ["created_date"]
    },
    {
      "name": "idx_meeting_type",
      "columns": ["meeting_type"]
    }
  ],
  "rls": {
    "read": {
      "$or": [
        {"requester_id": "{{user.id}}"},
        {"recipient_ids": {"$in": ["{{user.id}}"]}},
        {"user_condition": {"role": "admin"}}
      ]
    },
    "write": {
      "$or": [
        {"requester_id": "{{user.id}}"},
        {"recipient_ids": {"$in": ["{{user.id}}"]}},
        {"user_condition": {"role": "admin"}}
      ]
    }
  },
  "triggers": [
    {
      "name": "on_status_change",
      "event": "UPDATE",
      "condition": "OLD.status != NEW.status",
      "action": "Create notification for affected users"
    },
    {
      "name": "on_create",
      "event": "INSERT",
      "action": "Create notification for recipients"
    }
  ]
}
```

---

### 3.3 ChatMessage Entity

```json
{
  "name": "ChatMessage",
  "type": "object",
  "description": "Secure 1-on-1 messaging between meeting participants",
  "table_name": "chat_messages",
  "properties": {
    "meeting_request_id": {
      "type": "string",
      "format": "uuid",
      "description": "ID of the associated meeting request",
      "ui_label": "Meeting",
      "foreign_key": {
        "entity": "MeetingRequest",
        "field": "id",
        "on_delete": "CASCADE"
      },
      "required": true,
      "indexed": true
    },
    "sender_id": {
      "type": "string",
      "format": "uuid",
      "description": "ID of the message sender",
      "ui_label": "Sender",
      "foreign_key": {
        "entity": "User",
        "field": "id",
        "on_delete": "CASCADE"
      },
      "required": true,
      "indexed": true
    },
    "recipient_id": {
      "type": "string",
      "format": "uuid",
      "description": "ID of the message recipient",
      "ui_label": "Recipient",
      "foreign_key": {
        "entity": "User",
        "field": "id",
        "on_delete": "CASCADE"
      },
      "required": true,
      "indexed": true
    },
    "message": {
      "type": "string",
      "description": "Message content",
      "ui_label": "Message",
      "required": true,
      "min_length": 1,
      "max_length": 5000,
      "ui_component": "textarea"
    },
    "read_status": {
      "type": "boolean",
      "default": false,
      "description": "Whether the message has been read by recipient",
      "ui_label": "Read",
      "indexed": true
    },
    "message_type": {
      "type": "string",
      "enum": ["text", "system"],
      "default": "text",
      "description": "Type of message (user text or system notification)",
      "ui_label": "Type",
      "indexed": true
    }
  },
  "required": ["meeting_request_id", "sender_id", "recipient_id", "message"],
  "indexes": [
    {
      "name": "idx_message_meeting",
      "columns": ["meeting_request_id", "created_date"]
    },
    {
      "name": "idx_message_sender",
      "columns": ["sender_id"]
    },
    {
      "name": "idx_message_recipient",
      "columns": ["recipient_id", "read_status"]
    },
    {
      "name": "idx_message_created",
      "columns": ["created_date"]
    }
  ],
  "rls": {
    "read": {
      "$or": [
        {"sender_id": "{{user.id}}"},
        {"recipient_id": "{{user.id}}"},
        {"user_condition": {"role": "admin"}}
      ]
    },
    "write": {
      "$or": [
        {"sender_id": "{{user.id}}"},
        {"recipient_id": "{{user.id}}"},
        {"user_condition": {"role": "admin"}}
      ]
    }
  },
  "validation_rules": [
    {
      "name": "sender_not_recipient",
      "rule": "sender_id !== recipient_id",
      "error_message": "Cannot send message to yourself"
    },
    {
      "name": "participants_in_meeting",
      "rule": "sender_id and recipient_id must be participants of meeting_request_id",
      "error_message": "Both users must be participants in the meeting"
    }
  ],
  "triggers": [
    {
      "name": "on_create",
      "event": "INSERT",
      "action": "Create notification for recipient if preferences allow"
    },
    {
      "name": "on_read",
      "event": "UPDATE",
      "condition": "OLD.read_status = false AND NEW.read_status = true",
      "action": "Update unread count for recipient"
    }
  ]
}
```

---

### 3.4 VenueBooking Entity

```json
{
  "name": "VenueBooking",
  "type": "object",
  "description": "Room reservations for meetings and events",
  "table_name": "venue_bookings",
  "properties": {
    "room_id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique room identifier",
      "ui_label": "Room",
      "foreign_key": {
        "entity": "VenueRoom",
        "field": "id",
        "on_delete": "CASCADE"
      },
      "required": true,
      "indexed": true
    },
    "room_name": {
      "type": "string",
      "description": "Snapshot of room name at booking time",
      "ui_label": "Room Name",
      "required": true,
      "max_length": 200,
      "denormalized": true,
      "source": "VenueRoom.name"
    },
    "room_type": {
      "type": "string",
      "enum": ["small", "large"],
      "description": "Snapshot of room size category",
      "ui_label": "Room Type",
      "required": true,
      "denormalized": true,
      "source": "VenueRoom.type"
    },
    "capacity": {
      "type": "number",
      "description": "Snapshot of maximum room capacity",
      "ui_label": "Capacity",
      "required": true,
      "minimum": 1,
      "maximum": 1000,
      "denormalized": true,
      "source": "VenueRoom.capacity"
    },
    "floor_level": {
      "type": "number",
      "description": "Snapshot of floor level",
      "ui_label": "Floor",
      "denormalized": true,
      "source": "VenueRoom.floor"
    },
    "equipment": {
      "type": "array",
      "description": "Snapshot of available equipment",
      "ui_label": "Equipment",
      "items": {
        "type": "string"
      },
      "default": [],
      "denormalized": true,
      "source": "VenueRoom.equipment"
    },
    "booked_by": {
      "type": "string",
      "format": "uuid",
      "description": "ID of user who made the booking",
      "ui_label": "Booked By",
      "foreign_key": {
        "entity": "User",
        "field": "id",
        "on_delete": "CASCADE"
      },
      "required": true,
      "indexed": true
    },
    "booking_type": {
      "type": "string",
      "enum": ["meeting", "private"],
      "default": "meeting",
      "description": "Type of booking (linked to meeting or private admin booking)",
      "ui_label": "Booking Type",
      "indexed": true
    },
    "meeting_request_id": {
      "type": "string",
      "format": "uuid",
      "description": "Associated meeting request ID (if booking_type is 'meeting')",
      "ui_label": "Meeting Request",
      "foreign_key": {
        "entity": "MeetingRequest",
        "field": "id",
        "on_delete": "CASCADE"
      },
      "indexed": true,
      "conditional_required": {
        "when": {"booking_type": "meeting"},
        "required": true
      }
    },
    "private_meeting_topic": {
      "type": "string",
      "description": "Topic for private admin bookings (if booking_type is 'private')",
      "ui_label": "Meeting Topic",
      "max_length": 200,
      "conditional_required": {
        "when": {"booking_type": "private"},
        "required": true
      }
    },
    "start_time": {
      "type": "string",
      "format": "date-time",
      "description": "Booking start time",
      "ui_label": "Start Time",
      "required": true,
      "indexed": true,
      "ui_component": "datetime-picker"
    },
    "end_time": {
      "type": "string",
      "format": "date-time",
      "description": "Booking end time",
      "ui_label": "End Time",
      "required": true,
      "indexed": true,
      "ui_component": "datetime-picker",
      "validation": {
        "rule": "end_time > start_time",
        "error_message": "End time must be after start time"
      }
    },
    "status": {
      "type": "string",
      "enum": ["active", "completed", "cancelled"],
      "default": "active",
      "description": "Booking status",
      "ui_label": "Status",
      "indexed": true,
      "state_machine": {
        "initial": "active",
        "transitions": {
          "active": ["completed", "cancelled"],
          "completed": [],
          "cancelled": []
        }
      }
    }
  },
  "required": ["room_id", "room_name", "room_type", "capacity", "booked_by", "start_time", "end_time"],
  "indexes": [
    {
      "name": "idx_booking_room_time",
      "columns": ["room_id", "start_time", "end_time", "status"]
    },
    {
      "name": "idx_booking_booked_by",
      "columns": ["booked_by"]
    },
    {
      "name": "idx_booking_meeting",
      "columns": ["meeting_request_id"]
    },
    {
      "name": "idx_booking_status",
      "columns": ["status"]
    },
    {
      "name": "idx_booking_start_time",
      "columns": ["start_time"]
    },
    {
      "name": "idx_booking_type",
      "columns": ["booking_type"]
    }
  ],
  "rls": {
    "read": {
      "$or": [
        {"booked_by": "{{user.id}}"},
        {"user_condition": {"role": "admin"}}
      ]
    },
    "write": {
      "$or": [
        {"booked_by": "{{user.id}}"},
        {"user_condition": {"role": "admin"}}
      ]
    }
  },
  "validation_rules": [
    {
      "name": "no_overlap",
      "rule": "No existing booking for same room_id with overlapping time range and status='active'",
      "error_message": "This time slot is already booked"
    },
    {
      "name": "duration_limit",
      "rule": "(end_time - start_time) <= 4 hours",
      "error_message": "Booking duration cannot exceed 4 hours"
    },
    {
      "name": "future_booking",
      "rule": "start_time >= current_time - 15 minutes",
      "error_message": "Cannot book in the past (15 min grace period)"
    }
  ],
  "triggers": [
    {
      "name": "on_create",
      "event": "INSERT",
      "action": "Create notification for meeting participants if booking_type='meeting'"
    },
    {
      "name": "on_cancel",
      "event": "UPDATE",
      "condition": "NEW.status = 'cancelled' AND OLD.status != 'cancelled'",
      "action": "Create notification for participants and update meeting_request.venue_booking_id to NULL"
    },
    {
      "name": "auto_complete",
      "event": "SCHEDULED",
      "schedule": "Every 1 hour",
      "condition": "end_time < current_time AND status = 'active'",
      "action": "Update status to 'completed'"
    }
  ]
}
```

---

### 3.5 VenueRoom Entity

```json
{
  "name": "VenueRoom",
  "type": "object",
  "description": "Available meeting rooms and their specifications",
  "table_name": "venue_rooms",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the room",
      "ui_label": "Room Name",
      "required": true,
      "min_length": 2,
      "max_length": 200,
      "unique": true,
      "indexed": true,
      "examples": ["Board Room A", "Conference Hall 1", "Executive Suite"]
    },
    "type": {
      "type": "string",
      "enum": ["small", "large"],
      "default": "small",
      "description": "Room size category",
      "ui_label": "Room Type",
      "indexed": true,
      "enum_labels": {
        "small": "Small Meeting Room (2-10 people)",
        "large": "Large Conference Room (10+ people)"
      }
    },
    "capacity": {
      "type": "number",
      "description": "Maximum room capacity (number of people)",
      "ui_label": "Capacity",
      "required": true,
      "minimum": 1,
      "maximum": 1000,
      "indexed": true
    },
    "floor": {
      "type": "number",
      "description": "Floor level of the room",
      "ui_label": "Floor",
      "required": true,
      "minimum": -5,
      "maximum": 200,
      "indexed": true
    },
    "location": {
      "type": "string",
      "description": "Detailed location or wing of the room",
      "ui_label": "Location Details",
      "max_length": 500,
      "examples": ["North Wing, Near Elevator B", "Main Building, 2nd Floor, Room 201"]
    },
    "contact": {
      "type": "string",
      "description": "Contact person or department for the room",
      "ui_label": "Contact Information",
      "max_length": 200,
      "examples": ["Reception: ext. 1234", "Facilities Manager: facilities@example.com"]
    },
    "description": {
      "type": "string",
      "description": "Additional information about the room",
      "ui_label": "Description",
      "max_length": 1000,
      "ui_component": "textarea"
    },
    "equipment": {
      "type": "array",
      "description": "Available equipment in the room",
      "ui_label": "Equipment",
      "items": {
        "type": "string",
        "enum": [
          "Wifi",
          "Projector",
          "Screen",
          "Whiteboard",
          "Video Conferencing",
          "Monitor",
          "Coffee Machine",
          "Microphones",
          "Speaker System",
          "Recording Equipment"
        ]
      },
      "default": [],
      "unique_items": true,
      "max_items": 20,
      "ui_component": "multi-select"
    },
    "is_active": {
      "type": "boolean",
      "default": true,
      "description": "Whether the room is available for booking",
      "ui_label": "Active",
      "indexed": true
    }
  },
  "required": ["name", "capacity", "floor"],
  "indexes": [
    {
      "name": "idx_room_name",
      "columns": ["name"],
      "unique": true
    },
    {
      "name": "idx_room_active",
      "columns": ["is_active"]
    },
    {
      "name": "idx_room_type",
      "columns": ["type"]
    },
    {
      "name": "idx_room_capacity",
      "columns": ["capacity"]
    },
    {
      "name": "idx_room_floor",
      "columns": ["floor"]
    }
  ],
  "rls": {
    "read": {
      "$or": [
        true,
        {"user_condition": {"role": "admin"}}
      ]
    },
    "write": {
      "user_condition": {"role": "admin"}
    }
  },
  "triggers": [
    {
      "name": "on_deactivate",
      "event": "UPDATE",
      "condition": "NEW.is_active = false AND OLD.is_active = true",
      "action": "Prevent deactivation if active bookings exist, or notify admin"
    }
  ]
}
```

---

### 3.6 Notification Entity

```json
{
  "name": "Notification",
  "type": "object",
  "description": "User notifications for platform events",
  "table_name": "notifications",
  "properties": {
    "user_id": {
      "type": "string",
      "format": "uuid",
      "description": "ID of the user who receives the notification",
      "ui_label": "User",
      "foreign_key": {
        "entity": "User",
        "field": "id",
        "on_delete": "CASCADE"
      },
      "required": true,
      "indexed": true
    },
    "type": {
      "type": "string",
      "enum": [
        "new_meeting_request",
        "request_accepted",
        "request_declined",
        "request_status_update",
        "meeting_updated",
        "new_message",
        "booking_confirmed",
        "booking_cancelled"
      ],
      "description": "Type of notification",
      "ui_label": "Type",
      "required": true,
      "indexed": true
    },
    "title": {
      "type": "string",
      "description": "Notification title (short summary)",
      "ui_label": "Title",
      "required": true,
      "min_length": 3,
      "max_length": 200
    },
    "body": {
      "type": "string",
      "description": "Notification message body (detailed content)",
      "ui_label": "Message",
      "required": true,
      "min_length": 10,
      "max_length": 1000
    },
    "link": {
      "type": "string",
      "description": "URL to navigate to when notification is clicked",
      "ui_label": "Link",
      "format": "uri",
      "max_length": 500
    },
    "is_read": {
      "type": "boolean",
      "default": false,
      "description": "Whether the notification has been read",
      "ui_label": "Read",
      "indexed": true
    },
    "related_entity_id": {
      "type": "string",
      "format": "uuid",
      "description": "ID of the related entity (e.g., MeetingRequest, ChatMessage)",
      "ui_label": "Related Entity",
      "indexed": true
    }
  },
  "required": ["user_id", "type", "title", "body"],
  "indexes": [
    {
      "name": "idx_notification_user_read",
      "columns": ["user_id", "is_read", "created_date"]
    },
    {
      "name": "idx_notification_type",
      "columns": ["type"]
    },
    {
      "name": "idx_notification_created",
      "columns": ["created_date"]
    },
    {
      "name": "idx_notification_related",
      "columns": ["related_entity_id"]
    }
  ],
  "rls": {
    "read": {
      "$or": [
        {"user_id": "{{user.id}}"},
        {"user_condition": {"role": "admin"}}
      ]
    },
    "write": {
      "$or": [
        {"user_id": "{{user.id}}"},
        {"user_condition": {"role": "admin"}}
      ]
    }
  },
  "cleanup_policy": {
    "auto_delete": {
      "condition": "created_date < current_date - 90 days AND is_read = true",
      "schedule": "Daily at 2:00 AM UTC"
    }
  }
}
```

---

## 4. Built-in System Fields

Every entity automatically includes these fields (no need to define in schema):

```json
{
  "id": {
    "type": "string",
    "format": "uuid",
    "description": "Unique record identifier",
    "primary_key": true,
    "generated": true,
    "immutable": true,
    "indexed": true
  },
  "created_date": {
    "type": "string",
    "format": "date-time",
    "description": "Record creation timestamp (UTC)",
    "generated": true,
    "immutable": true,
    "indexed": true,
    "default": "NOW()"
  },
  "updated_date": {
    "type": "string",
    "format": "date-time",
    "description": "Last update timestamp (UTC)",
    "generated": true,
    "auto_update": true,
    "indexed": true,
    "default": "NOW()",
    "on_update": "NOW()"
  },
  "created_by": {
    "type": "string",
    "format": "email",
    "description": "Email of the user who created the record",
    "generated": true,
    "immutable": true,
    "indexed": true,
    "source": "current_user.email"
  }
}
```

---

## 5. Row-Level Security Policies

### 5.1 RLS Policy Syntax

```javascript
// RLS Policy Structure
{
  "read": {
    // Conditions that must be true for user to read records
    "$or": [
      {field: value},
      {"user_condition": {user_field: value}}
    ]
  },
  "write": {
    // Conditions that must be true for user to create/update/delete records
    "$and": [
      {field: value}
    ]
  }
}
```

### 5.2 Available Operators

| Operator                                                                                | Description                 | Example                                   |
| --------------------------------------------------------------------------------------- | --------------------------- | ----------------------------------------- |
| `$or`            | Logical OR                  | `{"$or": [{cond1}, {cond2}]}`      |                             |                                           |
| `$and`           | Logical AND                 | `{"$and": [{cond1}, {cond2}]}`     |                             |                                           |
| `$in`            | Value in array              | `{"field": {"$in": [val1, val2]}}` |                             |                                           |
| `$eq`                                                                                 | Equals (implicit)           | `{"field": "value"}`                    |
| `$ne`            | Not equals                  | `{"field": {"$ne": "value"}}`      |                             |                                           |
| `$gt`            | Greater than                | `{"field": {"$gt": 10}}`           |                             |                                           |
| `$lt`            | Less than                   | `{"field": {"$lt": 100}}`          |                             |                                           |
| `user_condition`                                                                      | Check current user property | `{"user_condition": {"role": "admin"}}` |

### 5.3 RLS Variables

| Variable           | Description          | Example                              |
| ------------------ | -------------------- | ------------------------------------ |
| `{{user.id}}`    | Current user's ID    | `{"owner_id": "{{user.id}}"}`      |
| `{{user.email}}` | Current user's email | `{"created_by": "{{user.email}}"}` |
| `{{user.role}}`  | Current user's role  | In `user_condition` only           |

### 5.4 Complete RLS Policies by Entity

#### User Entity RLS

```javascript
{
  "read": {
    "$or": [
      // Users can read their own profile
      {"id": "{{user.id}}"},
      // Users can read completed, consented, non-hidden profiles
      {
        "$and": [
          {"profile_completed": true},
          {"consent_given": true},
          {"is_profile_hidden": false}
        ]
      },
      // Admins can read all
      {"user_condition": {"role": "admin"}}
    ]
  },
  "write": {
    "$or": [
      // Users can update their own profile
      {"id": "{{user.id}}"},
      // Admins can update any profile (e.g., change role)
      {"user_condition": {"role": "admin"}}
    ]
  }
}
```

#### MeetingRequest Entity RLS

```javascript
{
  "read": {
    "$or": [
      // Requester can read
      {"requester_id": "{{user.id}}"},
      // Recipients can read
      {"recipient_ids": {"$in": ["{{user.id}}"]}},
      // Admins can read all
      {"user_condition": {"role": "admin"}}
    ]
  },
  "write": {
    "$or": [
      // Requester can update (modify, cancel)
      {"requester_id": "{{user.id}}"},
      // Recipients can update (accept, decline)
      {"recipient_ids": {"$in": ["{{user.id}}"]}},
      // Admins can update all
      {"user_condition": {"role": "admin"}}
    ]
  }
}
```

#### ChatMessage Entity RLS

```javascript
{
  "read": {
    "$or": [
      // Sender can read their sent messages
      {"sender_id": "{{user.id}}"},
      // Recipient can read messages sent to them
      {"recipient_id": "{{user.id}}"},
      // Admins can read all (for moderation)
      {"user_condition": {"role": "admin"}}
    ]
  },
  "write": {
    "$or": [
      // Only sender can create (sender_id must match user)
      {"sender_id": "{{user.id}}"},
      // Recipient can update (mark as read)
      {"recipient_id": "{{user.id}}"},
      // Admins can do anything
      {"user_condition": {"role": "admin"}}
    ]
  }
}
```

#### VenueBooking Entity RLS

```javascript
{
  "read": {
    "$or": [
      // User can read their own bookings
      {"booked_by": "{{user.id}}"},
      // Admins can read all bookings
      {"user_condition": {"role": "admin"}}
    ]
  },
  "write": {
    "$or": [
      // User can create/update/cancel their own bookings
      {"booked_by": "{{user.id}}"},
      // Admins can manage all bookings
      {"user_condition": {"role": "admin"}}
    ]
  }
}
```

#### VenueRoom Entity RLS

```javascript
{
  "read": {
    // Everyone can read rooms (to see availability)
    "$or": [
      true,  // No restrictions on read
      {"user_condition": {"role": "admin"}}
    ]
  },
  "write": {
    // Only admins can create/update/delete rooms
    "user_condition": {"role": "admin"}
  }
}
```

#### Notification Entity RLS

```javascript
{
  "read": {
    "$or": [
      // Users can only read their own notifications
      {"user_id": "{{user.id}}"},
      // Admins can read all notifications
      {"user_condition": {"role": "admin"}}
    ]
  },
  "write": {
    "$or": [
      // Users can update their own notifications (mark as read)
      {"user_id": "{{user.id}}"},
      // System/Admins can create notifications for any user
      {"user_condition": {"role": "admin"}}
    ]
  }
}
```

---

## 6. Entity Relationships

### 6.1 Relationship Types

#### One-to-Many Relationships

```
User (1) ──────< (Many) MeetingRequest
  └── requester_id

User (1) ──────< (Many) MeetingRequest  
  └── recipient_ids[] (array of User IDs)

User (1) ──────< (Many) ChatMessage
  └── sender_id

User (1) ──────< (Many) ChatMessage
  └── recipient_id

User (1) ──────< (Many) VenueBooking
  └── booked_by

VenueRoom (1) ──────< (Many) VenueBooking
  └── room_id

MeetingRequest (1) ──────< (Many) ChatMessage
  └── meeting_request_id

MeetingRequest (1) ──────< (1) VenueBooking
  └── meeting_request_id (unique per meeting)

MeetingRequest (1) ──────< (Many) Notification
  └── related_entity_id
```

### 6.2 Relationship Matrix

| Parent Entity  | Child Entity   | Relationship | Foreign Key        | Cascade Behavior |
| -------------- | -------------- | ------------ | ------------------ | ---------------- |
| User           | MeetingRequest | 1:M          | requester_id       | CASCADE          |
| User           | MeetingRequest | M:M          | recipient_ids      | CASCADE          |
| User           | ChatMessage    | 1:M          | sender_id          | CASCADE          |
| User           | ChatMessage    | 1:M          | recipient_id       | CASCADE          |
| User           | VenueBooking   | 1:M          | booked_by          | CASCADE          |
| User           | Notification   | 1:M          | user_id            | CASCADE          |
| VenueRoom      | VenueBooking   | 1:M          | room_id            | CASCADE          |
| MeetingRequest | ChatMessage    | 1:M          | meeting_request_id | CASCADE          |
| MeetingRequest | VenueBooking   | 1:1          | meeting_request_id | CASCADE          |
| MeetingRequest | Notification   | 1:M          | related_entity_id  | NO ACTION        |

### 6.3 Cascade Behavior Explanation

 **CASCADE** : When parent deleted, all children deleted automatically

* Example: Delete User → All their MeetingRequests deleted

 **SET NULL** : When parent deleted, foreign key set to NULL

* Example: Delete VenueBooking → MeetingRequest.venue_booking_id = NULL

 **NO ACTION** : Prevents deletion if children exist

* Example: Cannot delete MeetingRequest if active ChatMessages exist

---

## 7. Data Validation Rules

### 7.1 Field-Level Validation

```javascript
// User Entity
{
  "email": {
    "format": "email",
    "regex": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
  },
  "biography": {
    "min_length": 50,
    "max_length": 2000
  },
  "linkedin_profile": {
    "format": "uri",
    "regex": "^https?://.*linkedin\\.com/.*$"
  },
  "topical_interests": {
    "min_items": 1,
    "max_items": 20
  }
}

// MeetingRequest Entity
{
  "meeting_code": {
    "regex": "^[A-Z0-9]{8}$",
    "unique": true
  },
  "proposed_topic": {
    "min_length": 5,
    "max_length": 200
  },
  "proposed_duration": {
    "enum": [30, 45, 60, 90, 120],
    "minimum": 15,
    "maximum": 180
  }
}

// ChatMessage Entity
{
  "message": {
    "min_length": 1,
    "max_length": 5000
  }
}

// VenueBooking Entity
{
  "start_time": {
    "validation": "start_time >= NOW() - 15 minutes"
  },
  "end_time": {
    "validation": "end_time > start_time"
  },
  "duration": {
    "validation": "(end_time - start_time) <= 4 hours"
  }
}

// VenueRoom Entity
{
  "name": {
    "unique": true,
    "min_length": 2,
    "max_length": 200
  },
  "capacity": {
    "minimum": 1,
    "maximum": 1000
  }
}
```

### 7.2 Cross-Field Validation

```javascript
// MeetingRequest
{
  "rule": "IF meeting_type === 'single' THEN recipient_ids.length === 1",
  "error": "Single meetings must have exactly one recipient"
}

// ChatMessage
{
  "rule": "sender_id !== recipient_id",
  "error": "Cannot send message to yourself"
}

{
  "rule": "sender_id and recipient_id must be participants in meeting_request_id",
  "error": "Both users must be participants in the meeting"
}

// VenueBooking
{
  "rule": "IF booking_type === 'meeting' THEN meeting_request_id IS NOT NULL",
  "error": "Meeting bookings must have associated meeting request"
}

{
  "rule": "IF booking_type === 'private' THEN private_meeting_topic IS NOT NULL",
  "error": "Private bookings must have a topic"
}
```

### 7.3 Business Logic Validation

```javascript
// VenueBooking - No Overlap
{
  "rule": `
    NOT EXISTS (
      SELECT 1 FROM venue_bookings
      WHERE room_id = NEW.room_id
        AND status = 'active'
        AND id != NEW.id
        AND (
          (NEW.start_time >= start_time AND NEW.start_time < end_time)
          OR (NEW.end_time > start_time AND NEW.end_time <= end_time)
          OR (NEW.start_time <= start_time AND NEW.end_time >= end_time)
        )
    )
  `,
  "error": "This time slot is already booked"
}

// User - Profile Completion
{
  "rule": `
    profile_completed = (
      consent_given === true AND
      representation_type IS NOT NULL AND
      country IS NOT NULL AND
      job_title IS NOT NULL AND
      organization IS NOT NULL AND
      industry_sector IS NOT NULL AND
      biography IS NOT NULL AND
      biography.length >= 50 AND
      topical_interests.length >= 1 AND
      geographical_interests.length >= 1
    )
  `,
  "computed": true
}

// MeetingRequest - Status Transition
{
  "valid_transitions": {
    "pending": ["accepted", "declined", "cancelled"],
    "accepted": ["cancelled"],
    "declined": [],
    "cancelled": []
  },
  "error": "Invalid status transition"
}
```

---

## 8. Entity Lifecycle & State Transitions

### 8.1 MeetingRequest Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│             MEETING REQUEST STATE MACHINE                    │
└─────────────────────────────────────────────────────────────┘

     [CREATE]
        │
        ▼
   ┌─────────┐
   │ pending │ ◄──────────────────┐
   └─────────┘                    │
        │                         │
        │ (recipient accepts)     │
        ├──────────────┐          │
        │              │          │ (requester cancels)
        │              ▼          │
        │         ┌──────────┐    │
        │         │ accepted │────┤
        │         └──────────┘    │
        │              │          │
        │              │          │
        │              │ (either  │
        │              │  party   │
        │              │  cancels)│
        │              ▼          │
        │         ┌───────────┐  │
        │         │ cancelled │◄─┘
        │         └───────────┘
        │
        │ (recipient declines)
        ▼
   ┌──────────┐
   │ declined │
   └──────────┘

State Descriptions:
─────────────────
pending: Waiting for recipient(s) to accept/decline
accepted: Meeting confirmed, can proceed to booking venue
declined: Recipient(s) declined the meeting
cancelled: Either party cancelled after acceptance
```

### 8.2 VenueBooking Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                VENUE BOOKING STATE MACHINE                   │
└─────────────────────────────────────────────────────────────┘

     [CREATE]
        │
        ▼
   ┌────────┐
   │ active │────────────────┐
   └────────┘                │
        │                    │ (user/admin cancels)
        │                    │
        │ (user/admin        │
        │  cancels)          ▼
        │              ┌───────────┐
        │              │ cancelled │
        │              └───────────┘
        │
        │ (end_time passes)
        │ (auto-scheduled)
        ▼
   ┌───────────┐
   │ completed │
   └───────────┘

State Descriptions:
─────────────────
active: Booking is valid and room is reserved
cancelled: Booking was cancelled (room released)
completed: Booking time has passed (historical record)
```

### 8.3 Notification Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                 NOTIFICATION LIFECYCLE                       │
└─────────────────────────────────────────────────────────────┘

     [CREATE]
        │
        │ (is_read = false)
        ▼
   ┌────────┐
   │ unread │
   └────────┘
        │
        │ (user clicks notification)
        │ (is_read = true)
        ▼
   ┌────────┐
   │  read  │
   └────────┘
        │
        │ (after 90 days)
        │ (auto-cleanup)
        ▼
   [DELETED]
```

---

## 9. Indexes & Performance

### 9.1 Index Strategy

```sql
-- User Entity Indexes
CREATE INDEX idx_user_email ON users(email);  -- UNIQUE
CREATE INDEX idx_user_role ON users(role);
CREATE INDEX idx_user_organization ON users(organization);
CREATE INDEX idx_user_country ON users(country);
CREATE INDEX idx_user_representation_type ON users(representation_type);
CREATE INDEX idx_user_profile_completed ON users(profile_completed);

-- MeetingRequest Entity Indexes
CREATE INDEX idx_meeting_requester ON meeting_requests(requester_id);
CREATE INDEX idx_meeting_recipients ON meeting_requests USING GIN(recipient_ids);  -- Array index
CREATE INDEX idx_meeting_status ON meeting_requests(status);
CREATE UNIQUE INDEX idx_meeting_code ON meeting_requests(meeting_code);
CREATE INDEX idx_meeting_created ON meeting_requests(created_date DESC);
CREATE INDEX idx_meeting_type ON meeting_requests(meeting_type);

-- ChatMessage Entity Indexes
CREATE INDEX idx_message_meeting ON chat_messages(meeting_request_id, created_date);
CREATE INDEX idx_message_sender ON chat_messages(sender_id);
CREATE INDEX idx_message_recipient ON chat_messages(recipient_id, read_status);
CREATE INDEX idx_message_created ON chat_messages(created_date DESC);

-- VenueBooking Entity Indexes
CREATE INDEX idx_booking_room_time ON venue_bookings(room_id, start_time, end_time, status);
CREATE INDEX idx_booking_booked_by ON venue_bookings(booked_by);
CREATE INDEX idx_booking_meeting ON venue_bookings(meeting_request_id);
CREATE INDEX idx_booking_status ON venue_bookings(status);
CREATE INDEX idx_booking_start_time ON venue_bookings(start_time);
CREATE INDEX idx_booking_type ON venue_bookings(booking_type);

-- VenueRoom Entity Indexes
CREATE UNIQUE INDEX idx_room_name ON venue_rooms(name);
CREATE INDEX idx_room_active ON venue_rooms(is_active);
CREATE INDEX idx_room_type ON venue_rooms(type);
CREATE INDEX idx_room_capacity ON venue_rooms(capacity);
CREATE INDEX idx_room_floor ON venue_rooms(floor);

-- Notification Entity Indexes
CREATE INDEX idx_notification_user_read ON notifications(user_id, is_read, created_date DESC);
CREATE INDEX idx_notification_type ON notifications(type);
CREATE INDEX idx_notification_created ON notifications(created_date DESC);
CREATE INDEX idx_notification_related ON notifications(related_entity_id);
```

### 9.2 Composite Index Rationale

```
idx_booking_room_time (room_id, start_time, end_time, status):
  ✓ Optimizes overlap detection queries
  ✓ Fast room availability checks
  ✓ Supports date range queries

idx_notification_user_read (user_id, is_read, created_date):
  ✓ Fast unread count queries
  ✓ Efficient notification list loading
  ✓ Supports pagination

idx_message_recipient (recipient_id, read_status):
  ✓ Quick unread message count
  ✓ Efficient message list queries
```

### 9.3 Query Performance Estimates

| Query                    | Records | Index Used                 | Est. Time |
| ------------------------ | ------- | -------------------------- | --------- |
| Get user by email        | 10,000  | idx_user_email             | <5ms      |
| List user's meetings     | 10,000  | idx_meeting_requester      | <10ms     |
| Get unread notifications | 100,000 | idx_notification_user_read | <15ms     |
| Check room availability  | 50,000  | idx_booking_room_time      | <20ms     |
| Get meeting messages     | 200,000 | idx_message_meeting        | <10ms     |
| List active bookings     | 20,000  | idx_booking_status         | <15ms     |

---

## 10. API Endpoints

### 10.1 Generated REST API

Every entity automatically gets these endpoints:

```
GET    /api/entities/{entity_name}              List all records
GET    /api/entities/{entity_name}/{id}         Get single record
POST   /api/entities/{entity_name}              Create new record
PUT    /api/entities/{entity_name}/{id}         Update record
DELETE /api/entities/{entity_name}/{id}         Delete record
GET    /api/entities/{entity_name}/schema       Get entity schema
```

### 10.2 Endpoint Examples

#### User Endpoints

```
GET    /api/entities/User                       List users
GET    /api/entities/User/{id}                  Get user profile
PUT    /api/entities/User/{id}                  Update user profile
GET    /api/entities/User/me                    Get current user
PUT    /api/entities/User/me                    Update current user
```

#### MeetingRequest Endpoints

```
GET    /api/entities/MeetingRequest             List all meetings
GET    /api/entities/MeetingRequest/{id}        Get meeting details
POST   /api/entities/MeetingRequest             Create meeting request
PUT    /api/entities/MeetingRequest/{id}        Update meeting (accept/decline/modify)
DELETE /api/entities/MeetingRequest/{id}        Delete meeting request
```

#### ChatMessage Endpoints

```
GET    /api/entities/ChatMessage                List messages
GET    /api/entities/ChatMessage/{id}           Get single message
POST   /api/entities/ChatMessage                Send new message
PUT    /api/entities/ChatMessage/{id}           Update message (mark read)
```

#### VenueBooking Endpoints

```
GET    /api/entities/VenueBooking               List bookings
GET    /api/entities/VenueBooking/{id}          Get booking details
POST   /api/entities/VenueBooking               Create booking
PUT    /api/entities/VenueBooking/{id}          Update booking
DELETE /api/entities/VenueBooking/{id}          Cancel booking
```

#### VenueRoom Endpoints

```
GET    /api/entities/VenueRoom                  List all rooms
GET    /api/entities/VenueRoom/{id}             Get room details
POST   /api/entities/VenueRoom                  Create room (admin)
PUT    /api/entities/VenueRoom/{id}             Update room (admin)
DELETE /api/entities/VenueRoom/{id}             Delete room (admin)
```

#### Notification Endpoints

```
GET    /api/entities/Notification               List notifications
GET    /api/entities/Notification/{id}          Get single notification
POST   /api/entities/Notification               Create notification (system)
PUT    /api/entities/Notification/{id}          Mark as read
DELETE /api/entities/Notification/{id}          Delete notification
```

### 10.3 Query Parameters

```
Filtering:
?field=value                                    Exact match
?field__gt=value                                Greater than
?field__lt=value                                Less than
?field__in=val1,val2                            In list
?field__contains=text                           Text search

Sorting:
?sort=field                                     Ascending
?sort=-field                                    Descending

Pagination:
?limit=20                                       Limit results
?offset=40                                      Skip records

Example:
GET /api/entities/MeetingRequest?status=pending&sort=-created_date&limit=10
  → Returns 10 most recent pending meeting requests
```

### 10.4 Request/Response Examples

#### Create Meeting Request

```http
POST /api/entities/MeetingRequest
Content-Type: application/json
Authorization: Bearer {token}

{
  "recipient_ids": ["user-uuid-123"],
  "meeting_type": "single",
  "proposed_topic": "Climate Policy Discussion",
  "proposed_duration": 45,
  "personal_message": "I'd like to discuss our collaboration..."
}

Response: 201 Created
{
  "id": "meeting-uuid-456",
  "requester_id": "current-user-uuid",
  "recipient_ids": ["user-uuid-123"],
  "meeting_type": "single",
  "meeting_code": "A7K9M2N4",
  "status": "pending",
  "proposed_topic": "Climate Policy Discussion",
  "proposed_duration": 45,
  "personal_message": "I'd like to discuss our collaboration...",
  "created_date": "2025-01-20T10:30:00Z",
  "updated_date": "2025-01-20T10:30:00Z",
  "created_by": "current.user@example.com"
}
```

#### Accept Meeting Request

```http
PUT /api/entities/MeetingRequest/meeting-uuid-456
Content-Type: application/json
Authorization: Bearer {token}

{
  "status": "accepted"
}

Response: 200 OK
{
  "id": "meeting-uuid-456",
  "status": "accepted",
  "updated_date": "2025-01-20T11:00:00Z",
  ...
}
```

#### Create Venue Booking

```http
POST /api/entities/VenueBooking
Content-Type: application/json
Authorization: Bearer {token}

{
  "room_id": "room-uuid-789",
  "room_name": "Board Room A",
  "room_type": "small",
  "capacity": 8,
  "floor_level": 3,
  "equipment": ["Wifi", "Projector"],
  "meeting_request_id": "meeting-uuid-456",
  "booking_type": "meeting",
  "start_time": "2025-01-23T14:00:00Z",
  "end_time": "2025-01-23T15:00:00Z"
}

Response: 201 Created
{
  "id": "booking-uuid-101",
  "room_id": "room-uuid-789",
  "booked_by": "current-user-uuid",
  "status": "active",
  ...
}
```

---

## 11. Sample Data Structures

### 11.1 Complete User Record

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john.doe@state.gov",
  "full_name": "John Doe",
  "role": "user",
  "created_date": "2025-01-15T10:00:00Z",
  "updated_date": "2025-01-20T14:30:00Z",
  "created_by": "john.doe@state.gov",
  
  "consent_given": true,
  "profile_completed": true,
  "is_profile_hidden": false,
  "representation_type": "government",
  "country": "United States",
  "job_title": "Director of Climate Policy",
  "organization": "U.S. Department of State",
  "industry_sector": "Environmental Policy",
  "biography": "John Doe is a seasoned diplomat with over 15 years of experience in international climate negotiations. He has represented the United States at multiple COP conferences and has been instrumental in shaping bilateral climate agreements with key partners.",
  "linkedin_profile": "https://linkedin.com/in/johndoe",
  
  "topical_interests": [
    {
      "topic": "Climate Change Mitigation",
      "priority": "high"
    },
    {
      "topic": "Renewable Energy Policy",
      "priority": "high"
    },
    {
      "topic": "Carbon Trading Mechanisms",
      "priority": "medium"
    }
  ],
  
  "geographical_interests": [
    {
      "region": "Europe",
      "priority": "high"
    },
    {
      "region": "Asia-Pacific",
      "priority": "medium"
    }
  ],
  
  "preferred_meeting_duration": 45,
  
  "notification_preferences": {
    "new_meeting_request": true,
    "request_status_update": true,
    "new_message": true,
    "booking_confirmed": true
  }
}
```

### 11.2 Complete MeetingRequest Record

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "created_date": "2025-01-20T10:30:00Z",
  "updated_date": "2025-01-20T11:00:00Z",
  "created_by": "john.doe@state.gov",
  
  "requester_id": "550e8400-e29b-41d4-a716-446655440000",
  "recipient_ids": ["770e8400-e29b-41d4-a716-446655440002"],
  "meeting_type": "single",
  "meeting_code": "A7K9M2N4",
  "status": "accepted",
  
  "personal_message": "I'd like to discuss potential collaboration on renewable energy policy between our countries. Looking forward to our conversation.",
  "proposed_topic": "U.S.-France Renewable Energy Cooperation",
  "proposed_duration": 45,
  "scheduled_time": null,
  "venue_booking_id": "880e8400-e29b-41d4-a716-446655440003"
}
```

### 11.3 Complete ChatMessage Record

```json
{
  "id": "990e8400-e29b-41d4-a716-446655440004",
  "created_date": "2025-01-20T11:15:00Z",
  "updated_date": "2025-01-20T11:20:00Z",
  "created_by": "john.doe@state.gov",
  
  "meeting_request_id": "660e8400-e29b-41d4-a716-446655440001",
  "sender_id": "550e8400-e29b-41d4-a716-446655440000",
  "recipient_id": "770e8400-e29b-41d4-a716-446655440002",
  
  "message": "Hi Maria, thanks for accepting the meeting. I've booked Board Room A for January 23rd at 2:00 PM. I'll prepare a brief on our current initiatives.",
  "read_status": true,
  "message_type": "text"
}
```

### 11.4 Complete VenueBooking Record

```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "created_date": "2025-01-20T11:10:00Z",
  "updated_date": "2025-01-20T11:10:00Z",
  "created_by": "john.doe@state.gov",
  
  "room_id": "aa0e8400-e29b-41d4-a716-446655440005",
  "room_name": "Board Room A",
  "room_type": "small",
  "capacity": 8,
  "floor_level": 3,
  "equipment": ["Wifi", "Projector", "Whiteboard"],
  
  "booked_by": "550e8400-e29b-41d4-a716-446655440000",
  "booking_type": "meeting",
  "meeting_request_id": "660e8400-e29b-41d4-a716-446655440001",
  "private_meeting_topic": null,
  
  "start_time": "2025-01-23T14:00:00Z",
  "end_time": "2025-01-23T14:45:00Z",
  "status": "active"
}
```

### 11.5 Complete VenueRoom Record

```json
{
  "id": "aa0e8400-e29b-41d4-a716-446655440005",
  "created_date": "2025-01-10T09:00:00Z",
  "updated_date": "2025-01-15T12:00:00Z",
  "created_by": "admin@uniconnect.com",
  
  "name": "Board Room A",
  "type": "small",
  "capacity": 8,
  "floor": 3,
  "location": "North Wing, near Elevator B",
  "contact": "Facilities: ext. 1234",
  "description": "Modern board room with video conferencing capabilities. Ideal for executive meetings and small group discussions.",
  "equipment": [
    "Wifi",
    "Projector",
    "Whiteboard",
    "Video Conferencing",
    "Coffee Machine"
  ],
  "is_active": true
}
```

### 11.6 Complete Notification Record

```json
{
  "id": "bb0e8400-e29b-41d4-a716-446655440006",
  "created_date": "2025-01-20T11:00:00Z",
  "updated_date": "2025-01-20T11:05:00Z",
  "created_by": "system@uniconnect.com",
  
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "request_accepted",
  "title": "Meeting Request Accepted",
  "body": "Maria Dubois has accepted your meeting request regarding 'U.S.-France Renewable Energy Cooperation' (Code: A7K9M2N4).",
  "link": "/meetings",
  "is_read": true,
  "related_entity_id": "660e8400-e29b-41d4-a716-446655440001"
}
```

---

## 12. Schema Migration Guide

### 12.1 Adding New Field to Existing Entity

```json
// Before
{
  "name": "User",
  "properties": {
    "biography": {"type": "string"}
  }
}

// After - Add phone_number field
{
  "name": "User",
  "properties": {
    "biography": {"type": "string"},
    "phone_number": {
      "type": "string",
      "description": "Contact phone number",
      "pattern": "^\\+?[1-9]\\d{1,14}$",
      "required": false
    }
  }
}

// Migration Impact:
// - No data loss
// - Existing records: phone_number = null
// - New records: can set phone_number
// - Backward compatible
```

### 12.2 Adding New Entity

```json
// Create new EventSession entity
{
  "name": "EventSession",
  "type": "object",
  "properties": {
    "title": {"type": "string", "required": true},
    "start_time": {"type": "string", "format": "date-time", "required": true},
    "end_time": {"type": "string", "format": "date-time", "required": true},
    "room_id": {
      "type": "string",
      "format": "uuid",
      "foreign_key": {"entity": "VenueRoom", "field": "id"}
    }
  }
}

// Migration Impact:
// - New table created
// - No impact on existing entities
// - Can immediately start using
```

### 12.3 Modifying Field Type (Breaking Change)

```json
// Before
{
  "capacity": {"type": "number"}
}

// After - Change to string (NOT RECOMMENDED)
{
  "capacity": {"type": "string"}
}

// Migration Steps:
// 1. Create new field with different name
// 2. Migrate data programmatically
// 3. Update application code
// 4. Delete old field
// 5. Rename new field

// Better approach: Keep original field, add validation
{
  "capacity": {
    "type": "number",
    "minimum": 1,
    "maximum": 1000
  }
}
```

### 12.4 Schema Versioning Best Practices

```
Version 1.0 (Initial):
- User, MeetingRequest, ChatMessage, VenueBooking, VenueRoom, Notification

Version 1.1 (Add fields):
- User: Add phone_number, timezone
- MeetingRequest: Add tags[]
- Backward compatible ✓

Version 2.0 (Breaking changes):
- Rename MeetingRequest.recipient_ids → participants[]
- Requires data migration
- Update all client code
- Not backward compatible ✗

Recommended:
- Use additive changes (v1.x)
- Avoid breaking changes
- If breaking changes needed, plan carefully
```

---

## 📊 Schema Statistics Summary

```
Total Entities: 7 (1 built-in + 6 custom)
Total Fields: 67
Total Indexes: 32
Total RLS Policies: 12
Total Relationships: 11
Total Validation Rules: 25+
Total State Machines: 3

Storage Estimates:
- Small Conference (50 users, 1 week): ~10 MB
- Medium Conference (500 users, 1 month): ~500 MB
- Large Conference (5000 users, 1 week): ~2 GB

Performance Targets:
- Query Response Time: < 100ms (p95)
- Write Operations: < 200ms (p95)
- Page Load Time: < 2 seconds
- Concurrent Users: 10,000+
```

---

## 🎯 Schema Design Principles

1. **Normalization** : Entities normalized to 3NF where appropriate
2. **Denormalization** : Strategic denormalization in VenueBooking for performance
3. **Security First** : RLS policies on every entity
4. **Audit Trail** : Built-in timestamps and created_by on all records
5. **Flexibility** : JSONB fields for extensibility (topical_interests, notification_preferences)
6. **Performance** : Comprehensive indexing strategy
7. **Data Integrity** : Foreign keys with appropriate cascade rules
8. **User Privacy** : GDPR compliance with consent_given, is_profile_hidden
9. **Soft Deletes** : Status fields instead of hard deletes where appropriate
10. **API-First** : Auto-generated RESTful API from schema

---

**End of Complete Schema Documentation**

This document contains the complete database schema for the UNIConnect platform, covering all entities, relationships, validation rules, security policies, and implementation details.
