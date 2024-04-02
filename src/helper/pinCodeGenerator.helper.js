function pinCodeGenerator() {
    var pinCode = '';
    for (var i = 0; i < 6; i++) {
      // Generate a random number from 0 to 9 and append it to the pinCode
      pinCode += Math.floor(Math.random() * 10);
    }
    return pinCode;
  }
  
  // Export the pin code generator function
  module.exports = pinCodeGenerator;
  