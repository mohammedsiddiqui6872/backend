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
    const uploadPath = path.join(__dirname, '../../uploads/profiles');
    // Create directory if it doesn't exist
    const fs = require('fs');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
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

// Configure multer for document uploads (store in memory for database storage)
const documentStorage = multer.memoryStorage(); // Store in memory instead of disk

const uploadDocuments = multer({ 
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for documents
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const mimeTypeValid = allowedMimeTypes.includes(file.mimetype);
    
    if (extname && mimeTypeValid) {
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
    let {
      name,
      email,
      password,
      role,
      phone,
      profile,
      shiftPreferences,
      permissions
    } = req.body;
    
    // Normalize role to lowercase for consistency
    if (role) {
      role = role.toLowerCase();
    }

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
    
    // Normalize role to lowercase for consistency
    if (updates.role) {
      updates.role = updates.role.toLowerCase();
    }
    
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
    console.log('Password update request for ID:', req.params.id, 'Tenant:', req.tenant?.tenantId);
    
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }
    
    // Validate the ID parameter
    const mongoose = require('mongoose');
    if (!req.params.id || req.params.id === 'null' || req.params.id === 'undefined' || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.error('Invalid ID provided:', req.params.id);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid team member ID provided' 
      });
    }
    
    // Find user and update password
    const user = await User.findOne({
      _id: req.params.id,
      tenantId: req.tenant.tenantId
    });
    
    if (!user) {
      console.error('User not found for ID:', req.params.id, 'and tenant:', req.tenant.tenantId);
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }
    
    // Hash the new password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    
    console.log('Password updated successfully for user:', user.email);
    
    res.json({ 
      success: true, 
      message: 'Password updated successfully' 
    });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ success: false, message: error.message || 'Error updating password' });
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

    // Convert files to Base64 and prepare documents
    const documents = req.files.map(file => {
      // Convert buffer to Base64
      const base64Data = file.buffer.toString('base64');
      
      return {
        type: req.body.type || 'other',
        name: file.originalname,
        data: base64Data, // Store Base64 encoded data
        mimeType: file.mimetype,
        size: file.size,
        expiryDate: req.body.expiryDate,
        uploadedAt: new Date()
      };
    });

    // Find user first
    const user = await User.findOne({
      _id: req.params.id,
      tenantId: req.tenant.tenantId
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }

    // Initialize profile if it doesn't exist
    if (!user.profile) {
      user.profile = {};
    }
    
    // Add documents and save
    if (!user.profile.documents) {
      user.profile.documents = [];
    }
    user.profile.documents.push(...documents);
    
    console.log('Adding documents to user:', user.email);
    console.log('Documents to add:', documents);
    
    try {
      await user.save();
    } catch (saveError) {
      console.error('Error saving user with documents:', saveError);
      
      // If it's a validation error, try to provide more details
      if (saveError.name === 'ValidationError') {
        const validationErrors = Object.keys(saveError.errors).map(key => ({
          field: key,
          message: saveError.errors[key].message
        }));
        
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error when saving documents',
          errors: validationErrors
        });
      }
      
      throw saveError;
    }

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
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error uploading documents',
      details: error.toString()
    });
  }
});

// Get document by ID (secure endpoint with audit logging)
router.get('/members/:memberId/documents/:documentId', authenticate, authorize(['users.view', 'users.manage']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const { memberId, documentId } = req.params;
    
    // Log document access attempt for audit trail
    console.log(`[AUDIT] Document access attempt - User: ${req.user.email}, MemberId: ${memberId}, DocumentId: ${documentId}, Tenant: ${req.tenant.tenantId}, Timestamp: ${new Date().toISOString()}`);
    
    // Additional security check - verify the requesting user has appropriate permissions
    // Admins and managers can view all documents, others can only view their own
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (req.user._id.toString() !== memberId) {
        console.log(`[AUDIT] Access denied - User ${req.user.email} attempted to access documents of member ${memberId}`);
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied. You can only view your own documents.' 
        });
      }
    }
    
    // Find the user with tenant isolation
    const user = await User.findOne({
      _id: memberId,
      tenantId: req.tenant.tenantId,
      'profile.documents._id': documentId
    });
    
    if (!user) {
      console.log(`[AUDIT] Document not found - DocumentId: ${documentId}, MemberId: ${memberId}`);
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    
    // Find the specific document
    const document = user.profile.documents.id(documentId);
    
    if (!document || !document.data) {
      return res.status(404).json({ success: false, message: 'Document data not found' });
    }
    
    // Log successful document access
    console.log(`[AUDIT] Document accessed successfully - User: ${req.user.email}, Document: ${document.name}, Type: ${document.type}, Timestamp: ${new Date().toISOString()}`);
    
    // Convert Base64 back to binary
    const buffer = Buffer.from(document.data, 'base64');
    
    // Set appropriate headers
    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${document.name}"`);
    res.setHeader('Content-Length', buffer.length);
    
    // Send the file
    res.send(buffer);
  } catch (error) {
    console.error('[AUDIT] Error retrieving document:', error);
    res.status(500).json({ success: false, message: 'Error retrieving document' });
  }
});

// Delete document (with audit logging)
router.delete('/members/:memberId/documents/:documentId', authenticate, authorize(['users.manage']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const { memberId, documentId } = req.params;
    
    // Log deletion attempt
    console.log(`[AUDIT] Document deletion attempt - User: ${req.user.email}, MemberId: ${memberId}, DocumentId: ${documentId}, Tenant: ${req.tenant.tenantId}, Timestamp: ${new Date().toISOString()}`);
    
    // First find the document to log its details before deletion
    const userBeforeDelete = await User.findOne({
      _id: memberId,
      tenantId: req.tenant.tenantId,
      'profile.documents._id': documentId
    });
    
    if (userBeforeDelete) {
      const docToDelete = userBeforeDelete.profile.documents.id(documentId);
      if (docToDelete) {
        console.log(`[AUDIT] Document to be deleted - Name: ${docToDelete.name}, Type: ${docToDelete.type}, UploadedAt: ${docToDelete.uploadedAt}`);
      }
    }
    
    // Find and update the user
    const user = await User.findOneAndUpdate(
      {
        _id: memberId,
        tenantId: req.tenant.tenantId
      },
      {
        $pull: { 'profile.documents': { _id: documentId } }
      },
      { new: true }
    );
    
    if (!user) {
      console.log(`[AUDIT] Document deletion failed - Team member not found`);
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }
    
    console.log(`[AUDIT] Document deleted successfully - User: ${req.user.email}, DocumentId: ${documentId}, Timestamp: ${new Date().toISOString()}`);
    
    // Return user without password
    const userObject = user.toObject();
    delete userObject.password;
    
    res.json({ 
      success: true, 
      message: 'Document deleted successfully',
      data: userObject
    });
  } catch (error) {
    console.error('[AUDIT] Error deleting document:', error);
    res.status(500).json({ success: false, message: 'Error deleting document' });
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

// Export team members
router.get('/export', authenticate, authorize(['users.manage', 'users.view']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    
    // Fetch all team members for the tenant
    const members = await User.find({ 
      tenantId: req.tenant.tenantId 
    }).select('-password').lean();
    
    if (format === 'json') {
      res.json({
        success: true,
        data: members,
        count: members.length,
        exportedAt: new Date().toISOString()
      });
    } else if (format === 'csv') {
      // Convert to CSV format
      const csvRows = [];
      
      // Headers
      csvRows.push([
        'Name',
        'Email',
        'Phone',
        'Role',
        'Department',
        'Position',
        'Employee ID',
        'Status',
        'Hire Date',
        'Date of Birth',
        'Gender',
        'Nationality',
        'Address',
        'Emergency Contact',
        'Created At'
      ].join(','));
      
      // Data rows
      members.forEach(member => {
        const row = [
          member.name || '',
          member.email || '',
          member.phone || '',
          member.role || '',
          member.profile?.department || '',
          member.profile?.position || '',
          member.profile?.employeeId || '',
          member.isActive ? 'Active' : 'Inactive',
          member.profile?.hireDate ? new Date(member.profile.hireDate).toLocaleDateString() : '',
          member.profile?.dateOfBirth ? new Date(member.profile.dateOfBirth).toLocaleDateString() : '',
          member.profile?.gender || '',
          member.profile?.nationality || '',
          member.profile?.address ? `${member.profile.address.street || ''} ${member.profile.address.city || ''} ${member.profile.address.country || ''}`.trim() : '',
          member.profile?.emergencyContact ? `${member.profile.emergencyContact.name || ''} (${member.profile.emergencyContact.relationship || ''}) ${member.profile.emergencyContact.phone || ''}`.trim() : '',
          new Date(member.createdAt).toLocaleDateString()
        ].map(field => {
          // Escape fields that contain commas or quotes
          const fieldStr = String(field);
          if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n')) {
            return `"${fieldStr.replace(/"/g, '""')}"`;
          }
          return fieldStr;
        }).join(',');
        
        csvRows.push(row);
      });
      
      const csvContent = csvRows.join('\n');
      
      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="team-members-${Date.now()}.csv"`);
      res.send(csvContent);
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid export format. Use csv or json' 
      });
    }
  } catch (error) {
    console.error('Error exporting team members:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error exporting team members' 
    });
  }
});

module.exports = router;