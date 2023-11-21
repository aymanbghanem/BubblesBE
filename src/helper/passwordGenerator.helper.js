var uuid = require('uuid');

function generateMixedID() {
  // Generate a Version 4 UUID
  var uuidValue = uuid.v4();

  // Extract the alphanumeric part from the UUID
  var alphanumericPart = uuidValue.replace(/-/g, '').substring(0, 6);

  return alphanumericPart;
}



// Export the model's ID
module.exports = generateMixedID;
