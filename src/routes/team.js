const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const Role = require('../models/Role');
const { authenticate, authorize } = require('../middleware/auth');
const { ensureTenantIsolation } = require('../middleware/tenantContext');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profiles/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get all team members with enhanced details
router.get('/members', authenticate, authorize(['users.view']), ensureTenantIsolation, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      role, 
      department,
      employmentType,
      isActive,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const query = { tenantId: req.tenant.id };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'profile.employeeId': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) query.role = role;
    if (department) query['profile.department'] = department;
    if (employmentType) query['profile.employmentType'] = employmentType;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        current: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ success: false, message: 'Error fetching team members' });
  }
});

// Get single team member with full details
router.get('/members/:id', authenticate, authorize(['users.view']), ensureTenantIsolation, async (req, res) => {
  try {
    const user = await User.findOne({ 
      _id: req.params.id,
      tenantId: req.tenant.id 
    }).select('-password').lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching team member:', error);
    res.status(500).json({ success: false, message: 'Error fetching team member' });
  }
});

// Create new team member
router.post('/members', authenticate, authorize(['users.create']), ensureTenantIsolation, async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      profile,
      shiftPreferences,
      permissions
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      email, 
      tenantId: req.tenant.id 
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const user = new User({
      tenantId: req.tenant.id,
      name,
      email,
      password,
      role,
      phone,
      profile,
      shiftPreferences,
      permissions: permissions || []
    });

    await user.save();

    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;

    res.status(201).json({ 
      success: true, 
      message: 'Team member created successfully',
      data: userWithoutPassword 
    });
  } catch (error) {
    console.error('Error creating team member:', error);
    res.status(500).json({ success: false, message: 'Error creating team member' });
  }
});

// Update team member
router.put('/members/:id', authenticate, authorize(['users.manage']), ensureTenantIsolation, async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.password; // Don't allow password updates through this route
    delete updates.tenantId; // Don't allow tenant changes

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant.id },
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }

    res.json({ 
      success: true, 
      message: 'Team member updated successfully',
      data: user 
    });
  } catch (error) {
    console.error('Error updating team member:', error);
    res.status(500).json({ success: false, message: 'Error updating team member' });
  }
});

// Upload profile photo
router.post('/members/:id/photo', authenticate, authorize(['users.manage']), ensureTenantIsolation, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const photoUrl = `/uploads/profiles/${req.file.filename}`;

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant.id },
      { avatar: photoUrl },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }

    res.json({ 
      success: true, 
      message: 'Profile photo uploaded successfully',
      data: { avatar: photoUrl }
    });
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    res.status(500).json({ success: false, message: 'Error uploading profile photo' });
  }
});

// Upload documents
router.post('/members/:id/documents', authenticate, authorize(['users.manage']), ensureTenantIsolation, upload.array('documents', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const documents = req.files.map(file => ({
      type: req.body.type || 'other',
      name: file.originalname,
      url: `/uploads/profiles/${file.filename}`,
      expiryDate: req.body.expiryDate,
      uploadedAt: new Date()
    }));

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant.id },
      { $push: { 'profile.documents': { $each: documents } } },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }

    res.json({ 
      success: true, 
      message: 'Documents uploaded successfully',
      data: documents
    });
  } catch (error) {
    console.error('Error uploading documents:', error);
    res.status(500).json({ success: false, message: 'Error uploading documents' });
  }
});

// Delete team member
router.delete('/members/:id', authenticate, authorize(['users.delete']), ensureTenantIsolation, async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant.id },
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }

    res.json({ 
      success: true, 
      message: 'Team member deactivated successfully' 
    });
  } catch (error) {
    console.error('Error deleting team member:', error);
    res.status(500).json({ success: false, message: 'Error deleting team member' });
  }
});

// Get team stats
router.get('/stats', authenticate, authorize(['users.view']), ensureTenantIsolation, async (req, res) => {
  try {
    const [
      totalMembers,
      activeMembers,
      roleDistribution,
      departmentDistribution
    ] = await Promise.all([
      User.countDocuments({ tenantId: req.tenant.id }),
      User.countDocuments({ tenantId: req.tenant.id, isActive: true }),
      User.aggregate([
        { $match: { tenantId: req.tenant.id } },
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      User.aggregate([
        { $match: { tenantId: req.tenant.id } },
        { $group: { _id: '$profile.department', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalMembers,
        activeMembers,
        inactiveMembers: totalMembers - activeMembers,
        roleDistribution: roleDistribution.filter(r => r._id),
        departmentDistribution: departmentDistribution.filter(d => d._id)
      }
    });
  } catch (error) {
    console.error('Error fetching team stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching team stats' });
  }
});

module.exports = router;