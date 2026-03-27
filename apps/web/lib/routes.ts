export interface RouteDefinition {
  readonly href: string;
  readonly label: string;
  readonly description?: string;
}

export const marketingPrimaryRoutes: readonly RouteDefinition[] = [
  {
    href: "/docs",
    label: "Docs",
    description: "Quickstart, integration flow, and operational guidance",
  },
  {
    href: "/pricing",
    label: "Pricing",
    description: "Relay costs, funding model, and usage assumptions",
  },
  {
    href: "/status",
    label: "Status",
    description: "Live health, latency, and protocol readiness",
  },
  {
    href: "/support",
    label: "Support",
    description: "FAQ, troubleshooting, and direct help",
  },
  {
    href: "/enterprise",
    label: "Enterprise",
    description: "Dedicated capacity, rollout support, and team features",
  },
] as const;

export const marketingSecondaryRoutes: readonly RouteDefinition[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Workspace, project activation, and launch control",
  },
  {
    href: "/playground",
    label: "Playground",
    description: "Live relay calls, recipes, and request debugging",
  },
  {
    href: "/assistant",
    label: "Assistant",
    description: "Project-aware product and debugging help",
  },
  {
    href: "/contact",
    label: "Contact",
    description: "Founder access, launch conversations, and product feedback",
  },
] as const;

export const footerRouteGroups: readonly {
  readonly title: string;
  readonly links: readonly RouteDefinition[];
}[] = [
  {
    title: "Platform",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/projects", label: "Projects" },
      { href: "/api-keys", label: "API keys" },
      { href: "/funding", label: "Funding" },
      { href: "/analytics", label: "Analytics" },
      { href: "/assistant", label: "Assistant" },
    ],
  },
  {
    title: "Build",
    links: [
      { href: "/docs", label: "Docs" },
      { href: "/playground", label: "Playground" },
      { href: "/pricing", label: "Pricing" },
      { href: "/compare", label: "Compare" },
      { href: "/explore", label: "Explore" },
      { href: "/operators", label: "Operators" },
    ],
  },
  {
    title: "Operate",
    links: [
      { href: "/status", label: "Status" },
      { href: "/alerts", label: "Alerts" },
      { href: "/transactions", label: "Transactions" },
      { href: "/updates", label: "Updates" },
      { href: "/changelog", label: "Changelog" },
      { href: "/support", label: "Support" },
    ],
  },
  {
    title: "Trust",
    links: [
      { href: "/security", label: "Security" },
      { href: "/reliability", label: "Reliability" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/cookies", label: "Cookies" },
      { href: "/contact", label: "Contact" },
    ],
  },
] as const;

export const commandPaletteRoutes: readonly RouteDefinition[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Overview, launch guidance, and operational timelines",
  },
  {
    href: "/projects",
    label: "Projects",
    description: "Manage, switch, and launch project workspaces",
  },
  {
    href: "/api-keys",
    label: "API Keys",
    description: "Issue and revoke scoped credentials",
  },
  {
    href: "/funding",
    label: "Funding",
    description: "Top up treasury balance and review runway",
  },
  {
    href: "/analytics",
    label: "Analytics",
    description: "Traffic, latency, and error rate visibility",
  },
  {
    href: "/operators",
    label: "Operators",
    description: "Node behavior and infrastructure visibility",
  },
  {
    href: "/playground",
    label: "Playground",
    description: "Test relay calls and save recipes",
  },
  {
    href: "/assistant",
    label: "Assistant",
    description: "Project-aware help, examples, and debugging",
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Security, team, and workspace configuration",
  },
  {
    href: "/docs",
    label: "Docs",
    description: "Quickstart, API reference, and guides",
  },
  {
    href: "/status",
    label: "Status",
    description: "Live service health and protocol readiness",
  },
  {
    href: "/pricing",
    label: "Pricing",
    description: "Relay costs and funding mechanics",
  },
  {
    href: "/enterprise",
    label: "Enterprise",
    description: "Dedicated capacity, SLAs, and rollout support",
  },
  {
    href: "/support",
    label: "Support",
    description: "FAQ, troubleshooting, and team help",
  },
  {
    href: "/contact",
    label: "Contact",
    description: "Founder access and product feedback",
  },
] as const;

const marketingRoutes = new Set<string>([
  "/",
  "/pricing",
  "/docs",
  "/status",
  "/contact",
  "/enterprise",
  "/updates",
  "/changelog",
  "/leaderboard",
  "/explore",
  "/compare",
  "/operators",
  "/security",
  "/reliability",
  "/privacy",
  "/terms",
  "/cookies",
  "/support",
]);

const marketingRoutePrefixes = ["/p/", "/invite/", "/join/", "/verify-email", "/widget/project/"] as const;

export function isMarketingRoute(pathname: string) {
  if (marketingRoutes.has(pathname)) {
    return true;
  }

  return marketingRoutePrefixes.some((prefix) => pathname.startsWith(prefix));
}
