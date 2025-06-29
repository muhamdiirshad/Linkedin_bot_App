const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // You can access req.user in routes
      next();
    } catch (error) {
      return res.status(401).json({ message: "Token is invalid or expired" });
    }
  } else {
    return res.status(401).json({ message: "No token, authorization denied" });
  }
};

module.exports = protect;
