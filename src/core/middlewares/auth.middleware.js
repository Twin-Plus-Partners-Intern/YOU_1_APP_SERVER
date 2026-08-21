const jwt = require("jsonwebtoken");

const env = require("../../config/env");
const { errorResponse } = require("../utils/response");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse(res, 401, "Access denied. No token provided.");
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, env.JWT_SECRET);

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return errorResponse(res, 401, "Token expired");
    }

    if (error.name === "JsonWebTokenError") {
      return errorResponse(res, 401, "Invalid token");
    }

    return errorResponse(res, 500, "Authentication failed");
  }
};

module.exports = { authenticate };
