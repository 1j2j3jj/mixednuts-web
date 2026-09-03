import { Fragment } from "react";
import type { CSSProperties, ReactNode } from "react";

export function SplitWords({ words, accent }: { words: string[]; accent?: string }) {
  // The space must live OUTSIDE the inline-block `.w` (trailing whitespace
  // inside an inline-block collapses, which glued "With" to "AI.").
  return words.map((word, wordIndex) => (
    <Fragment key={`${word}-${wordIndex}`}>
      <span className={`w${word === accent ? " ai" : ""}`} aria-hidden="true">
        {Array.from(word).map((character, characterIndex) => (
          <span className="c" key={`${character}-${characterIndex}`}>{character}</span>
        ))}
      </span>
      {wordIndex < words.length - 1 ? " " : null}
    </Fragment>
  ));
}

export function Odometer({ value }: { value: string }) {
  return Array.from(value).map((character, index) => {
    if (!/\d/.test(character)) return <span className="sym" key={`${character}-${index}`}>{character}</span>;
    return (
      <span className="od" data-d={character} key={`${character}-${index}`}>
        <i>{Array.from({ length: 10 }, (_, digit) => <span key={digit}>{digit}</span>)}</i>
      </span>
    );
  });
}

export function RingItem({ index, children }: { index: number; children: ReactNode }) {
  return <span style={{ "--i": index } as CSSProperties}>{children}</span>;
}


/** Odometer for numeric-looking values; plain wrapping text otherwise (long JP/Latin phrases must never overflow their cell). */
export function MetricValue({ value }: { value: string }) {
  const numeric = /^[\d,.\s%×xX+\-–—→〜~¥$]+$/.test(value);
  if (numeric) return <Odometer value={value} />;
  return <span className="metric-text">{value}</span>;
}


/** Split Japanese copy into phrase-ish chunks so headlines wrap between phrases instead of mid-word.
 *  Heuristic, no dictionary: break after 、。」）, after a particle when the next char is NOT hiragana
 *  (so 「できない」「分からない」 stay whole), and keep Latin/digit runs as single chunks. */
export function tokenizeJa(text: string): string[] {
  const particles = ["から", "まで", "より", "を", "が", "に", "で", "は", "の", "と", "も", "へ", "や"];
  const isHira = (ch: string) => /[ぁ-ん]/.test(ch);
  const isLatin = (ch: string) => /[A-Za-z0-9%¥$+\-–—→×.,:/]/.test(ch);
  const chars = Array.from(text);
  const raw: string[] = [];
  let cur = "";
  const flush = () => { if (cur) raw.push(cur); cur = ""; };
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    if (/\s/.test(ch)) { flush(); raw.push(" "); continue; }
    if (isLatin(ch)) {
      flush();
      let run = ch;
      while (i + 1 < chars.length && (isLatin(chars[i + 1]) || (chars[i + 1] === " " && i + 2 < chars.length && isLatin(chars[i + 2])))) { i += 1; run += chars[i]; }
      raw.push(run);
      continue;
    }
    cur += ch;
    if (/[、。」）]/.test(ch)) { flush(); continue; }
    const next = chars[i + 1];
    if (next !== undefined && !isHira(next) && !/[、。」）]/.test(next) && particles.some((p) => cur.endsWith(p))) flush();
  }
  flush();
  // merge tiny chunks (≤2 chars) into the previous one, and glue chunks that start with ー/「/（
  const out: string[] = [];
  for (const c of raw) {
    const prev = out[out.length - 1];
    if (prev !== undefined && c !== " " && prev !== " " && !/[、。]$/.test(prev) && (c.length <= 2 || /^[ー「（]/.test(c))) out[out.length - 1] = prev + c;
    else out.push(c);
  }
  return out;
}

/** Phrase-wrapped plain text: each chunk is an unbreakable inline-block. */
export function Phrases({ text }: { text: string }) {
  return tokenizeJa(text).map((chunk, i) => (
    /^\s+$/.test(chunk) ? <Fragment key={i}> </Fragment> : <span className="ph" key={i}>{chunk}</span>
  ));
}

/** Phrase-wrapped split characters for slam animations (each `.c` stays animatable). */
export function SplitPhrases({ text }: { text: string }) {
  return tokenizeJa(text).map((chunk, i) => (
    /^\s+$/.test(chunk) ? <Fragment key={i}> </Fragment> : (
      <span className="ph" key={i}>
        {Array.from(chunk).map((ch, j) => <span className="c" aria-hidden="true" key={`${i}-${j}`}>{ch}</span>)}
      </span>
    )
  ));
}
