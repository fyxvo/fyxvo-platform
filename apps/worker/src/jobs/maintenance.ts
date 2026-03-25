import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { UserRole, type PrismaClientType } from "@fyxvo/database";
import type { WorkerLogger } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveReputationLevel(count: number): string {
  if (count >= 100_000) return "Operator";
  if (count >= 10_000) return "Architect";
  if (count >= 1_000) return "Builder";
  return "Explorer";
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
  logger: WorkerLogger
): Promise<void> {
  try {
    const threshold = Number(process.env.ERROR_RATE_ALERT_THRESHOLD ?? "10");
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
      if (rate > threshold / 100) {
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
  logger: WorkerLogger
): Promise<void> {
  try {
    const templatePath = join(__dirname, "../templates/weekly-digest.html");
    const template = readFileSync(templatePath, "utf-8");

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const pageSize = 100;
    let offset = 0;
    let generated = 0;

    for (;;) {
      const users = await prisma.user.findMany({
        select: { id: true, displayName: true },
        skip: offset,
        take: pageSize,
      });
      if (users.length === 0) break;

      for (const user of users) {
        // Check if digest already generated this week
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existing = await (prisma as any).digestRecord.findFirst({
          where: {
            userId: user.id,
            generatedAt: { gte: sevenDaysAgo },
          },
          select: { id: true },
        });
        if (existing) continue;

        // Gather stats
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userRecord = await (prisma as any).user.findUnique({
          where: { id: user.id },
          select: { reputationLevel: true },
        });
        const reputationLevel = (userRecord as { reputationLevel?: string } | null)?.reputationLevel ?? "Explorer";

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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).digestRecord.create({
          data: { userId: user.id, htmlContent: html },
        });
        generated += 1;
      }

      offset += pageSize;
      if (users.length < pageSize) break;
    }

    logger.info({ event: "worker.digests.generated", count: generated }, "Weekly digests generated");
  } catch (error) {
    logger.error(
      { event: "worker.digests.failed", error: error instanceof Error ? error.message : "Unknown error" },
      "Failed to generate weekly digests"
    );
  }
}
