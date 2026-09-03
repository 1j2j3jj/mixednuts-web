export type Member = {
  initial: string;
  role: string;
  division: "leadership" | "strategy" | "ai" | "marketing";
  background: string;
  bio: string;
};

// 協力メンバーのロスターを表示（CEO 2026-09-03）。イニシャル + 領域のみ。
export const SHOW_MEMBER_ROSTER = true;

const memberRoster: Member[] = [
  {
    initial: "N.I.",
    role: "Founder & CEO",
    division: "leadership",
    background: "デジタル広告代理店 → グローバルIT企業（広告事業）→ 事業会社 経営企画／FP&A",
    // CEO 選択用: 数値なし版
    // bio: "国内大手デジタル広告代理店で金融・不動産・旅行業界の大手企業を担当し、チームマネージャーとして PL 責任を担う。グローバル大手IT企業では広告事業のアカウントストラテジストとして、大手企業のデジタル戦略を支援。国内大手IT企業の経営企画では、ライブ配信・エンターテインメント事業の事業計画策定、FP&A、投資評価、取締役会付議資料を担当。2021年に mixednuts を創業し、戦略・AI・マーケティングの統合提供を牽引。早稲田大学大学院 経営管理研究科 修了（MBA）。",
    bio: "国内大手デジタル広告代理店で金融・不動産・旅行業界の大手企業を担当し、チームマネージャーとして PL 責任を担う。グローバル大手IT企業では広告事業のアカウントストラテジストとして、大手企業約50社のデジタル戦略を支援。国内大手IT企業の経営企画では、ライブ配信・エンターテインメント事業の事業計画策定、FP&A、投資評価、取締役会付議資料を担当。2021年に mixednuts を創業し、戦略・AI・マーケティングの統合提供を牽引。早稲田大学大学院 経営管理研究科 修了（MBA）。",
  },
  // ─── 協力メンバー（実在。Slack #marketing_unit / Chatwork の稼働記録から抽出、CEO 確認 2026-09-03）。
  //     公開はイニシャルと領域のみ。氏名・所属・関与形態・経歴は載せない。───
  { initial: "N.F.", role: "Ads Operations", division: "marketing", background: "広告運用（EC・B2B）", bio: "" },
  { initial: "R.H.", role: "Ads Operations", division: "marketing", background: "広告運用・レポーティング", bio: "" },
  { initial: "Y.N.", role: "Performance Marketing", division: "marketing", background: "Google / Meta / Yahoo 運用・EC グロース", bio: "" },
  { initial: "N.K.", role: "LP Design & Build", division: "marketing", background: "LP デザイン・コーディング", bio: "" },
  { initial: "M.M.", role: "Ad Creative", division: "marketing", background: "バナー・広告クリエイティブ", bio: "" },
  { initial: "T.O.", role: "Ad Creative", division: "marketing", background: "バナー・広告クリエイティブ", bio: "" },
  { initial: "M.S.", role: "Ad Creative", division: "marketing", background: "構成案・広告クリエイティブ", bio: "" },
  // ─── 仮置き（CEO 2026-09-03「戦略コンサル等もいるので既存 7 名も残す」）。実在者に差し替え次第、更新。───
  { initial: "K.T.", role: "Strategy Lead", division: "strategy", background: "事業戦略・中期計画・FP&A 支援", bio: "" },
  { initial: "Y.M.", role: "M&A / Investment", division: "strategy", background: "投資評価・DD・バリュエーション", bio: "" },
  { initial: "R.S.", role: "Corporate Finance", division: "strategy", background: "予実管理・経営管理の仕組み化", bio: "" },
  { initial: "A.H.", role: "AI Engineer", division: "ai", background: "エージェント設計・LLM 業務実装", bio: "" },
  { initial: "M.K.", role: "Data / Platform", division: "ai", background: "データ基盤・計測・MCP 統合", bio: "" },
  { initial: "S.O.", role: "Growth Marketing", division: "marketing", background: "広告運用・LTV / CAC 設計", bio: "" },
  { initial: "J.W.", role: "SEO / AIO", division: "marketing", background: "検索・AI 検索対策・構造化データ", bio: "" },
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
