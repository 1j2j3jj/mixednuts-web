import Link from "next/link";

const visuallyHidden = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

export default function BreadcrumbNav({ items }: { items: Array<{ name: string; path?: string }> }) {
  return (
    <nav aria-label="パンくずリスト" style={visuallyHidden}>
      <ol>
        {items.map((item) => (
          <li key={`${item.path ?? "current"}-${item.name}`}>
            {item.path ? <Link href={item.path}>{item.name}</Link> : item.name}
          </li>
        ))}
      </ol>
    </nav>
  );
}
