export function buildSmoothPath(points: { x: number; y: number }[]): string {
  return points
    .map((p, i) => {
      if (i === 0) return `M${p.x},${p.y}`;
      const prev = points[i - 1];
      const cp = (p.x - prev.x) * 0.4;
      return `C${prev.x + cp},${prev.y} ${p.x - cp},${p.y} ${p.x},${p.y}`;
    })
    .join(" ");
}
