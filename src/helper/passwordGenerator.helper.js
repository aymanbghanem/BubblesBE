var uuid = require('uuid');

function generateMixedID() {
  // Generate a Version 4 UUID
  var uuidValue = uuid.v4();

  // Extract the alphanumeric part from the UUID
  var alphanumericPart = uuidValue.replace(/-/g, '');

  // Add special characters to the alphanumeric part
  var specialCharacters = "!@#$&*";
  var mixedID = '';
  for (var i = 0; i < alphanumericPart.length; i++) {
    mixedID += alphanumericPart[i];
    // Randomly decide whether to add a special character or not
    if (Math.random() < 0.25 && mixedID.length < 10) {
      mixedID += specialCharacters[Math.floor(Math.random() * specialCharacters.length)];
    }
  }

  // Ensure the length of the mixedID is at most 10 characters
  return mixedID.substring(0, 10);
}

// Export the model's ID
module.exports = generateMixedID;
