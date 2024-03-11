const basicAuth = require('express-basic-auth');

const users = {
  'digital_feedback': '61a5da94-5839-46c8-80d8-2fe737d95538',
};

const basicAuthentication = basicAuth({
  users: users,
  challenge: true,
  unauthorizedResponse: getUnauthorizedResponse,
});

function getUnauthorizedResponse(req,res) {
  return req.auth ? "User authentication failed. Please check your credentials.": 'No credentials provided';
}

module.exports = basicAuthentication;
