const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { createUploadMiddleware } = require('../middleware/fileUploadSecurity');
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
    
    // Handle supervisor field - convert empty string to null
    if (updates.profile && updates.profile.supervisor === '') {
      updates.profile.supervisor = null;
    }
    
    // Handle other ObjectId fields that might be empty strings
    if (updates.profile) {
      // Convert empty strings to null for ObjectId fields
      const objectIdFields = ['supervisor', 'department', 'position'];
      objectIdFields.forEach(field => {
        if (updates.profile[field] === '') {
          updates.profile[field] = null;
        }
      });
    }

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

// Update team member password
router.patch('/members/:id/password', authenticate, authorize(['users.manage']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }
    
    // Find user and update password
    const user = await User.findOne({
      _id: req.params.id,
      tenantId: req.tenant.tenantId
    });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }
    
    // Hash the new password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Password updated successfully' 
    });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ success: false, message: 'Error updating password' });
  }
});

// Upload profile photo
router.post('/members/:id/photo', 
  authenticate, 
  authorize(['users.manage']), 
  enterpriseTenantIsolation, 
  ...createUploadMiddleware('profile-photo', 'photo', 1),
  async (req, res) => {
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
router.post('/members/:id/documents', authenticate, authorize(['users.manage']), enterpriseTenantIsolation, (req, res, next) => {
  console.log('=== DOCUMENT UPLOAD DEBUG ===');
  console.log('Headers:', req.headers);
  console.log('Content-Type:', req.get('content-type'));
  console.log('User ID:', req.params.id);
  console.log('User permissions:', req.user?.permissions);
  console.log('Tenant:', req.tenant?.name);
  
  // Check if uploads directory exists
  const uploadsDir = path.join(__dirname, '../../../uploads/profiles');
  const fs = require('fs');
  
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('Created uploads directory:', uploadsDir);
    } else {
      console.log('Uploads directory exists:', uploadsDir);
    }
    
    // Check directory permissions
    fs.accessSync(uploadsDir, fs.constants.W_OK);
    console.log('Directory is writable');
  } catch (error) {
    console.error('Directory error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server configuration error: uploads directory not accessible' 
    });
  }
  
  uploadDocuments.array('documents', 5)(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      console.error('Error stack:', err.stack);
      console.error('Error code:', err.code);
      console.error('Error field:', err.field);
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          success: false, 
          message: 'File too large. Maximum size is 10MB per file',
          error: 'FILE_TOO_LARGE'
        });
      } else if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ 
          success: false, 
          message: 'Too many files. Maximum 5 files allowed at once',
          error: 'TOO_MANY_FILES'
        });
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ 
          success: false, 
          message: 'Unexpected field name. Files must be uploaded with field name "documents"',
          error: 'INVALID_FIELD_NAME'
        });
      } else if (err.message && err.message.includes('File type not allowed')) {
        return res.status(400).json({ 
          success: false, 
          message: err.message,
          error: 'INVALID_FILE_TYPE'
        });
      }
      return res.status(400).json({ 
        success: false, 
        message: err.message || 'Error uploading file',
        error: 'UPLOAD_ERROR',
        details: err.toString()
      });
    }
    console.log('Multer processing complete');
    console.log('Files processed:', req.files?.length || 0);
    next();
  });
}, async (req, res) => {
  try {
    console.log('Document upload - Tenant:', req.tenant?.name, 'User ID:', req.params.id);
    console.log('Files received:', req.files?.length || 0);
    console.log('Body:', req.body);
    
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

    // Return user object without password
    const userObject = user.toObject();
    delete userObject.password;
    
    res.json({ 
      success: true, 
      message: 'Documents uploaded successfully',
      data: documents,
      user: userObject
    });
  } catch (error) {
    console.error('Error uploading documents:', error);
    res.status(500).json({ success: false, message: error.message || 'Error uploading documents' });
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

// Debug endpoint - check permissions
router.get('/debug/permissions', authenticate, enterpriseTenantIsolation, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      permissions: req.user.permissions || []
    },
    tenant: {
      id: req.tenant?.tenantId,
      name: req.tenant?.name
    }
  });
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