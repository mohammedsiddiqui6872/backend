const express = require('express');
const router = express.Router();
const Shift = require('../models/Shift');
const User = require('../models/User');
const ShiftNotification = require('../models/ShiftNotification');
const shiftNotificationService = require('../services/shiftNotificationService');
const { authenticate, authorize } = require('../middleware/auth');
const { enterpriseTenantIsolation } = require('../middleware/enterpriseTenantIsolation');
const mongoose = require('mongoose');

// Helper to get user ID consistently
const getUserId = (user) => user._id || user.id;

// Get active shift for an employee
router.get('/active', authenticate, authorize(['shifts.view']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const { employee, date } = req.query;
    
    if (!employee) {
      return res.status(400).json({ success: false, message: 'Employee ID required' });
    }
    
    const queryDate = date ? new Date(date) : new Date();
    queryDate.setHours(0, 0, 0, 0);
    
    const shift = await Shift.findOne({
      tenantId: req.tenant.tenantId,
      employee,
      date: queryDate,
      status: { $in: ['scheduled', 'in-progress'] }
    }).populate('employee', 'name email role avatar');
    
    res.json({ success: true, data: shift });
  } catch (error) {
    console.error('Error fetching active shift:', error);
    res.status(500).json({ success: false, message: 'Error fetching active shift' });
  }
});

// Get shifts with filters
router.get('/', authenticate, authorize(['shifts.view']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      employee, 
      department,
      status,
      page = 1,
      limit = 20
    } = req.query;

    const query = { tenantId: req.tenant.tenantId };
    
    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    if (employee) query.employee = employee;
    if (department) query.department = department;
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    
    const [shifts, total] = await Promise.all([
      Shift.find(query)
        .populate('employee', 'name email avatar role')
        .populate('swapRequest.requestedBy', 'name')
        .populate('swapRequest.requestedWith', 'name')
        .sort({ date: -1, 'scheduledTimes.start': 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Shift.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: shifts,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        current: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).json({ success: false, message: 'Error fetching shifts' });
  }
});

// Get notifications for current user
router.get('/notifications', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    
    console.log('Fetching notifications for:', {
      userId: req.user._id,
      tenantId: req.tenant.tenantId,
      status,
      type
    });
    
    const query = {
      tenantId: req.tenant.tenantId,
      employee: req.user._id || getUserId(req.user)
    };
    
    if (status) query.status = status;
    if (type) query.type = type;
    
    const skip = (page - 1) * limit;
    
    const [notifications, total] = await Promise.all([
      ShiftNotification.find(query)
        .populate('shift', 'date shiftType scheduledTimes')
        .populate('data.otherEmployee', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ShiftNotification.countDocuments(query)
    ]);
    
    // Return empty array if no notifications found
    res.json({
      success: true,
      data: notifications || [],
      pagination: {
        total: total || 0,
        pages: Math.ceil((total || 0) / limit),
        current: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    // Return empty data instead of error for better UX
    res.json({ 
      success: true, 
      data: [],
      pagination: {
        total: 0,
        pages: 0,
        current: 1,
        limit: parseInt(limit || 20)
      },
      message: 'No notifications available'
    });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    const notification = await ShiftNotification.findOne({
      _id: req.params.id,
      tenantId: req.tenant.tenantId,
      employee: getUserId(req.user)
    });
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    await notification.markAsRead();
    
    res.json({ 
      success: true, 
      message: 'Notification marked as read' 
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Error marking notification as read' });
  }
});

// Get notification preferences
router.get('/notifications/preferences', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    const preferences = await shiftNotificationService.getNotificationPreferences(getUserId(req.user));
    
    // Return default preferences if none exist
    const defaultPreferences = {
      email: {
        enabled: true,
        shiftReminders: true,
        shiftChanges: true,
        swapRequests: true
      },
      push: {
        enabled: false,
        shiftReminders: true,
        shiftChanges: true,
        swapRequests: true
      },
      sms: {
        enabled: false,
        shiftReminders: false,
        shiftChanges: true,
        swapRequests: false
      }
    };
    
    res.json({
      success: true,
      data: preferences || defaultPreferences
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    // Return default preferences on error
    res.json({ 
      success: true, 
      data: {
        email: { enabled: true, shiftReminders: true, shiftChanges: true, swapRequests: true },
        push: { enabled: false, shiftReminders: true, shiftChanges: true, swapRequests: true },
        sms: { enabled: false, shiftReminders: false, shiftChanges: true, swapRequests: false }
      }
    });
  }
});

// Update notification preferences
router.put('/notifications/preferences', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    const { push, email, sms, inApp, reminderTimes } = req.body;
    
    const preferences = {
      push: push !== undefined ? push : true,
      email: email !== undefined ? email : true,
      sms: sms !== undefined ? sms : false,
      inApp: inApp !== undefined ? inApp : true,
      reminderTimes: reminderTimes || [60, 30, 15]
    };
    
    await shiftNotificationService.updateNotificationPreferences(getUserId(req.user), preferences);
    
    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: preferences
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ success: false, message: 'Error updating preferences' });
  }
});

// Get shift by ID
router.get('/:id', authenticate, authorize(['shifts.view']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const shift = await Shift.findOne({ 
      _id: req.params.id,
      tenantId: req.tenant.tenantId 
    })
    .populate('employee', 'name email avatar role profile')
    .populate('swapRequest.requestedBy', 'name email')
    .populate('swapRequest.requestedWith', 'name email')
    .lean();

    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }

    res.json({ success: true, data: shift });
  } catch (error) {
    console.error('Error fetching shift:', error);
    res.status(500).json({ success: false, message: 'Error fetching shift' });
  }
});

// Create shift
router.post('/', authenticate, authorize(['shifts.manage']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const {
      employee,
      date,
      shiftType,
      scheduledTimes,
      department,
      position,
      notes
    } = req.body;

    // Check if employee exists
    const employeeExists = await User.findOne({ 
      _id: employee, 
      tenantId: req.tenant.tenantId,
      isActive: true 
    });

    if (!employeeExists) {
      return res.status(400).json({ success: false, message: 'Employee not found or inactive' });
    }

    // Check for shift conflicts
    const conflictingShift = await Shift.findOne({
      tenantId: req.tenant.tenantId,
      employee,
      date: new Date(date),
      status: { $nin: ['cancelled'] }
    });

    if (conflictingShift) {
      return res.status(400).json({ 
        success: false, 
        message: 'Employee already has a shift scheduled for this date' 
      });
    }

    const shift = new Shift({
      tenantId: req.tenant.tenantId,
      employee,
      date: new Date(date),
      shiftType,
      scheduledTimes,
      department: department || employeeExists.profile?.department,
      position: position || employeeExists.profile?.position,
      notes,
      payroll: {
        hourlyRate: employeeExists.profile?.salary?.type === 'hourly' 
          ? employeeExists.profile.salary.amount 
          : null
      }
    });

    await shift.save();
    await shift.populate('employee', 'name email avatar role');

    // Create shift notifications
    await shiftNotificationService.createShiftAssignmentNotification(shift);
    await shiftNotificationService.createShiftReminders(shift);

    res.status(201).json({ 
      success: true, 
      message: 'Shift created successfully',
      data: shift 
    });
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(500).json({ success: false, message: 'Error creating shift' });
  }
});

// Update shift
router.put('/:id', authenticate, authorize(['shifts.manage']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const originalShift = await Shift.findOne({ 
      _id: req.params.id, 
      tenantId: req.tenant.tenantId 
    });

    if (!originalShift) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }

    const updates = { ...req.body };
    delete updates.tenantId;
    delete updates.actualTimes; // These should be updated through clock in/out

    // Track what changed for notifications
    const changes = {};
    if (updates.scheduledTimes && (
      updates.scheduledTimes.start !== originalShift.scheduledTimes.start ||
      updates.scheduledTimes.end !== originalShift.scheduledTimes.end
    )) {
      changes.scheduledTimes = updates.scheduledTimes;
    }
    if (updates.date && new Date(updates.date).getTime() !== originalShift.date.getTime()) {
      changes.date = updates.date;
    }
    if (updates.department && updates.department !== originalShift.department) {
      changes.department = updates.department;
    }
    if (updates.position && updates.position !== originalShift.position) {
      changes.position = updates.position;
    }

    const shift = await Shift.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant.tenantId },
      updates,
      { new: true, runValidators: true }
    ).populate('employee', 'name email avatar role');

    // Send update notification if significant changes were made
    if (Object.keys(changes).length > 0) {
      await shiftNotificationService.createShiftUpdateNotification(shift, changes);
    }

    res.json({ 
      success: true, 
      message: 'Shift updated successfully',
      data: shift 
    });
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(500).json({ success: false, message: 'Error updating shift' });
  }
});

// Clock in
router.post('/:id/clock-in', authenticate, authorize(['shifts.clock']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const shift = await Shift.findOne({ 
      _id: req.params.id,
      tenantId: req.tenant.tenantId,
      employee: getUserId(req.user),
      status: 'scheduled'
    });

    if (!shift) {
      return res.status(404).json({ 
        success: false, 
        message: 'Shift not found or not authorized' 
      });
    }

    // Check if already clocked in
    if (shift.actualTimes.clockIn) {
      return res.status(400).json({ 
        success: false, 
        message: 'Already clocked in for this shift' 
      });
    }

    shift.actualTimes.clockIn = new Date();
    shift.status = 'in-progress';
    
    await shift.save();

    res.json({ 
      success: true, 
      message: 'Clocked in successfully',
      data: { clockInTime: shift.actualTimes.clockIn }
    });
  } catch (error) {
    console.error('Error clocking in:', error);
    res.status(500).json({ success: false, message: 'Error clocking in' });
  }
});

// Clock out
router.post('/:id/clock-out', authenticate, authorize(['shifts.clock']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const shift = await Shift.findOne({ 
      _id: req.params.id,
      tenantId: req.tenant.tenantId,
      employee: getUserId(req.user),
      status: 'in-progress'
    });

    if (!shift) {
      return res.status(404).json({ 
        success: false, 
        message: 'Shift not found or not in progress' 
      });
    }

    shift.actualTimes.clockOut = new Date();
    shift.status = 'completed';
    
    // Calculate hours worked
    const hoursWorked = shift.actualDuration;
    
    // Update employee metrics
    await User.findByIdAndUpdate(getUserId(req.user), {
      $inc: { 'metrics.totalHoursWorked': hoursWorked }
    });
    
    await shift.save();

    res.json({ 
      success: true, 
      message: 'Clocked out successfully',
      data: { 
        clockOutTime: shift.actualTimes.clockOut,
        hoursWorked: hoursWorked.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Error clocking out:', error);
    res.status(500).json({ success: false, message: 'Error clocking out' });
  }
});

// Start break
router.post('/:id/break/start', authenticate, authorize(['shifts.clock']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const { type = 'short' } = req.body;
    
    const shift = await Shift.findOne({ 
      _id: req.params.id,
      tenantId: req.tenant.tenantId,
      employee: getUserId(req.user),
      status: 'in-progress'
    });

    if (!shift) {
      return res.status(404).json({ 
        success: false, 
        message: 'Shift not found or not in progress' 
      });
    }

    // Check if already on break
    const activeBreak = shift.actualTimes.breaks.find(b => !b.end);
    if (activeBreak) {
      return res.status(400).json({ 
        success: false, 
        message: 'Already on break' 
      });
    }

    shift.actualTimes.breaks.push({
      start: new Date(),
      type
    });
    
    await shift.save();

    res.json({ 
      success: true, 
      message: 'Break started',
      data: { breakStartTime: new Date() }
    });
  } catch (error) {
    console.error('Error starting break:', error);
    res.status(500).json({ success: false, message: 'Error starting break' });
  }
});

// End break
router.post('/:id/break/end', authenticate, authorize(['shifts.clock']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const shift = await Shift.findOne({ 
      _id: req.params.id,
      tenantId: req.tenant.tenantId,
      employee: getUserId(req.user),
      status: 'in-progress'
    });

    if (!shift) {
      return res.status(404).json({ 
        success: false, 
        message: 'Shift not found or not in progress' 
      });
    }

    // Find active break
    const activeBreak = shift.actualTimes.breaks.find(b => !b.end);
    if (!activeBreak) {
      return res.status(400).json({ 
        success: false, 
        message: 'No active break found' 
      });
    }

    activeBreak.end = new Date();
    
    await shift.save();

    const breakDuration = (activeBreak.end - activeBreak.start) / (1000 * 60); // minutes

    res.json({ 
      success: true, 
      message: 'Break ended',
      data: { 
        breakEndTime: activeBreak.end,
        breakDuration: Math.round(breakDuration)
      }
    });
  } catch (error) {
    console.error('Error ending break:', error);
    res.status(500).json({ success: false, message: 'Error ending break' });
  }
});

// Request shift swap
router.post('/:id/swap-request', authenticate, authorize(['shifts.swap']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const { requestedWithId, reason } = req.body;
    
    const shift = await Shift.findOne({ 
      _id: req.params.id,
      tenantId: req.tenant.tenantId,
      employee: getUserId(req.user),
      status: 'scheduled'
    });

    if (!shift) {
      return res.status(404).json({ 
        success: false, 
        message: 'Shift not found or not authorized' 
      });
    }

    // Check if swap already requested
    if (shift.swapRequest?.status === 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Swap request already pending' 
      });
    }

    // Verify requested employee exists and is active
    const requestedEmployee = await User.findOne({ 
      _id: requestedWithId, 
      tenantId: req.tenant.tenantId,
      isActive: true 
    });

    if (!requestedEmployee) {
      return res.status(400).json({ 
        success: false, 
        message: 'Requested employee not found or inactive' 
      });
    }

    shift.swapRequest = {
      requestedBy: getUserId(req.user),
      requestedWith: requestedWithId,
      reason,
      status: 'pending',
      requestDate: new Date()
    };
    
    await shift.save();
    await shift.populate('swapRequest.requestedWith', 'name email');

    res.json({ 
      success: true, 
      message: 'Swap request submitted',
      data: shift.swapRequest
    });
  } catch (error) {
    console.error('Error requesting swap:', error);
    res.status(500).json({ success: false, message: 'Error requesting swap' });
  }
});

// Approve/reject swap request
router.put('/:id/swap-request', authenticate, authorize(['shifts.approve']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status' 
      });
    }

    const shift = await Shift.findOne({ 
      _id: req.params.id,
      tenantId: req.tenant.tenantId,
      'swapRequest.status': 'pending'
    });

    if (!shift) {
      return res.status(404).json({ 
        success: false, 
        message: 'Shift not found or no pending swap request' 
      });
    }

    shift.swapRequest.status = status;
    shift.swapRequest.approvedBy = getUserId(req.user);
    shift.swapRequest.responseDate = new Date();

    if (status === 'approved') {
      // Swap the employee
      shift.employee = shift.swapRequest.requestedWith;
    }
    
    await shift.save();
    await shift.populate('employee', 'name email');
    await shift.populate('swapRequest.requestedWith', 'name email');

    // Send notification about swap decision
    await shiftNotificationService.createSwapResponseNotification(
      shift, 
      shift.swapRequest.requestedBy, 
      status === 'approved',
      getUserId(req.user)
    );

    res.json({ 
      success: true, 
      message: `Swap request ${status}`,
      data: shift
    });
  } catch (error) {
    console.error('Error processing swap request:', error);
    res.status(500).json({ success: false, message: 'Error processing swap request' });
  }
});

// Delete/cancel shift
router.delete('/:id', authenticate, authorize(['shifts.manage']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const shift = await Shift.findOne({ 
      _id: req.params.id,
      tenantId: req.tenant.tenantId
    });

    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }

    if (shift.status === 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete completed shifts' 
      });
    }

    shift.status = 'cancelled';
    await shift.save();

    res.json({ 
      success: true, 
      message: 'Shift cancelled successfully' 
    });
  } catch (error) {
    console.error('Error cancelling shift:', error);
    res.status(500).json({ success: false, message: 'Error cancelling shift' });
  }
});

// Get shift statistics
router.get('/stats/overview', authenticate, authorize(['shifts.reports']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    
    const matchStage = { 
      tenantId: req.tenant.tenantId 
    };
    
    if (Object.keys(dateFilter).length > 0) {
      matchStage.date = dateFilter;
    }

    const [
      totalShifts,
      completedShifts,
      cancelledShifts,
      noShowShifts,
      totalHoursScheduled,
      totalHoursWorked,
      overtimeHours,
      swapRequests
    ] = await Promise.all([
      Shift.countDocuments(matchStage),
      Shift.countDocuments({ ...matchStage, status: 'completed' }),
      Shift.countDocuments({ ...matchStage, status: 'cancelled' }),
      Shift.countDocuments({ ...matchStage, status: 'no-show' }),
      Shift.aggregate([
        { $match: matchStage },
        { $group: { 
          _id: null, 
          total: { 
            $sum: 0 // Will calculate differently since times are strings
          }
        }}
      ]).then(async (result) => {
        // Calculate hours from string times
        const shifts = await Shift.find(matchStage);
        const totalHours = shifts.reduce((sum, shift) => {
          if (shift.scheduledTimes.start && shift.scheduledTimes.end) {
            const startParts = shift.scheduledTimes.start.split(':');
            const endParts = shift.scheduledTimes.end.split(':');
            const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
            const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
            let duration = endMinutes - startMinutes;
            if (duration < 0) duration += 24 * 60;
            return sum + (duration / 60);
          }
          return sum;
        }, 0);
        return [{ _id: null, total: totalHours }];
      }),
      Shift.aggregate([
        { $match: { ...matchStage, status: 'completed' } },
        { $group: { 
          _id: null, 
          total: { $sum: '$payroll.totalHours' }
        }}
      ]),
      Shift.aggregate([
        { $match: { ...matchStage, status: 'completed' } },
        { $group: { 
          _id: null, 
          total: { $sum: '$payroll.overtimeHours' }
        }}
      ]),
      Shift.countDocuments({ ...matchStage, 'swapRequest.status': 'pending' })
    ]);

    res.json({
      success: true,
      data: {
        totalShifts,
        completedShifts,
        cancelledShifts,
        noShowShifts,
        completionRate: totalShifts > 0 ? ((completedShifts / totalShifts) * 100).toFixed(1) : 0,
        totalHoursScheduled: totalHoursScheduled[0]?.total || 0,
        totalHoursWorked: totalHoursWorked[0]?.total || 0,
        overtimeHours: overtimeHours[0]?.total || 0,
        pendingSwapRequests: swapRequests
      }
    });
  } catch (error) {
    console.error('Error fetching shift stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching shift statistics' });
  }
});

// Create a swap request
router.post('/:id/swap-request', authenticate, authorize(['shifts.swap']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const { requestedWith, reason } = req.body;
    
    const shift = await Shift.findOne({
      _id: req.params.id,
      tenantId: req.tenant.tenantId,
      employee: getUserId(req.user),
      status: 'scheduled'
    });
    
    if (!shift) {
      return res.status(404).json({ 
        success: false, 
        message: 'Shift not found or not authorized' 
      });
    }
    
    // Check if already has a pending swap request
    if (shift.swapRequest?.status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This shift already has a pending swap request'
      });
    }
    
    // Validate requested employee
    const targetEmployee = await User.findOne({
      _id: requestedWith,
      tenantId: req.tenant.tenantId,
      isActive: true
    });
    
    if (!targetEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Target employee not found or inactive'
      });
    }
    
    // Create swap request
    shift.swapRequest = {
      requestedBy: getUserId(req.user),
      requestedWith,
      reason,
      status: 'pending',
      requestDate: new Date()
    };
    
    await shift.save();
    
    // Send notification to target employee
    await shiftNotificationService.createSwapRequestNotification(
      shift,
      getUserId(req.user),
      requestedWith,
      reason
    );
    
    res.json({
      success: true,
      message: 'Swap request created successfully',
      data: shift
    });
  } catch (error) {
    console.error('Error creating swap request:', error);
    res.status(500).json({ success: false, message: 'Error creating swap request' });
  }
});

module.exports = router;