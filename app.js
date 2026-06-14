import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import flash from "connect-flash";
import pool, { testConnection } from "./config/db.js";
import sessionConfig from "./config/session.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import salesRoutes from "./routes/salesRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import setupRoutes from "./routes/setupRoute.js";
import { setAuthLocals } from "./middleware/authMiddleware.js";
import { showLanding } from "./controllers/landingController.js";
import { showDashboard } from "./controllers/dashboardController.js";
import reportsRoutes from "./routes/reportsRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import scheduler from "./jobs/scheduler.js";
import { runMigrations } from "./database/migrations.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("trust proxy", 1);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.locals.formatCurrencyUGX = (value) => {
  const number = Number(String(value).replace(/,/g, "")) || 0;
  return number.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session(sessionConfig));
app.use(flash());
app.use(setAuthLocals);

app.use("/api/setup", setupRoutes);
app.use("/auth", authRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/products", productRoutes);
app.use("/sales", salesRoutes);
app.use("/activity", activityRoutes);
app.use("/customers", customerRoutes);
app.use("/users", userRoutes);
app.use("/reports", reportsRoutes);
app.use("/analytics", analyticsRoutes);
app.get("/", async (req, res) => {
  if (req.session.user) {
    return showDashboard(req, res);
  }

  return showLanding(req, res);
});

app.use("/", dashboardRoutes);

app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS current_time");
    res.status(200).json({
      message: "Database connection is working",
      currentTime: result.rows[0].current_time,
    });
  } catch (error) {
    res.status(500).json({
      message: "Database connection failed",
      error: error.message,
    });
  }
});

const startServer = async () => {
  try {
    await testConnection();
    await runMigrations(pool);

    const server = app.listen(PORT, async () => {
      console.log(`Server is running on port ${PORT}`);
      try {
        // initialize scheduled exports in background
        await scheduler.initSchedulers(app);
      } catch (e) {
        console.error('Scheduler init failed:', e.message);
      }
    });

    return server;
  } catch {
    process.exit(1);
  }
};

startServer();
