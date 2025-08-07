// Utility function to generate a random string with optional prefix and length
const generateRandomId = (prefix = '', length) => {
    const chars = '0123456789'; 
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}${result}`; 
};

// const generateRandomPassword = () => {
//     const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
//     let password = '';
//     for (let i = 0; i < 8; i++) {
//         const randomIndex = Math.floor(Math.random() * characters.length);
//         password += characters[randomIndex];
//       //  console.log(password);
//     }
//     return password;
// };

function generateRandomPassword(length = 8) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const password = Array.from({ length }, () =>
        characters[Math.floor(Math.random() * characters.length)]
    ).join('');
   // console.log(password)
    return password;
}


module.exports = { generateRandomId, generateRandomPassword };
