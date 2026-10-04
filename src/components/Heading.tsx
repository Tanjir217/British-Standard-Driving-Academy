export function Heading({
  ey,
  title,
  text,
  center = false,
}: {
  ey: string;
  title: string;
  text?: string;
  center?: boolean;
}) {
  return (
    <div className={"heading " + (center ? "center" : "")}>
      <span className="ey">{ey}</span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}
