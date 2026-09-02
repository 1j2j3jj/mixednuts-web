import type { CSSProperties, ReactNode } from "react";

export function SplitWords({ words, accent }: { words: string[]; accent?: string }) {
  return words.map((word, wordIndex) => (
    <span className={`w${word === accent ? " ai" : ""}`} key={`${word}-${wordIndex}`}>
      {Array.from(word).map((character, characterIndex) => (
        <span className="c" key={`${character}-${characterIndex}`}>{character}</span>
      ))}
      {wordIndex < words.length - 1 ? " " : null}
    </span>
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
