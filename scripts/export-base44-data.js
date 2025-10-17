/**
 * Export Script: Base44 Data Export
 * 
 * This script exports all data from base44 before migration to Supabase
 * Run this BEFORE uninstalling @base44/sdk
 * 
 * Usage: node scripts/export-base44-data.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Note: You'll need to temporarily bring back base44Client if you've already removed it
// import { base44 } from '../src/api/base44Client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function exportData() {
  console.log('🚀 Starting base44 data export...\n');

  try {
    // Uncomment and modify this section when you have base44 SDK available
    /*
    console.log('📥 Fetching users...');
    const users = await base44.entities.User.list();
    console.log(`✅ Fetched ${users.length} users`);

    console.log('📥 Fetching meeting requests...');
    const meetingRequests = await base44.entities.MeetingRequest.list();
    console.log(`✅ Fetched ${meetingRequests.length} meeting requests`);

    console.log('📥 Fetching chat messages...');
    const chatMessages = await base44.entities.ChatMessage.list();
    console.log(`✅ Fetched ${chatMessages.length} chat messages`);

    console.log('📥 Fetching venue rooms...');
    const venueRooms = await base44.entities.VenueRoom.list();
    console.log(`✅ Fetched ${venueRooms.length} venue rooms`);

    console.log('📥 Fetching venue bookings...');
    const venueBookings = await base44.entities.VenueBooking.list();
    console.log(`✅ Fetched ${venueBookings.length} venue bookings`);

    console.log('📥 Fetching notifications...');
    const notifications = await base44.entities.Notification.list();
    console.log(`✅ Fetched ${notifications.length} notifications`);

    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      data: {
        users,
        meetingRequests,
        chatMessages,
        venueRooms,
        venueBookings,
        notifications
      },
      metadata: {
        userCount: users.length,
        meetingRequestCount: meetingRequests.length,
        chatMessageCount: chatMessages.length,
        venueRoomCount: venueRooms.length,
        venueBookingCount: venueBookings.length,
        notificationCount: notifications.length
      }
    };

    // Save to file
    const exportPath = path.join(__dirname, '..', 'base44-export.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    
    console.log('\n✅ Export complete!');
    console.log(`📁 Data saved to: ${exportPath}`);
    console.log('\n📊 Export Summary:');
    console.log(`   Users: ${users.length}`);
    console.log(`   Meeting Requests: ${meetingRequests.length}`);
    console.log(`   Chat Messages: ${chatMessages.length}`);
    console.log(`   Venue Rooms: ${venueRooms.length}`);
    console.log(`   Venue Bookings: ${venueBookings.length}`);
    console.log(`   Notifications: ${notifications.length}`);
    */

    console.log('⚠️  This script needs to be run BEFORE removing @base44/sdk');
    console.log('⚠️  Uncomment the code in export-base44-data.js and run again');
    console.log('\nAlternatively, contact base44 support to request a data export.');

  } catch (error) {
    console.error('❌ Error during export:', error);
    process.exit(1);
  }
}

// Run the export
exportData();

