require("dotenv").config({ quiet: true });

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined) {
    return defaultValue;
  }

  return value === "true";
};

const sharedConfig = {
  dialect: process.env.DB_DIALECT || "postgres",
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 5432,
  logging: parseBoolean(process.env.DB_LOGGING, false) ? console.log : false,
};

module.exports = {
  development: {
    username: process.env.DB_USER || "",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "",
    ...sharedConfig,
  },
  test: {
    username: process.env.DB_USER || "",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "",
    ...sharedConfig,
  },
  production: {
    username: process.env.DB_USER || "",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "",
    ...sharedConfig,
  },
};
