const { errorResponse } = require("../utils/response");

const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((detail) => detail.message);
      return errorResponse(res, 400, "Validation error", { errors: messages });
    }

    req[source] = value;
    return next();
  };
};

module.exports = { validate };
