const securityConfig = require('@config/security');

const securityMiddleware = (req, res, next) => {
  try {
    res.setHeader('X-Frame-Options', securityConfig.clickjacking.xFrameOptions);
    res.setHeader('X-Content-Type-Options', securityConfig.headers.xContentTypeOptions);
    res.setHeader('X-XSS-Protection', securityConfig.headers.xXSSProtection);
    res.setHeader('Strict-Transport-Security', securityConfig.headers.strictTransportSecurity);
    res.setHeader('Permissions-Policy', securityConfig.headers.permissionsPolicy);
    res.setHeader('Referrer-Policy', securityConfig.headers.referrerPolicy);
    const isSensitiveRoute = securityConfig.sensitiveRoutes.some(route => 
      req.path.includes(route)
    );
    
    if (isSensitiveRoute) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    next();
  } catch (error) {
    console.error('Security middleware error:', error);
    next();
  }
};

module.exports = securityMiddleware;
