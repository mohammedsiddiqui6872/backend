const express = require('express');
const router = express.Router();
const Shift = require('../models/Shift');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const { ensureTenantIsolation } = require('../middleware/tenantContext');
const mongoose = require('mongoose');

// Get active shift for an employee
router.get('/active', authenticate, authorize(['shifts.view']), ensureTenantIsolation, async (req, res) => {
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
router.get('/', authenticate, authorize(['shifts.view']), ensureTenantIsolation, async (req, res) => {
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

// Get shift by ID
router.get('/:id', authenticate, authorize(['shifts.view']), ensureTenantIsolation, async (req, res) => {
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
router.post('/', authenticate, authorize(['shifts.manage']), ensureTenantIsolation, async (req, res) => {
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
router.put('/:id', authenticate, authorize(['shifts.manage']), ensureTenantIsolation, async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.tenantId;
    delete updates.actualTimes; // These should be updated through clock in/out

    const shift = await Shift.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant.tenantId },
      updates,
      { new: true, runValidators: true }
    ).populate('employee', 'name email avatar role');

    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
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
router.post('/:id/clock-in', authenticate, authorize(['shifts.clock']), ensureTenantIsolation, async (req, res) => {
  try {
    const shift = await Shift.findOne({ 
      _id: req.params.id,
      tenantId: req.tenant.tenantId,
      employee: req.user.id,
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
router.post('/:id/clock-out', authenticate, authorize(['shifts.clock']), ensureTenantIsolation, async (req, res) => {
  try {
    const shift = await Shift.findOne({ 
      _id: req.params.id,
      tenantId: req.tenant.tenantId,
      employee: req.user.id,
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
    await User.findByIdAndUpdate(req.user.id, {
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
router.post('/:id/break/start', authenticate, authorize(['shifts.clock']), ensureTenantIsolation, async (req, res) => {
  try {
    const { type = 'short' } = req.body;
    
    const shift = await Shift.findOne({ 
      _id: req.params.id,
      tenantId: req.tenant.tenantId,
      employee: req.user.id,
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
router.post('/:id/break/end', authenticate, authorize(['shifts.clock']), ensureTenantIsolation, async (req, res) => {
  try {
    const shift = await Shift.findOne({ 
      _id: req.params.id,
      tenantId: req.tenant.tenantId,
      employee: req.user.id,
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
router.post('/:id/swap-request', authenticate, authorize(['shifts.swap']), ensureTenantIsolation, async (req, res) => {
  try {
    const { requestedWithId, reason } = req.body;
    
    const shift = await Shift.findOne({ 
      _id: req.params.id,
      tenantId: req.tenant.tenantId,
      employee: req.user.id,
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
      requestedBy: req.user.id,
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
router.put('/:id/swap-request', authenticate, authorize(['shifts.approve']), ensureTenantIsolation, async (req, res) => {
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
    shift.swapRequest.approvedBy = req.user.id;
    shift.swapRequest.responseDate = new Date();

    if (status === 'approved') {
      // Swap the employee
      shift.employee = shift.swapRequest.requestedWith;
    }
    
    await shift.save();
    await shift.populate('employee', 'name email');
    await shift.populate('swapRequest.requestedWith', 'name email');

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
router.delete('/:id', authenticate, authorize(['shifts.manage']), ensureTenantIsolation, async (req, res) => {
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
router.get('/stats/overview', authenticate, authorize(['shifts.reports']), ensureTenantIsolation, async (req, res) => {
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

module.exports = router;