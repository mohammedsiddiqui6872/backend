// Test script for shift notifications
require('dotenv').config();
const mongoose = require('mongoose');
const Shift = require('./src/models/Shift');
const User = require('./src/models/User');
const ShiftNotification = require('./src/models/ShiftNotification');
const shiftNotificationService = require('./src/services/shiftNotificationService');

async function testShiftNotifications() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Test tenant ID (you can change this to your actual tenant)
    const tenantId = 'mughlaimagic';
    
    // Find a test employee
    const employee = await User.findOne({ 
      tenantId, 
      role: { $in: ['waiter', 'chef', 'cashier'] },
      isActive: true 
    });
    
    if (!employee) {
      console.log('No employee found for testing');
      return;
    }
    
    console.log(`\nTesting with employee: ${employee.name} (${employee.email})`);
    console.log('Employee notification preferences:', employee.notificationPreferences);
    console.log('Employee device tokens:', employee.deviceTokens?.length || 0, 'tokens');
    console.log('Employee FCM token:', employee.fcmToken ? 'Present' : 'Not set');
    
    // Create a test shift for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const testShift = await Shift.create({
      tenantId,
      employee: employee._id,
      date: tomorrow,
      shiftType: 'morning',
      scheduledTimes: {
        start: '09:00',
        end: '17:00'
      },
      department: employee.profile?.department || 'Restaurant',
      position: employee.profile?.position || employee.role,
      status: 'scheduled'
    });
    
    console.log(`\nCreated test shift: ${testShift._id}`);
    console.log(`Shift date: ${testShift.date}`);
    console.log(`Shift time: ${testShift.scheduledTimes.start} - ${testShift.scheduledTimes.end}`);
    console.log(`Shift duration: ${testShift.scheduledDuration} hours`);
    
    // Test 1: Create shift reminders
    console.log('\n--- Testing Shift Reminders ---');
    const reminders = await shiftNotificationService.createShiftReminders(testShift);
    console.log(`Created ${reminders.length} shift reminders`);
    reminders.forEach(reminder => {
      console.log(`  - ${reminder.type}: "${reminder.title}" scheduled for ${reminder.scheduledFor}`);
    });
    
    // Test 2: Create break reminders
    console.log('\n--- Testing Break Reminders ---');
    const breakReminders = await shiftNotificationService.createBreakReminders(testShift);
    console.log(`Created ${breakReminders.length} break reminders`);
    breakReminders.forEach(reminder => {
      console.log(`  - ${reminder.type}: "${reminder.title}" scheduled for ${reminder.scheduledFor}`);
    });
    
    // Test 3: Create shift assignment notification
    console.log('\n--- Testing Shift Assignment Notification ---');
    const assignmentNotification = await shiftNotificationService.createShiftAssignmentNotification(testShift);
    console.log(`Created assignment notification: "${assignmentNotification.title}"`);
    console.log(`Channels: ${assignmentNotification.channels.join(', ')}`);
    
    // Test 4: Check notification queue processing
    console.log('\n--- Testing Notification Queue Processing ---');
    
    // Update one notification to be due now for testing
    const testNotification = await ShiftNotification.findByIdAndUpdate(
      assignmentNotification._id,
      { scheduledFor: new Date() },
      { new: true }
    );
    
    console.log('Processing notification queue...');
    await shiftNotificationService.processNotificationQueue();
    
    // Check notification status
    const processedNotification = await ShiftNotification.findById(testNotification._id);
    console.log(`Notification status: ${processedNotification.status}`);
    console.log('Delivery status:', processedNotification.deliveryStatus);
    
    // Test 5: Check all pending notifications
    console.log('\n--- All Pending Notifications ---');
    const pendingNotifications = await ShiftNotification.find({
      tenantId,
      status: 'pending'
    }).limit(10);
    
    console.log(`Found ${pendingNotifications.length} pending notifications`);
    pendingNotifications.forEach(notif => {
      console.log(`  - ${notif.type}: "${notif.title}" scheduled for ${notif.scheduledFor}`);
    });
    
    // Clean up test data
    console.log('\n--- Cleaning up test data ---');
    await Shift.findByIdAndDelete(testShift._id);
    await ShiftNotification.deleteMany({ shift: testShift._id });
    console.log('Test data cleaned up');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the test
testShiftNotifications();