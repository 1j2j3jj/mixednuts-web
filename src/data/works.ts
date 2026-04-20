export type Work = {
  slug: string;
  title: string;
  client: string;
  industry: string;
  services: ("ai" | "strategy" | "marketing")[];
  metric: { label: string; value: string }[];
  summary: string;
  featured?: boolean;
  image: string;
};

export const works: Work[] = [
  {
    slug: "fpna-ai-automation",
    title: "FP&A × AI 自動化 — 月次締め工数 70% 削減",
    client: "国内大手IT企業 ライブストリーミング事業",
    industry: "エンターテインメント／ライブストリーミング",
    services: ["ai", "strategy"],
    metric: [
      { label: "月次締め工数", value: "-70%" },
      { label: "予実精度", value: "+25pt" },
      { label: "更新頻度", value: "D+1" },
    ],
    summary: "AIエージェントとFP&Aプロセス再設計を組み合わせ、経営管理業務の基盤を刷新。取締役会付議資料の作成リードタイムを月次締めから当日レベルまで短縮。",
    featured: true,
    image: "/images/generated/strategy_hero.jpg",
  },
  {
    slug: "ads-campaign-restructure",
    title: "広告運用再構築で ROAS 170% 改善",
    client: "国内大手住宅メーカー 販促子会社",
    industry: "住宅／D2C EC",
    services: ["marketing"],
    metric: [
      { label: "ROAS", value: "+170%" },
      { label: "CPA", value: "-45%" },
      { label: "CV件数", value: "+2.1x" },
    ],
    summary: "Google Ads / Meta Ads のキャンペーン構造を全面再設計。検索語句分析と入札戦略の最適化で、年間広告費の投資効率を大幅に改善。",
    image: "/images/generated/marketing_hero.jpg",
  },
  {
    slug: "ai-agent-rag",
    title: "社内ナレッジRAG導入で問い合わせ対応 40% 自動化",
    client: "国内大手デジタル広告代理店",
    industry: "広告・マーケティング",
    services: ["ai"],
    metric: [
      { label: "自動回答率", value: "40%" },
      { label: "初動時間", value: "-85%" },
      { label: "CSAT", value: "+12pt" },
    ],
    summary: "社内の膨大なナレッジベースを対象にRAGシステムを構築。ベクトル検索 + LLM の組み合わせで、営業・運用チームの問い合わせ対応を大幅に効率化。",
    image: "/images/generated/ai_hero.jpg",
  },
  {
    slug: "ma-dd-valuation",
    title: "M&A案件のバリュエーション・DD支援",
    client: "国内中堅事業会社",
    industry: "事業投資／M&A",
    services: ["strategy"],
    metric: [
      { label: "案件評価期間", value: "6週間" },
      { label: "シナリオ感応度", value: "3軸×5段階" },
      { label: "Deal Close", value: "成約" },
    ],
    summary: "対象企業のDCF・マルチプル・フットボールチャート作成、財務/事業/法務DD、リスクマトリクスまで一気通貫で支援。投資意思決定の根拠を強化。",
    image: "/images/generated/strategy_hero.jpg",
  },
  {
    slug: "saas-growth-playbook",
    title: "B2B SaaS のグロースプレイブック策定",
    client: "国内B2B SaaS スタートアップ",
    industry: "SaaS",
    services: ["marketing", "strategy"],
    metric: [
      { label: "MQL", value: "+3.2x" },
      { label: "CAC Payback", value: "8ヶ月" },
      { label: "Net Revenue Retention", value: "118%" },
    ],
    summary: "ICP再定義、アウトバウンド／インバウンド設計、コンテンツマーケ、プライシング改定、カスタマーサクセス設計を統合プレイブック化。",
    image: "/images/generated/marketing_hero.jpg",
  },
  {
    slug: "ai-first-org-design",
    title: "AI-First組織設計コンサルティング",
    client: "国内大手メーカー",
    industry: "製造業",
    services: ["ai", "strategy"],
    metric: [
      { label: "対象部門", value: "8部門" },
      { label: "自動化ユースケース", value: "42件" },
      { label: "年間工数削減", value: "-12,000h" },
    ],
    summary: "全社的なAI活用戦略の策定から、エージェント設計、ガバナンス、評価指標の定義まで。経営層のAIリテラシー醸成も並行実施。",
    image: "/images/generated/ai_hero.jpg",
  },
  {
    slug: "seo-aio-strategy",
    title: "AI Overviews対応 SEO/AIO 戦略",
    client: "国内大手メディア",
    industry: "メディア",
    services: ["marketing"],
    metric: [
      { label: "AI Overviews引用率", value: "+340%" },
      { label: "オーガニック流入", value: "+55%" },
      { label: "コンテンツ制作効率", value: "+3.0x" },
    ],
    summary: "Google AI Overviews対応の構造化データ実装、E-E-A-T強化、LLMO対策を包括的に実行。検索経由トラフィックの回復に寄与。",
    image: "/images/generated/marketing_hero.jpg",
  },
  {
    slug: "board-pack-automation",
    title: "取締役会レポート自動化 / Board Pack",
    client: "国内大手エンターテインメント事業",
    industry: "エンターテインメント",
    services: ["ai", "strategy"],
    metric: [
      { label: "作成工数", value: "-80%" },
      { label: "更新頻度", value: "週次" },
      { label: "データソース", value: "12統合" },
    ],
    summary: "取締役会付議資料・経営ダッシュボードの作成を自動化。財務・運用・KPIデータを統合し、コメンタリー自動生成まで実現。",
    image: "/images/generated/ai_hero.jpg",
  },
  {
    slug: "d2c-growth-360",
    title: "D2Cブランド 360° グロース支援",
    client: "国内D2C ブランド",
    industry: "D2C / EC",
    services: ["marketing", "strategy"],
    metric: [
      { label: "月商", value: "+2.5x" },
      { label: "LTV", value: "+40%" },
      { label: "広告費効率", value: "ROAS 380%" },
    ],
    summary: "プロダクト戦略、広告運用、CRM、コンテンツまで統合的に支援。サブスク型ギフトビジネスの成長を加速。",
    image: "/images/generated/marketing_hero.jpg",
  },
  {
    slug: "ai-voicebot",
    title: "AIボイスボット導入で一次対応を完全自動化",
    client: "国内保険会社",
    industry: "保険",
    services: ["ai"],
    metric: [
      { label: "一次対応自動化", value: "92%" },
      { label: "平均応答時間", value: "-65%" },
      { label: "NPS", value: "+18pt" },
    ],
    summary: "電話の一次対応をAIボイスボットで完全自動化。バックエンドのナレッジRAGと連携し、エスカレーション判定も自動化。",
    image: "/images/generated/ai_hero.jpg",
  },
  {
    slug: "new-biz-pmf",
    title: "新規事業のPMF検証支援",
    client: "国内大手事業会社 新規事業部門",
    industry: "新規事業",
    services: ["strategy"],
    metric: [
      { label: "検証期間", value: "6ヶ月" },
      { label: "ピボット回数", value: "2回" },
      { label: "PMF達成", value: "Yes" },
    ],
    summary: "仮説検証設計、MVPスコープ定義、Gate Review準備、ピボット判断支援。PMF達成後の本格投入判断まで伴走。",
    image: "/images/generated/strategy_hero.jpg",
  },
  {
    slug: "tiktok-campaign",
    title: "TikTok × AI クリエイティブで CPA 60% 改善",
    client: "国内美容ブランド",
    industry: "美容／EC",
    services: ["marketing", "ai"],
    metric: [
      { label: "CPA", value: "-60%" },
      { label: "動画制作本数", value: "週20本" },
      { label: "CTR", value: "+180%" },
    ],
    summary: "TikTok広告のクリエイティブ生成をAIで効率化。人間ディレクターが仕上げる2段階プロセスで、量と質を両立。",
    image: "/images/generated/marketing_hero.jpg",
  },
];
