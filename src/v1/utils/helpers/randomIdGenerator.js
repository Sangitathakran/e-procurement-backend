// Utility function to generate a random string with optional prefix and length
const generateRandomId = (prefix = '', length) => {
    const chars = '0123456789'; 
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}${result}`; 
};

module.exports = { generateRandomId };
