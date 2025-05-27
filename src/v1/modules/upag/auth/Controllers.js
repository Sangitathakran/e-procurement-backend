const jwt = require('jsonwebtoken');
const { JWT_SECRET_KEY } = require('@config/index');

module.exports.generateToken = async(req,res)=>{
const payload = {
  userId: 123,
  username: 'johndoe'
};


// Options (optional): set token expiry, etc.
const options = {
  expiresIn: '24h' // token valid for 1 hour
};

// Create the token
const token = jwt.sign(payload, JWT_SECRET_KEY, options);
return res.send({token})
}

module.exports.authMiddleware = async(req, res, next) => {
    const authHeader = req.headers.authorization;
  
    // Check if header is present and has Bearer token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }
  
    const token = authHeader.split(' ')[1];
    try {
      const decoded =  jwt.verify(token, JWT_SECRET_KEY);
      req.user = decoded; // Attach decoded user to the request
      next(); // Continue to the next middleware or route handler
    } catch (err) {
      return res.status(403).json({ message: 'Forbidden: Invalid token' });
    }
  };
  
