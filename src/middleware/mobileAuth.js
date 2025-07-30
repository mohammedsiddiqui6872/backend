exports.mobileAuthenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const deviceId = req.header('X-Device-ID');
    
    if (!token || !deviceId) {
      throw new Error();
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({
      _id: decoded.id,
      'devices.deviceId': deviceId,
      isActive: true
    });
    
    if (!user) {
      throw new Error();
    }
    
    // Update last activity
    user.lastActivity = new Date();
    await user.save();
    
    req.user = user;
    req.deviceId = deviceId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate' });
  }
};