import fs from "fs";
import path from "path";
import { promisify } from "util";
import * as reportService from "../services/reportService.js";
import ReportLog from "../models/ReportLog.js";

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

const ensureExportsDir = async () => {
  const dir = path.join(process.cwd(), "exports");
  try {
    await mkdir(dir, { recursive: true });
  } catch (e) {
    // ignore
  }
  return dir;
};

const formatISODate = (d) => {
  const dt = new Date(d);
  return dt.toISOString().replace(/[:.]/g, "-");
};

const writeCsvRows = async (rows, filepath) => {
  if (!rows || !rows.length) {
    await writeFile(filepath, "No data\n", "utf8");
    return;
  }

  const keys = Object.keys(rows[0]);
  const header = keys.join(",") + "\n";
  const lines = rows.map((r) => keys.map((k) => {
    const v = r[k] === null || r[k] === undefined ? "" : String(r[k]);
    return `"${v.replace(/"/g, '""')}"`;
  }).join(","));

  await writeFile(filepath, header + lines.join("\n"), "utf8");
};

// Generate a CSV for sales for a given date range and return filepath
export const generateSalesCsv = async ({ startDate, endDate, generatedBy = null, label = "manual" }) => {
  const filters = reportService.normalizeReportFilters({ startDate, endDate, page: 1, limit: 10000 });
  const data = await reportService.getSalesReport({ filters, user: { role: 'CEO', id: null }, exportAll: true });

  const dir = await ensureExportsDir();
  const filename = `sales-${label}-${formatISODate(startDate)}_to_${formatISODate(endDate)}.csv`;
  const filepath = path.join(dir, filename);

  await writeCsvRows(data.rows, filepath);

  await ReportLog.create({ reportType: 'sales_scheduled', generatedBy, params: { startDate, endDate, filepath, label } });
  return filepath;
};

// compute next occurrence for weekly (next Monday 00:00) and monthly (first of next month 00:00)
const nextWeekly = (ref = new Date()) => {
  const d = new Date(ref);
  d.setHours(0,0,0,0);
  const day = (d.getDay() + 6) % 7; // 0=Mon
  const daysToAdd = (7 - day) || 7; // next Monday
  d.setDate(d.getDate() + daysToAdd);
  return d;
};

const nextMonthly = (ref = new Date()) => {
  const d = new Date(ref);
  const start = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  start.setHours(0,0,0,0);
  return start;
};

// Node setTimeout only accepts delays up to ~24.8 days (2^31-1 ms).
const MAX_TIMEOUT_MS = 2_147_483_647;

const scheduleAt = (when, fn) => {
  const targetMs = when instanceof Date ? when.getTime() : Number(when);
  const ms = targetMs - Date.now();

  if (ms <= 0) {
    Promise.resolve(fn()).catch((error) => {
      console.error("Scheduled job error:", error.message);
    });
    return;
  }

  if (ms > MAX_TIMEOUT_MS) {
    return setTimeout(() => scheduleAt(when, fn), MAX_TIMEOUT_MS);
  }

  return setTimeout(() => {
    Promise.resolve(fn()).catch((error) => {
      console.error("Scheduled job error:", error.message);
    });
  }, ms);
};

export const initSchedulers = async (app) => {
  // Weekly export: generate CSV for previous week (Monday-Sunday)
  const runWeekly = async () => {
    try {
      const now = new Date();
      // previous week Monday
      const lastWeekEnd = new Date(now);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - ((lastWeekEnd.getDay() + 6) % 7) - 1); // Sunday
      lastWeekEnd.setHours(23,59,59,999);
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekStart.getDate() - 6);
      lastWeekStart.setHours(0,0,0,0);

      const filepath = await generateSalesCsv({ startDate: lastWeekStart.toISOString(), endDate: lastWeekEnd.toISOString(), generatedBy: null, label: 'weekly' });
      console.log('Weekly sales CSV generated:', filepath);
    } catch (e) {
      console.error('Weekly job failed:', e.message);
    }
    // schedule next weekly run
    const next = nextWeekly(new Date());
    scheduleAt(next, runWeekly);
  };

  // Monthly export: previous calendar month
  const runMonthly = async () => {
    try {
      const now = new Date();
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23,59,59,999); // last day previous month
      const start = new Date(end.getFullYear(), end.getMonth(), 1, 0,0,0,0);

      const filepath = await generateSalesCsv({ startDate: start.toISOString(), endDate: end.toISOString(), generatedBy: null, label: 'monthly' });
      console.log('Monthly sales CSV generated:', filepath);
    } catch (e) {
      console.error('Monthly job failed:', e.message);
    }

    // schedule next monthly run
    const next = nextMonthly(new Date());
    scheduleAt(next, runMonthly);
  };

  // start initial schedules
  try {
    const firstWeekly = nextWeekly(new Date());
    scheduleAt(firstWeekly, runWeekly);

    const firstMonthly = nextMonthly(new Date());
    scheduleAt(firstMonthly, runMonthly);

    console.log('Schedulers initialized. Next weekly:', firstWeekly, 'Next monthly:', firstMonthly);
  } catch (e) {
    console.error('Failed to initialize schedulers', e.message);
  }
};

export default { initSchedulers };
