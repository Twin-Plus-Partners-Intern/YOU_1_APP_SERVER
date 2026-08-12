const successResponse = (res, statusCode = 200, data = null, meta = null) => {
  const response = {
    ...(data !== null && { data }),
    ...(meta !== null && { meta }),
  };

  return res.status(statusCode).json(response);
};

const errorResponse = (
  res,
  statusCode = 500,
  message = "Internal Server Error",
  details = null
) => {
  const response = {
    success: false,
    message,
    ...(details !== null && { details }),
  };

  return res.status(statusCode).json(response);
};

module.exports = {
  successResponse,
  errorResponse,
};
