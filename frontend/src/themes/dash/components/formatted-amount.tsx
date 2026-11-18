export function FormattedAmount({
  value,
  unit,
}: {
  value: string;
  unit?: string;
}) {
  const [whole, fraction] = value.split(".");

  return (
    <span className="font-medium tabular-nums text-foreground">
      {whole}
      {fraction && <span className="text-muted-foreground">.{fraction}</span>}
      {unit && value !== "—" && (
        <span className="text-muted-foreground"> {unit}</span>
      )}
    </span>
  );
}
