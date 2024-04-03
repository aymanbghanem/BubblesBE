function pinCodeGenerator() {
    var pinCode = '';

    // Generate digits until the PIN code reaches 6 digits
    while (pinCode.length < 6) {
        pinCode += Math.floor(Math.random() * 10); // Generate a random digit (0-9)
    }

    return pinCode;
}

// Export the pin code generator function
module.exports = pinCodeGenerator;
