import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  COMPUTE_HEAVY_METHODS,
  PRICING_LAMPORTS,
  WRITE_METHODS,
  isEmailDeliveryEnabled,
  sendTransactionalEmail,
  type WorkerEnv,
} from "@fyxvo/config";
import { UserRole, type PrismaClientType } from "@fyxvo/database";
import type { WorkerLogger } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveReputationLevel(count: number): string {
  if (count >= 100_000) return "Operator";
  if (count >= 10_000) return "Architect";
  if (count >= 1_000) return "Builder";
  return "Explorer";
}

function startOfUtcDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function startOfUtcMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function parseLoggedRouteMethods(route: string | null | undefined): string[] {
  if (!route) return [];
  const rpcMatch = route.match(/(?:^|\/)(rpc|priority)\/([^/?]+)/i);
  if (rpcMatch?.[2]) return [rpcMatch[2]];
  const methodMatch = route.match(/method=([^&]+)/i);
  if (methodMatch?.[1]) {
    return methodMatch[1]
      .split(",")
      .map((value) => decodeURIComponent(value).trim())
      .filter(Boolean);
  }
  return [];
}

function requestPriceLamports(route: string | null | undefined, mode: "standard" | "priority" | null | undefined): number {
  if (mode === "priority") return PRICING_LAMPORTS.priority;
  const methods = parseLoggedRouteMethods(route);
  const maxLamports = methods.reduce((currentMax, method) => {
    if (WRITE_METHODS.has(method)) return Math.max(currentMax, PRICING_LAMPORTS.standard * 4);
    if (COMPUTE_HEAVY_METHODS.has(method)) return Math.max(currentMax, PRICING_LAMPORTS.computeHeavy);
    return Math.max(currentMax, PRICING_LAMPORTS.standard);
  }, 0);
  return maxLamports || PRICING_LAMPORTS.standard;
}

export async function updateReputations(
  prisma: PrismaClientType,
  logger: WorkerLogger
): Promise<void> {
  try {
    const users = await prisma.user.findMany({ select: { id: true } });
    for (const user of users) {
      const count = await prisma.requestLog.count({
        where: { project: { ownerId: user.id } },
      });
      const level = resolveReputationLevel(count);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).user.update({
        where: { id: user.id },
        data: { reputationLevel: level },
      });
    }
    logger.info({ event: "worker.reputations.updated", count: users.length }, "Developer reputations updated");
  } catch (error) {
    logger.error(
      { event: "worker.reputations.failed", error: error instanceof Error ? error.message : "Unknown error" },
      "Failed to update developer reputations"
    );
  }
}

export async function checkErrorRates(
  prisma: PrismaClientType,
  logger: WorkerLogger,
  thresholdPercent: number
): Promise<void> {
  try {
    const since = new Date(Date.now() - 5 * 60 * 1000);

    const recentRequests = await prisma.requestLog.findMany({
      where: { createdAt: { gte: since } },
      select: { projectId: true, statusCode: true },
    });

    if (recentRequests.length === 0) return;

    // Group by projectId
    const byProject = new Map<string, { total: number; errors: number }>();
    for (const req of recentRequests) {
      const pid = req.projectId ?? "__none__";
      const existing = byProject.get(pid) ?? { total: 0, errors: 0 };
      existing.total += 1;
      if (req.statusCode >= 400) existing.errors += 1;
      byProject.set(pid, existing);
    }

    // Per-project alerts
    for (const [projectId, counts] of byProject.entries()) {
      if (projectId === "__none__") continue;
      const rate = counts.total > 0 ? counts.errors / counts.total : 0;
      if (rate > thresholdPercent / 100) {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { ownerId: true, name: true },
        });
        if (project) {
          await prisma.notification.create({
            data: {
              userId: project.ownerId,
              title: "High Error Rate Detected",
              message: `Project "${project.name}" error rate is ${(rate * 100).toFixed(1)}% in the last 5 minutes`,
              type: "alert",
            },
          });
        }
      }
    }

    // Network-wide check
    const totalAll = recentRequests.length;
    const errorsAll = recentRequests.filter((r) => r.statusCode >= 400).length;
    const globalRate = totalAll > 0 ? errorsAll / totalAll : 0;
    if (globalRate > 0.05) {
      const admins = await prisma.user.findMany({
        where: { role: { in: [UserRole.ADMIN, UserRole.OWNER] } },
        select: { id: true },
      });
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: "Network-Wide High Error Rate",
            message: `Global error rate is ${(globalRate * 100).toFixed(1)}% in the last 5 minutes`,
            type: "alert",
          },
        });
      }
    }

    logger.info({ event: "worker.error_rates.checked", projects: byProject.size, globalRate }, "Error rate check completed");
  } catch (error) {
    logger.error(
      { event: "worker.error_rates.failed", error: error instanceof Error ? error.message : "Unknown error" },
      "Failed to check error rates"
    );
  }
}

export async function checkBudgetThresholds(
  prisma: PrismaClientType,
  logger: WorkerLogger
): Promise<void> {
  try {
    const [dailyStart, monthlyStart] = [startOfUtcDay(), startOfUtcMonth()];
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { dailyBudgetLamports: { not: null } },
          { monthlyBudgetLamports: { not: null } },
        ],
      },
      select: {
        id: true,
        name: true,
        ownerId: true,
        dailyBudgetLamports: true,
        monthlyBudgetLamports: true,
        budgetWarningThresholdPct: true,
      },
    });

    for (const project of projects) {
      const warningThresholdPct = project.budgetWarningThresholdPct ?? 80;
      const [dailyRows, monthlyRows] = await Promise.all([
        prisma.requestLog.findMany({
          where: { projectId: project.id, simulated: false, createdAt: { gte: dailyStart } },
          select: { route: true, mode: true },
        }),
        prisma.requestLog.findMany({
          where: { projectId: project.id, simulated: false, createdAt: { gte: monthlyStart } },
          select: { route: true, mode: true },
        }),
      ]);

      const dailySpendLamports = dailyRows.reduce(
        (sum, row) => sum + requestPriceLamports(row.route, row.mode === "priority" ? "priority" : "standard"),
        0,
      );
      const monthlySpendLamports = monthlyRows.reduce(
        (sum, row) => sum + requestPriceLamports(row.route, row.mode === "priority" ? "priority" : "standard"),
        0,
      );

      const checks = [
        {
          scope: "daily",
          title: `Daily budget threshold reached · ${dailyStart.toISOString().slice(0, 10)}`,
          since: dailyStart,
          spendLamports: dailySpendLamports,
          budgetLamports: project.dailyBudgetLamports ? Number(project.dailyBudgetLamports) : null,
        },
        {
          scope: "monthly",
          title: `Monthly budget threshold reached · ${monthlyStart.toISOString().slice(0, 7)}`,
          since: monthlyStart,
          spendLamports: monthlySpendLamports,
          budgetLamports: project.monthlyBudgetLamports ? Number(project.monthlyBudgetLamports) : null,
        },
      ] as const;

      for (const check of checks) {
        if (!check.budgetLamports || check.budgetLamports <= 0) continue;
        const usagePct = (check.spendLamports / check.budgetLamports) * 100;
        if (usagePct < warningThresholdPct) continue;

        const existing = await prisma.notification.findFirst({
          where: {
            userId: project.ownerId,
            projectId: project.id,
            title: check.title,
            createdAt: { gte: check.since },
          },
          select: { id: true },
        });
        if (existing) continue;

        await prisma.notification.create({
          data: {
            userId: project.ownerId,
            projectId: project.id,
            type: "alert",
            title: check.title,
            message: `${project.name} has used ${usagePct.toFixed(1)}% of its ${check.scope} budget (${check.spendLamports.toLocaleString()} / ${check.budgetLamports.toLocaleString()} lamports).`,
            metadata: {
              budgetScope: check.scope,
              warningThresholdPct,
              spendLamports: check.spendLamports,
              budgetLamports: check.budgetLamports,
            },
          },
        });
      }
    }

    logger.info({ event: "worker.budget_thresholds.checked", projects: projects.length }, "Budget threshold check completed");
  } catch (error) {
    logger.error(
      { event: "worker.budget_thresholds.failed", error: error instanceof Error ? error.message : "Unknown error" },
      "Failed to check budget thresholds"
    );
  }
}

function renderDigestTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return Object.entries(vars).reduce(
    (html, [key, value]) => html.replaceAll(`{{${key}}}`, value),
    template
  );
}

export async function generateWeeklyDigests(
  prisma: PrismaClientType,
  env: WorkerEnv,
  logger: WorkerLogger
): Promise<void> {
  try {
    const templatePath = join(__dirname, "../templates/weekly-digest.html");
    const template = readFileSync(templatePath, "utf-8");

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    let generated = 0;
    const deliverEmail = isEmailDeliveryEnabled({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schedules = await (prisma as any).digestSchedule.findMany({
      where: {
        nextSendAt: { lte: new Date() },
        user: {
          email: { not: null },
          emailVerified: true,
          notifyWeeklySummary: true,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            reputationLevel: true,
          },
        },
      },
      take: 250,
    }) as Array<{
      id: string;
      userId: string;
      user: {
        id: string;
        displayName: string;
        email: string;
        reputationLevel?: string | null;
      };
    }>;

    for (const schedule of schedules) {
      const user = schedule.user;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existing = await (prisma as any).digestRecord.findFirst({
        where: {
          userId: user.id,
          generatedAt: { gte: sevenDaysAgo },
        },
        select: { id: true },
      });
      if (existing) continue;

      const [totalRequests, successCount, topProjectRows] = await Promise.all([
        prisma.requestLog.count({
          where: { project: { ownerId: user.id }, createdAt: { gte: sevenDaysAgo } },
        }),
        prisma.requestLog.count({
          where: { project: { ownerId: user.id }, createdAt: { gte: sevenDaysAgo }, statusCode: { lt: 400 } },
        }),
        prisma.project.findMany({
          where: { ownerId: user.id },
          select: { id: true, name: true, _count: { select: { requestLogs: true } } },
          orderBy: { requestLogs: { _count: "desc" } },
          take: 3,
        }),
      ]);

      const successRate = totalRequests > 0 ? Math.round((successCount / totalRequests) * 100) : 100;
      const reputationLevel = user.reputationLevel ?? "Explorer";

      const topProjectsHtml = topProjectRows.length > 0
        ? topProjectRows.map((p) =>
            `<tr><td style="padding:8px 12px;font-size:14px;color:#e2e8f0;">${p.name}</td>` +
            `<td style="padding:8px 12px;font-size:14px;color:#7c3aed;text-align:right;">${p._count.requestLogs} reqs</td></tr>`
          ).join("")
        : `<tr><td colspan="2" style="padding:8px 12px;font-size:14px;color:#64748b;">No projects yet.</td></tr>`;

      const topProjectsTable =
        `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" ` +
        `style="background-color:#0f1117;border-radius:8px;border:1px solid #2d3148;">` +
        `${topProjectsHtml}</table>`;

      const html = renderDigestTemplate(template, {
        userName: user.displayName,
        totalRequests: String(totalRequests),
        successRate: String(successRate),
        topProjects: topProjectsTable,
        networkStatus: "Operational",
        reputationLevel,
        unsubscribeUrl: `https://www.fyxvo.com/unsubscribe?userId=${user.id}`,
      });

      let sent = false;
      if (deliverEmail) {
        try {
          await sendTransactionalEmail(
            {
              apiKey: env.RESEND_API_KEY,
              from: env.EMAIL_FROM,
              replyTo: env.EMAIL_REPLY_TO,
              baseUrl: env.EMAIL_DELIVERY_BASE_URL,
            },
            {
              to: user.email,
              subject: "Your Fyxvo weekly digest",
              html,
              text: `Fyxvo weekly digest for ${user.displayName}. Total requests: ${totalRequests}. Success rate: ${successRate}%.`,
            }
          );
          sent = true;
        } catch (error) {
          logger.error(
            { event: "worker.digest.email_failed", userId: user.id, error: error instanceof Error ? error.message : "Unknown error" },
            "Failed to send weekly digest email"
          );
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).digestRecord.create({
        data: { userId: user.id, htmlContent: html, sent },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).digestSchedule.update({
        where: { id: schedule.id },
        data: {
          lastSentAt: new Date(),
          nextSendAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        },
      });
      generated += 1;
    }

    logger.info({ event: "worker.digests.generated", count: generated }, "Weekly digests generated");
  } catch (error) {
    logger.error(
      { event: "worker.digests.failed", error: error instanceof Error ? error.message : "Unknown error" },
      "Failed to generate weekly digests"
    );
  }
}
