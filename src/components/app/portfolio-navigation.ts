export const PORTFOLIO_VIEWS = ["dashboard", "kanban", "timeline", "calendar", "list", "templates"] as const;

export type PortfolioView = (typeof PORTFOLIO_VIEWS)[number];

export function isPortfolioView(value: unknown): value is PortfolioView {
  return typeof value === "string" && PORTFOLIO_VIEWS.includes(value as PortfolioView);
}
