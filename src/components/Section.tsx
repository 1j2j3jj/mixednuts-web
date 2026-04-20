import type { ReactNode } from "react";

type SectionProps = {
  tone?: "bg" | "paper" | "ink";
  eyebrow?: string;
  title?: ReactNode;
  lead?: ReactNode;
  children: ReactNode;
  id?: string;
};

export default function Section({ tone = "bg", eyebrow, title, lead, children, id }: SectionProps) {
  return (
    <section id={id} className={`section-v4 tone-${tone}`}>
      <div className="container-v4">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        {title && <h2 className="section-title-v4">{title}</h2>}
        {lead && <p className="section-lead-v4">{lead}</p>}
        {children}
      </div>
    </section>
  );
}
