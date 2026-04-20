export default function Marquee() {
  const items = Array.from({ length: 6 }, (_, i) => (
    <span key={i} className="marquee-item">
      Strategy <span className="dot"></span> <span className="em">ai</span> <span className="dot"></span> Marketing
    </span>
  ));
  return (
    <div className="marquee-v4" aria-hidden="true">
      <div className="marquee-inner">{items}</div>
    </div>
  );
}
