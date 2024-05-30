const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET_KEY;

const verifyToken = (request, h) => {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const response = h.response({
      status: 'fail',
      message: 'Missing or invalid authorization header',
    });
    response.code(401);
    return response.takeover();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    request.auth = decoded;
    return h.continue;
  } catch (error) {
    const response = h.response({
      status: 'fail',
      message: 'Invalid token',
    });
    response.code(401);
    return response.takeover();
  }
};

module.exports = { verifyToken };