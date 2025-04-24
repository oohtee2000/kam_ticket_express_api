const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'] || '';
  console.log("Authorization Header:", authHeader);

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Malformed token' });
  }

  const token = authHeader.split(' ')[1];
  console.log("Extracted Token:", token);

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded JWT:", decoded);

    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT Verification Error:", err.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
