export type Member = {
  initial: string;
  role: string;
  division: "leadership" | "strategy" | "ai" | "marketing";
  background: string;
  bio: string;
};

// 仮置きロスターを表示中（CEO 2026-09-03）。イニシャル + 領域のみ。実在の協力者への差し替えが TODO。
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
  // ─── 仮置きロスター（CEO 2026-09-03「一旦仮置きで公開、仮想のもの」）。イニシャルと領域だけを表示し、
  //     経歴・所属・関与形態は載せない。実在の協力者に置き換え次第、この配列を差し替える。───
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
