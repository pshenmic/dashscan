export function TwoLineHash({
  hash,
  uppercase,
}: { hash: string; uppercase?: boolean }) {
  if (!hash) return <span className="text-muted-foreground">—</span>;
  const display = uppercase ? hash.toUpperCase() : hash;
  const mid = Math.ceil(display.length / 2);
  const line1 = display.slice(0, mid);
  const line2 = display.slice(mid);

  function renderLine(line: string, isFirst: boolean) {
    if (isFirst) {
      const bold = line.slice(0, 5);
      const rest = line.slice(5);
      return (
        <>
          <span>{bold}</span>
          <span className="text-muted-foreground">{rest}</span>
        </>
      );
    }
    const rest = line.slice(0, -5);
    const bold = line.slice(-5);
    return (
      <>
        <span className="text-muted-foreground">{rest}</span>
        <span>{bold}</span>
      </>
    );
  }

  return (
    <div className="font-mono text-xs leading-none">
      <div>{renderLine(line1, true)}</div>
      <div>{renderLine(line2, false)}</div>
    </div>
  );
}
