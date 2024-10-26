function generateUserId() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const getRandomLetters = () => {
        let result = '';
        for (let i = 0; i < 3; i++) {
            result += letters.charAt(Math.floor(Math.random() * letters.length));
        }
        return result;
    };
  
    const getRandomNumbers = () => {
        return Math.floor(1000 + Math.random() * 9000).toString();
    };
  
    return getRandomLetters() + getRandomNumbers();
  }

  module.exports = generateUserId