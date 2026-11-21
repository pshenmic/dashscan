export const mapSurfaceRadius = 24;
const cutoutGap = 24;
const strokeInset = 0.5;

export function mapSurfaceOutline({
  width,
  height,
  cutout,
}: {
  width: number;
  height: number;
  cutout?: { right: number; top: number };
}) {
  const radius = mapSurfaceRadius;
  const cutoutRadius = radius + cutoutGap;
  const left = cutout ? cutout.right + cutoutGap : 0;
  const right = width - strokeInset;
  const bottom = height - strokeInset;
  const leftEdge = cutout
    ? [
        `V ${cutout.top + radius}`,
        `A ${cutoutRadius} ${cutoutRadius} 0 0 0 ${left - cutoutRadius} ${cutout.top - cutoutGap}`,
        `H ${radius}`,
        `Q ${strokeInset} ${cutout.top - cutoutGap} ${strokeInset} ${cutout.top - cutoutRadius}`,
      ].join(" ")
    : "";

  return [
    `M ${radius} ${strokeInset}`,
    `H ${width - radius}`,
    `Q ${right} ${strokeInset} ${right} ${radius}`,
    `V ${height - radius}`,
    `Q ${right} ${bottom} ${width - radius} ${bottom}`,
    `H ${left + radius}`,
    `Q ${left + strokeInset} ${bottom} ${left + strokeInset} ${height - radius}`,
    leftEdge,
    `V ${radius}`,
    `Q ${strokeInset} ${strokeInset} ${radius} ${strokeInset} Z`,
  ].join(" ");
}
