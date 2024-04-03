function pinCodeGenerator() {
    var pinCode = '';

    // Generate the first digit (1-9)
    pinCode += Math.floor(Math.random() * 9) + 1;

    // Generate the remaining five digits
    while (pinCode.length < 6) {
        pinCode += Math.floor(Math.random() * 10); // Generate a random digit (0-9)
    }

    return pinCode;
}

// Export the pin code generator function
module.exports = pinCodeGenerator;

