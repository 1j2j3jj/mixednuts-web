export type Service = {
  slug: "ai" | "strategy" | "marketing";
  label: string;
  tagline: string;
  description: string;
  image: string;
  capabilities: string[];
};

export const services: Service[] = [
  {
    slug: "ai",
    label: "AI Solutions",
    tagline: "AIエージェント・自動化で業務を再設計",
    description: "LLMを活用したエージェント設計、RAG構築、業務自動化。120体超のAIエージェントを運用してきた実装ノウハウを、クライアントの業務に移植する。",
    image: "/images/generated/ai_hero.jpg",
    capabilities: [
      "AIエージェント設計・実装",
      "RAG / ナレッジ検索システム構築",
      "業務プロセス自動化（BPA）",
      "AI品質評価・プロンプト最適化",
      "MCP / ツール連携アーキテクチャ",
      "AIガバナンス設計",
    ],
  },
  {
    slug: "strategy",
    label: "Strategy",
    tagline: "事業計画・投資評価・中期戦略",
    description: "戦略ファーム出身者と事業会社経営企画経験者が、経営判断の中枢で意思決定を支援。FP&A、M&A、新規事業、組織設計まで一気通貫。",
    image: "/images/generated/strategy_hero.jpg",
    capabilities: [
      "中期経営計画策定",
      "FP&A / 予実管理設計",
      "M&A 戦略・デューデリジェンス",
      "投資評価・バリュエーション",
      "新規事業立ち上げ",
      "取締役会付議資料作成支援",
    ],
  },
  {
    slug: "marketing",
    label: "Marketing",
    tagline: "グロースマーケティングと統合広告運用",
    description: "広告代理店シニアディレクターと事業会社マーケ責任者が、広告運用とグロース戦略を統合提供。LTV/CAC最適化、コホート分析、クリエイティブ戦略まで。",
    image: "/images/generated/marketing_hero.jpg",
    capabilities: [
      "広告運用（Google / Meta / TikTok）",
      "グロースマーケティング設計",
      "SEO / AIO 戦略",
      "LTV / CAC 最適化",
      "コンテンツマーケティング",
      "ブランド戦略",
    ],
  },
];
