const { errorResponse } = require("../utils/response");

class AppError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

const errorHandler = (error, req, res, next) => {
  if (error instanceof AppError) {
    return errorResponse(res, error.statusCode, error.message, error.details);
  }

  if (process.env.NODE_ENV !== "test") {
    console.error(error);
  }

  return errorResponse(res, 500, error.message || "Internal server error");
};

module.exports = {
  AppError,
  errorHandler,
};
