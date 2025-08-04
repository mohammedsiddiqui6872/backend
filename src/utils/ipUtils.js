// Get client IP address from request
function getClientIp(req) {
  // Check for various headers used by proxies
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for may contain multiple IPs, get the first one
    return forwarded.split(',')[0].trim();
  }
  
  // Cloudflare
  if (req.headers['cf-connecting-ip']) {
    return req.headers['cf-connecting-ip'];
  }
  
  // Nginx proxy
  if (req.headers['x-real-ip']) {
    return req.headers['x-real-ip'];
  }
  
  // Standard remote address
  return req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         req.ip || 
         '127.0.0.1';
}

module.exports = {
  getClientIp
};