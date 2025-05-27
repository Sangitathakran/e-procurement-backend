const jwt = require('jsonwebtoken');
const { JWT_SECRET_KEY } = require('@config/index');
const { MasterUser } = require('@src/v1/models/master/MasterUser');
const bcrypt = require('bcryptjs');

module.exports.registerUser = async (req, res) => {
  try {
    const { firstName, email, password } = req.body;

    if (!firstName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await MasterUser.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new MasterUser({
      firstName,
      email,
      password: hashedPassword
    });

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });

  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
module.exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const user = await MasterUser.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const payload = {
      userId: user._id,
      email: user.email,
      username: user.username,
    };

    const token = jwt.sign(payload, JWT_SECRET_KEY, { expiresIn: '24h' });

    return res.status(200).json({ token });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};
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
  
