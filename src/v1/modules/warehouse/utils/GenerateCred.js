const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


const generateApiKey = () => crypto.randomBytes(20).toString("hex");
const generateApiSecret = async () => {
    const secret = crypto.randomBytes(32).toString("hex");
    const salt = await bcrypt.genSalt(10);
    return { secret, hashedSecret: await bcrypt.hash(secret, salt) };
};

const generateJwtToken = (client) => {
    return jwt.sign(
        { clientId: client._id, role: client.role }, 
        process.env.JWT_SECRET, 
        { expiresIn: "1h" }
    );
};

const verifyJwtToken = (req, res, next) => {
    const token = req.headers["authorization"];
    if (!token) return res.status(403).send("Access Denied");

    jwt.verify(token.split(" ")[1], process.env.JWT_SECRET, (err, client) => {
        if (err) return res.status(403).send("Invalid Token");
        req.client = client;
        next();
    });
};

module.exports = { generateApiKey, generateApiSecret, generateJwtToken, verifyJwtToken };
