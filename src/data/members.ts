export type Member = {
  initial: string;
  role: string;
  division: "leadership" | "strategy" | "ai" | "marketing";
  background: string;
  bio: string;
};

// The remaining roster entries are unverified and stay hidden until the CEO confirms them.
export const SHOW_MEMBER_ROSTER = false;

const memberRoster: Member[] = [
  {
    initial: "N.I.",
    role: "Founder & CEO",
    division: "leadership",
    background: "デジタル広告代理店 → グローバル IT 企業 → 国内 IT 企業 経営企画／FP&A → 起業",
    bio: "デジタル広告代理店で金融・不動産・旅行業界の大手企業を担当し、チームマネージャーとして PL 責任を担う。グローバル IT 企業では広告事業のアカウントストラテジストとして大手企業のデジタル戦略を支援。国内 IT 企業の経営企画で事業計画・FP&A・投資評価・取締役会付議資料を担当。2021 年に mixednuts を創業。早稲田大学大学院 経営管理研究科 修了（MBA）。",
  },
  {
    initial: "K.T.",
    role: "Head of Strategy",
    division: "strategy",
    background: "外資系戦略コンサル出身",
    bio: "外資系戦略ファームで通信・メディア・ヘルスケア業界の中期戦略立案をリード。M&A PMI、新規事業立ち上げ、組織変革の経験多数。",
  },
  {
    initial: "Y.M.",
    role: "Principal, M&A / Investment",
    division: "strategy",
    background: "BIG4 会計事務所出身",
    bio: "BIG4 会計事務所の FAS / M&A アドバイザリー部門で財務DD・バリュエーション・PMI を多数経験。DCF・フットボールチャート・感応度分析を実務水準で運用。",
  },
  {
    initial: "R.S.",
    role: "Principal, FP&A / Corporate Finance",
    division: "strategy",
    background: "事業会社経営企画 責任者",
    bio: "国内大手事業会社で経営企画責任者として予実管理・取締役会付議・中期計画策定を統括。Netflix型ユニットエコノミクス分析が専門。",
  },
  {
    initial: "H.K.",
    role: "Head of AI",
    division: "ai",
    background: "グローバル大手IT企業 AI/ML エンジニア",
    bio: "グローバル大手IT企業で大規模言語モデルのプロダクト適用を担当。RAG、エージェント、マルチモーダルAIの実装経験多数。",
  },
  {
    initial: "M.A.",
    role: "Lead AI Engineer",
    division: "ai",
    background: "国内大手IT企業 プロダクト開発",
    bio: "国内大手IT企業でAIプロダクトの開発リードを経験。LLM Ops、プロンプトエンジニアリング、Evaluation 設計が得意領域。",
  },
  {
    initial: "T.N.",
    role: "Prompt & Agent Architect",
    division: "ai",
    background: "スタートアップ CTO 経験",
    bio: "複数スタートアップでCTO／技術顧問を歴任。AIエージェントのオーケストレーション設計、MCP統合、ツール実装が専門。",
  },
  {
    initial: "S.O.",
    role: "Head of Marketing",
    division: "marketing",
    background: "国内大手デジタル広告代理店 Sr. Director",
    bio: "国内大手デジタル広告代理店でシニアディレクターとして大手クライアントの統合マーケティング戦略を統括。BtoB／BtoC双方の実績。",
  },
  {
    initial: "A.Y.",
    role: "Lead, Growth Marketing",
    division: "marketing",
    background: "事業会社マーケ責任者（D2C／SaaS）",
    bio: "D2CブランドおよびSaaS事業会社でマーケティング責任者を歴任。CAC／LTV最適化、コホート分析、グロース設計が専門。",
  },
  {
    initial: "J.W.",
    role: "Creative & Content Lead",
    division: "marketing",
    background: "SNSクリエイター／編集者",
    bio: "SNSプラットフォームで10万フォロワー超のクリエイター活動と並行して、媒体編集者としてブランドコンテンツ戦略を担当。",
  },
];

export const members = SHOW_MEMBER_ROSTER
  ? memberRoster
  : memberRoster.filter((member) => member.division === "leadership");

export const divisionLabels = {
  leadership: "Leadership",
  strategy: "Strategy",
  ai: "AI",
  marketing: "Marketing",
};
