"use client";

import { useState, useTransition } from "react";
import { generateClientPassword } from "./actions";

/**
 * One-click password generator. Returned string is shown with a copy
 * button and an inline Vercel env instruction — there is no server-side
 * persistence (we don't have a Vercel API token in the app env). Admin
 * pastes it into Vercel Dashboard > Settings > Environment Variables.
 */
export default function CredentialGenerator() {
  const [pw, setPw] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function generate() {
    setCopied(false);
    startTransition(async () => {
      const next = await generateClientPassword();
      setPw(next);
    });
  }

  async function copy() {
    if (!pw) return;
    try {
      await navigator.clipboard.writeText(pw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 disabled:opacity-60"
        >
          {pending ? "生成中…" : "新PW生成"}
        </button>
        {pw && (
          <>
            <code className="rounded bg-neutral-100 px-2 py-1 font-mono text-xs">{pw}</code>
            <button
              type="button"
              onClick={copy}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-xs hover:bg-neutral-50"
            >
              {copied ? "コピー済" : "コピー"}
            </button>
          </>
        )}
      </div>
      {pw && (
        <div className="text-xs text-muted-foreground">
          Vercel 更新:{" "}
          <code className="font-mono">CLIENT_AUTH_HS=hansoku_style:{pw}</code>
          （対象 client は任意。値を書き換えて保存 → 即反映）
        </div>
      )}
    </div>
  );
}
