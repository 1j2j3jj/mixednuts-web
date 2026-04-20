# mixednuts-web

mixednuts-inc.com コーポレートサイト。Next.js 16 + React 19 + Tailwind v4 + TypeScript。

## 構成

- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI**: Tailwind v4 (CSS-first)
- **Fonts**: Noto Sans JP / Noto Serif JP / Playfair Display / Inter
- **Forms**: Web3Forms (無料枠 250件/月)
- **Host**: Vercel (予定)

## 開発

```bash
npm install
cp .env.local.example .env.local  # WEB3FORMS_ACCESS_KEY 設定
npm run dev                        # http://localhost:3000
npm run build && npm start         # 本番ビルド検証
```

## ディレクトリ

```
src/
├── app/                  # App Router pages
│   ├── layout.tsx        # RootLayout (Nav + Footer)
│   ├── globals.css       # Design tokens + shared styles
│   ├── sitemap.ts / robots.ts
│   ├── page.tsx          # TOP (v3 bold typography)
│   ├── about/  services/  works/  team/  insights/  careers/  contact/
│   └── privacy/  legal/
├── components/           # Nav, Footer
└── data/                 # members, services, works, site
public/images/generated/  # AI-generated hero images
```

## 運用メモ

- メンバーはイニシャル表記 (N.I., K.T. など)
- クライアント名は完全匿名化（業種ラベルのみ）
- ブログ記事は src/app/insights/[slug]/page.tsx で追加（MDX化は今後）
