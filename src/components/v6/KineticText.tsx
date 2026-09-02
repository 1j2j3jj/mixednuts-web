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
