module.exports = {
  clickjacking: {
    xFrameOptions: 'DENY',
    frameAncestors: ['none']
  },

  csp: {
    directives: {
      "default-src": ["'self'"],
      "base-uri": ["'self'"],
      "font-src": ["'self'", "https:", "data:"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'none'"], 
      "img-src": ["'self'", "data:"],
      "object-src": ["'none'"],
      "script-src": ["'self'"],
      "script-src-attr": ["'none'"],
      "style-src": ["'self'"],
      "upgrade-insecure-requests": []
    }
  },

  helmet: {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        "default-src": ["'self'"],
        "base-uri": ["'self'"],
        "font-src": ["'self'", "https:", "data:"],
        "form-action": ["'self'"],
        "frame-ancestors": ["'none'"],
        "img-src": ["'self'", "data:"],
        "object-src": ["'none'"],
        "script-src": ["'self'"],
        "script-src-attr": ["'none'"],
        "style-src": ["'self'"],
        "upgrade-insecure-requests": []
      }
    },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "no-referrer" },
    dnsPrefetchControl: { allow: false },
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    hidePoweredBy: true,
    frameguard: { action: 'deny' }
  },

  headers: {
    xContentTypeOptions: 'nosniff',
    xXSSProtection: '1; mode=block',
    strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
    permissionsPolicy: 'geolocation=(), microphone=(), camera=()',
    referrerPolicy: 'strict-origin-when-cross-origin'
  },

  sensitiveRoutes: ['/auth', '/admin', '/api'],

  rateLimit: {
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: false,
    legacyHeaders: true
  },

  cors: {
    origin: "*", 
    methods: ["POST", "GET", "PUT", "DELETE", "OPTIONS", "PATCH"],
    credentials: true
  }
};
