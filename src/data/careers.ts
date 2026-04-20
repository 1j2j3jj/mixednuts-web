export type Position = {
  slug: string;
  title: string;
  tags: string[];
  type: string;
  comp: string;
};

export const positions: Position[] = [
  {
    slug: "ai-implementation-engineer",
    title: "AI Implementation Engineer",
    tags: ["AI", "Python/TypeScript", "MCP"],
    type: "正社員 / 業務委託",
    comp: "年収: 800–1500万",
  },
  {
    slug: "senior-strategy-consultant",
    title: "Senior Strategy Consultant",
    tags: ["Strategy", "M&A / FP&A"],
    type: "正社員 / 業務委託",
    comp: "年収: 1000–1800万",
  },
  {
    slug: "growth-marketing-lead",
    title: "Growth Marketing Lead",
    tags: ["Marketing", "Google/Meta Ads", "CVR改善"],
    type: "正社員 / 業務委託",
    comp: "年収: 800–1400万",
  },
  {
    slug: "seo-aio-strategist",
    title: "SEO / AIO Strategist",
    tags: ["SEO", "AIO / LLMO", "構造化データ"],
    type: "業務委託",
    comp: "月額: 40–80万",
  },
  {
    slug: "prompt-engineer",
    title: "Prompt Engineer / AI Solution Designer",
    tags: ["AI", "Prompt Engineering", "評価設計"],
    type: "正社員 / 業務委託",
    comp: "年収: 700–1300万",
  },
  {
    slug: "content-strategist",
    title: "Content Strategist / SEO ライター",
    tags: ["Content", "SEO", "編集"],
    type: "業務委託",
    comp: "月額: 30–60万",
  },
  {
    slug: "uiux-designer",
    title: "UI/UX Designer (Senior)",
    tags: ["Design", "Figma", "プロトタイピング"],
    type: "業務委託",
    comp: "月額: 50–100万",
  },
  {
    slug: "project-manager",
    title: "Project Manager (Senior)",
    tags: ["Operations", "PMO"],
    type: "正社員 / 業務委託",
    comp: "年収: 700–1200万",
  },
  {
    slug: "finance-fpna-specialist",
    title: "Finance / FP&A Specialist",
    tags: ["Finance", "FP&A", "管理会計"],
    type: "業務委託",
    comp: "月額: 40–80万",
  },
];

export const CASUAL_INTERVIEW_SLUG = "casual-interview";
