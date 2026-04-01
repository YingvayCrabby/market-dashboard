import type { Express } from "express";
import type { Server } from "http";
import { computeDashboardData } from "./marketEngine";

export async function registerRoutes(server: Server, app: Express) {
  app.get("/api/dashboard", async (_req, res) => {
    try {
      const data = await computeDashboardData();
      res.json(data);
    } catch (error: any) {
      console.error("Dashboard data error:", error);
      res.status(500).json({ error: error.message });
    }
  });
}
