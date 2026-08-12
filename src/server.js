const app = require("./app");
const env = require("./config/env");
const { sequelize } = require("./models");

const PORT = env.PORT;
const environment = env.NODE_ENV;

const hasDatabaseConfig = ["DB_NAME", "DB_USER", "DB_HOST"].every((key) =>
  Boolean(process.env[key])
);

async function connectDatabase() {
  if (!hasDatabaseConfig) {
    return "not-configured";
  }

  await sequelize.authenticate();

  if (env.NODE_ENV === "development") {
    
  } else {
    
  }

  return "connected";
}

function printStartupBanner(databaseStatus) {
  console.log("[You-il]");
  console.log(`⚙ Environment : ${environment}`);
  console.log(`🌐 Server      : http://localhost:${PORT}`);
  console.log(`🗄 Database    : ${databaseStatus === "connected" ? "Connected" : "Not configured"}`);
  console.log("✅ Status      : Server is running\n...");
}

async function startServer() {
  try {
    const databaseStatus = await connectDatabase();

    if (databaseStatus === "connected") {
      console.log("✅ PostgreSQL connection established successfully.");
    }

    app.listen(PORT, () => {
      printStartupBanner(databaseStatus);
    });
  } catch (error) {
    console.error("❌ Status      : Unable to start server");
    console.error(error);
    process.exit(1);
  }
}

startServer();
