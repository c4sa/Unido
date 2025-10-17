/**
 * Import Script: Import Data to Supabase
 * 
 * This script imports exported base44 data into Supabase
 * Run this AFTER setting up Supabase schema and configuring environment variables
 * 
 * Prerequisites:
 * 1. Supabase project created
 * 2. Schema created (run supabase-schema.sql)
 * 3. .env file configured with Supabase credentials
 * 4. base44-export.json file exists
 * 
 * Usage: node scripts/import-to-supabase.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Helper function to batch import data
 */
async function batchInsert(tableName, data, batchSize = 100) {
  if (!data || data.length === 0) {
    console.log(`⏭️  Skipping ${tableName} (no data)`);
    return { success: 0, errors: 0 };
  }

  console.log(`📥 Importing ${data.length} records to ${tableName}...`);
  
  let successCount = 0;
  let errorCount = 0;

  // Process in batches
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    try {
      const { error } = await supabase
        .from(tableName)
        .insert(batch);

      if (error) {
        console.error(`   ❌ Batch ${i / batchSize + 1} error:`, error.message);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        console.log(`   ✅ Batch ${i / batchSize + 1}/${Math.ceil(data.length / batchSize)} completed`);
      }
    } catch (err) {
      console.error(`   ❌ Unexpected error:`, err.message);
      errorCount += batch.length;
    }
  }

  return { success: successCount, errors: errorCount };
}

/**
 * Transform base44 data to Supabase format
 */
function transformData(exportData) {
  console.log('🔄 Transforming data for Supabase...\n');

  const { data } = exportData;

  // Transform users (may need ID mapping if formats differ)
  const users = data.users?.map(user => ({
    id: user.id, // Keep same ID if possible, or generate new UUID
    email: user.email,
    full_name: user.full_name,
    role: user.role || 'user',
    consent_given: user.consent_given || false,
    profile_completed: user.profile_completed || false,
    representation_type: user.representation_type,
    country: user.country,
    job_title: user.job_title,
    organization: user.organization,
    industry_sector: user.industry_sector,
    biography: user.biography,
    linkedin_profile: user.linkedin_profile,
    topical_interests: user.topical_interests || [],
    geographical_interests: user.geographical_interests || [],
    notification_preferences: user.notification_preferences || {},
    is_profile_hidden: user.is_profile_hidden || false,
    created_date: user.created_date,
    updated_date: user.updated_date || user.created_date
  }));

  // Transform meeting requests
  const meetingRequests = data.meetingRequests?.map(req => ({
    id: req.id,
    requester_id: req.requester_id,
    recipient_ids: req.recipient_ids || [],
    meeting_type: req.meeting_type || 'single',
    meeting_code: req.meeting_code,
    proposed_topic: req.proposed_topic,
    proposed_duration: req.proposed_duration || 45,
    personal_message: req.personal_message,
    status: req.status || 'pending',
    venue_booking_id: req.venue_booking_id,
    created_date: req.created_date,
    updated_date: req.updated_date || req.created_date
  }));

  // Transform chat messages
  const chatMessages = data.chatMessages?.map(msg => ({
    id: msg.id,
    meeting_request_id: msg.meeting_request_id,
    sender_id: msg.sender_id,
    recipient_id: msg.recipient_id,
    message: msg.message,
    message_type: msg.message_type || 'text',
    read_status: msg.read_status || false,
    created_date: msg.created_date
  }));

  // Transform venue rooms
  const venueRooms = data.venueRooms?.map(room => ({
    id: room.id,
    name: room.name,
    type: room.type,
    capacity: room.capacity,
    floor: room.floor,
    location: room.location,
    contact: room.contact,
    description: room.description,
    equipment: room.equipment || [],
    is_active: room.is_active !== false,
    created_date: room.created_date,
    updated_date: room.updated_date || room.created_date
  }));

  // Transform venue bookings
  const venueBookings = data.venueBookings?.map(booking => ({
    id: booking.id,
    room_id: booking.room_id,
    room_name: booking.room_name,
    room_type: booking.room_type,
    capacity: booking.capacity,
    floor_level: booking.floor_level,
    equipment: booking.equipment || [],
    booked_by: booking.booked_by,
    booking_type: booking.booking_type,
    meeting_request_id: booking.meeting_request_id,
    private_meeting_topic: booking.private_meeting_topic,
    start_time: booking.start_time,
    end_time: booking.end_time,
    status: booking.status || 'active',
    created_date: booking.created_date
  }));

  // Transform notifications
  const notifications = data.notifications?.map(notif => ({
    id: notif.id,
    user_id: notif.user_id,
    type: notif.type,
    title: notif.title,
    body: notif.body,
    link: notif.link,
    related_entity_id: notif.related_entity_id,
    is_read: notif.is_read || false,
    created_date: notif.created_date
  }));

  return {
    users,
    venueRooms,
    meetingRequests,
    venueBookings,
    chatMessages,
    notifications
  };
}

/**
 * Main import function
 */
async function importData() {
  console.log('🚀 Starting Supabase data import...\n');

  try {
    // Read export file
    const exportPath = path.join(__dirname, '..', 'base44-export.json');
    
    if (!fs.existsSync(exportPath)) {
      console.error('❌ Export file not found:', exportPath);
      console.error('   Please run export-base44-data.js first');
      process.exit(1);
    }

    const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    console.log('✅ Export file loaded');
    console.log(`   Export date: ${exportData.exportDate}`);
    console.log(`   Version: ${exportData.version}\n`);

    // Transform data
    const transformed = transformData(exportData);

    // Import in order (respecting foreign key constraints)
    const results = {
      users: { success: 0, errors: 0 },
      venueRooms: { success: 0, errors: 0 },
      meetingRequests: { success: 0, errors: 0 },
      venueBookings: { success: 0, errors: 0 },
      chatMessages: { success: 0, errors: 0 },
      notifications: { success: 0, errors: 0 }
    };

    // 1. Import users first (referenced by everything else)
    console.log('\n1️⃣  Importing Users...');
    results.users = await batchInsert('users', transformed.users);

    // 2. Import venue rooms
    console.log('\n2️⃣  Importing Venue Rooms...');
    results.venueRooms = await batchInsert('venue_rooms', transformed.venueRooms);

    // 3. Import meeting requests
    console.log('\n3️⃣  Importing Meeting Requests...');
    results.meetingRequests = await batchInsert('meeting_requests', transformed.meetingRequests);

    // 4. Import venue bookings
    console.log('\n4️⃣  Importing Venue Bookings...');
    results.venueBookings = await batchInsert('venue_bookings', transformed.venueBookings);

    // 5. Import chat messages
    console.log('\n5️⃣  Importing Chat Messages...');
    results.chatMessages = await batchInsert('chat_messages', transformed.chatMessages);

    // 6. Import notifications
    console.log('\n6️⃣  Importing Notifications...');
    results.notifications = await batchInsert('notifications', transformed.notifications);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(60));
    
    Object.entries(results).forEach(([table, result]) => {
      const total = result.success + result.errors;
      const status = result.errors === 0 ? '✅' : '⚠️';
      console.log(`${status} ${table.padEnd(20)} ${result.success}/${total} successful`);
    });

    const totalSuccess = Object.values(results).reduce((sum, r) => sum + r.success, 0);
    const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors, 0);

    console.log('='.repeat(60));
    console.log(`Total: ${totalSuccess} successful, ${totalErrors} failed`);
    console.log('='.repeat(60));

    if (totalErrors > 0) {
      console.log('\n⚠️  Some records failed to import. Check error messages above.');
      console.log('   Common issues:');
      console.log('   - Foreign key constraints (check user IDs exist)');
      console.log('   - Duplicate IDs (data already imported)');
      console.log('   - Invalid data types or formats');
    } else {
      console.log('\n🎉 All data imported successfully!');
    }

  } catch (error) {
    console.error('\n❌ Fatal error during import:', error);
    process.exit(1);
  }
}

// Run the import
importData();

