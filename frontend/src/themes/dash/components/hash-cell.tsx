export function HashCell({
  hash,
  accent = false,
}: {
  hash: string;
  accent?: boolean;
}) {
  const start = hash.slice(0, 5);
  const middle = hash.slice(5, -5);
  const end = hash.slice(-5);
  const edge = accent ? "font-bold text-accent" : "font-bold";
  const mid = accent ? "text-accent/50" : "text-muted-foreground";
  return (
    <span className="break-all font-mono leading-none">
      <span className={edge}>{start}</span>
      <span className={mid}>{middle}</span>
      <span className={edge}>{end}</span>
    </span>
  );
}
