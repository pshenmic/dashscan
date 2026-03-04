export function HashCell({ hash }: { hash: string }) {
  const start = hash.slice(0, 5);
  const middle = hash.slice(5, -5);
  const end = hash.slice(-5);
  return (
    <span className="font-mono leading-none">
      <span>{start}</span>
      <span className="text-muted-foreground">{middle}</span>
      <span>{end}</span>
    </span>
  );
}
