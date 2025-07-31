const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const Role = require('../models/Role');
const { authenticate, authorize } = require('../middleware/auth');
const { enterpriseTenantIsolation, strictTenantIsolation } = require('../middleware/enterpriseTenantIsolation');

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

// Configure multer for document uploads (PDFs, images, etc.)
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profiles/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadDocuments = multer({ 
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for documents
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error('File type not allowed. Allowed types: JPG, PNG, GIF, PDF, DOC, DOCX'));
    }
  }
});

// Get all team members with enhanced details
router.get('/members', authenticate, authorize(['users.view']), enterpriseTenantIsolation, async (req, res) => {
  try {
    console.log('Team members endpoint - Tenant:', req.tenant?.name);
    console.log('Team members endpoint - Tenant ID:', req.tenant?.tenantId);
    
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

    // Ensure we have the correct tenantId
    if (!req.tenant || !req.tenant.tenantId) {
      console.error('No tenant context in team members endpoint');
      return res.status(403).json({ success: false, message: 'Tenant context required' });
    }
    
    const query = { tenantId: req.tenant.tenantId };
    console.log('Team route - Building query with tenantId:', req.tenant.tenantId);
    
    // Only add search if it's not empty
    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'profile.employeeId': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Only add filters if they have values
    if (role && role.trim()) query.role = role;
    if (department && department.trim()) query['profile.department'] = department;
    if (employmentType && employmentType.trim()) query['profile.employmentType'] = employmentType;
    if (isActive !== undefined && isActive !== '') query.isActive = isActive === 'true';

    console.log('Query being executed:', JSON.stringify(query, null, 2));
    
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
router.get('/members/:id', authenticate, authorize(['users.view']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const user = await User.findOne({ 
      _id: req.params.id,
      tenantId: req.tenant.tenantId 
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
router.post('/members', authenticate, authorize(['users.create']), enterpriseTenantIsolation, async (req, res) => {
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
      tenantId: req.tenant.tenantId 
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const user = new User({
      tenantId: req.tenant.tenantId,
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
router.put('/members/:id', authenticate, authorize(['users.manage']), enterpriseTenantIsolation, async (req, res) => {
  try {
    console.log('Update team member - Tenant:', req.tenant?.name, 'ID:', req.tenant?.tenantId);
    
    const updates = { ...req.body };
    delete updates.password; // Don't allow password updates through this route
    delete updates.tenantId; // Don't allow tenant changes

    // First find the user to ensure it exists and belongs to the tenant
    const existingUser = await User.findOne({
      _id: req.params.id,
      tenantId: req.tenant.tenantId
    });

    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }

    // Update using save() to maintain context
    Object.assign(existingUser, updates);
    await existingUser.save();

    // Return without password
    const userObject = existingUser.toObject();
    delete userObject.password;

    res.json({ 
      success: true, 
      message: 'Team member updated successfully',
      data: userObject 
    });
  } catch (error) {
    console.error('Error updating team member:', error);
    res.status(500).json({ success: false, message: error.message || 'Error updating team member' });
  }
});

// Upload profile photo
router.post('/members/:id/photo', authenticate, authorize(['users.manage']), enterpriseTenantIsolation, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const photoUrl = `/uploads/profiles/${req.file.filename}`;

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant.tenantId },
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
router.post('/members/:id/documents', authenticate, authorize(['users.manage']), enterpriseTenantIsolation, uploadDocuments.array('documents', 5), async (req, res) => {
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

    // Find user first
    const user = await User.findOne({
      _id: req.params.id,
      tenantId: req.tenant.tenantId
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }

    // Add documents and save
    if (!user.profile.documents) {
      user.profile.documents = [];
    }
    user.profile.documents.push(...documents);
    await user.save();

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
router.delete('/members/:id', authenticate, authorize(['users.delete']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant.tenantId },
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
router.get('/stats', authenticate, authorize(['users.view']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const [
      totalMembers,
      activeMembers,
      roleDistribution,
      departmentDistribution
    ] = await Promise.all([
      User.countDocuments({ tenantId: req.tenant.tenantId }),
      User.countDocuments({ tenantId: req.tenant.tenantId, isActive: true }),
      User.aggregate([
        { $match: { tenantId: req.tenant.tenantId } },
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      User.aggregate([
        { $match: { tenantId: req.tenant.tenantId } },
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