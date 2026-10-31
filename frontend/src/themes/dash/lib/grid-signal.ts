export type GridArea = { x: number; y: number; width: number; height: number };

export const gridSignalMotion = {
  duration: 9600,
  stagger: 3200,
  travel: 640,
  trail: 160,
  fadeAt: 0.95,
  opacity: 0.24,
};

export function gridSignalFrames(start: number): Keyframe[] {
  const { travel, trail, fadeAt, opacity } = gridSignalMotion;
  return [
    { offset: 0, opacity: 0, strokeDashoffset: trail - start },
    { offset: 0.08, opacity },
    { offset: 0.8, opacity },
    { offset: fadeAt, opacity: 0, strokeDashoffset: trail - start - travel },
    { offset: 1, opacity: 0, strokeDashoffset: trail - start - travel },
  ];
}

export function gridSignalStart(
  points: Array<{ x: number; y: number }>,
  areas: GridArea[],
  top: number,
) {
  let distance = 0;
  let runStart = 0;
  let bestStart = 0;
  let bestLength = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    const length =
      Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y);
    const samples = Math.ceil(length / 16);
    for (let sample = 1; sample <= samples; sample += 1) {
      const fraction = sample / samples;
      const x = previous.x + (point.x - previous.x) * fraction;
      const y = top + previous.y + (point.y - previous.y) * fraction;
      const position = distance + length * fraction;
      if (
        areas.some(
          (area) =>
            x >= area.x &&
            x <= area.x + area.width &&
            y >= area.y &&
            y <= area.y + area.height,
        )
      ) {
        runStart = position;
      } else if (position - runStart > bestLength) {
        bestLength = position - runStart;
        bestStart = runStart;
      }
    }
    distance += length;
  }
  return Math.min(bestStart, Math.max(0, distance - gridSignalMotion.travel));
}

export function gridSignalRoute({
  top,
  height,
  width,
  seed,
  upward,
  lane,
}: {
  top: number;
  height: number;
  width: number;
  seed: number;
  upward: boolean;
  lane?: number;
}) {
  const stepX = 51.399;
  const stepY = 51.3703;
  const offsetX = 0.156;
  const offsetY = 0.927;
  const leftColumn = Math.ceil(((1440 - width) / 2 + 32 - offsetX) / stepX);
  const rightColumn = Math.floor(((1440 + width) / 2 - 32 - offsetX) / stepX);
  const columns = rightColumn - leftColumn + 1;
  const firstColumn =
    lane === undefined
      ? leftColumn
      : leftColumn + Math.floor((columns * lane) / 3);
  const lastColumn =
    lane === undefined
      ? rightColumn
      : leftColumn + Math.floor((columns * (lane + 1)) / 3) - 1;
  const firstRow = Math.ceil((top - offsetY) / stepY);
  const lastRow = Math.floor((top + height - offsetY) / stepY);
  if (lastRow <= firstRow || lastColumn <= firstColumn) return [];

  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const direction = upward ? -1 : 1;
  let column =
    firstColumn + Math.floor(random() * (lastColumn - firstColumn + 1));
  let row = upward ? lastRow : firstRow;
  const points = [
    { x: column * stepX + offsetX, y: row * stepY + offsetY - top },
  ];
  const addPoint = () =>
    points.push({
      x: column * stepX + offsetX,
      y: row * stepY + offsetY - top,
    });
  const endRow = upward ? firstRow : lastRow;
  let progress = 0;
  while (row !== endRow) {
    const side =
      column === firstColumn
        ? 1
        : column === lastColumn
          ? -1
          : random() < 0.5
            ? -1
            : 1;
    if (progress === 2 || (progress > 2 && random() < 0.15)) {
      column += side;
      addPoint();
      row += direction;
      addPoint();
      column -= side;
      addPoint();
      row -= direction;
      addPoint();
    } else if (random() < 0.75) {
      const distance = 1 + Math.floor(random() * 3);
      column = Math.max(
        firstColumn,
        Math.min(lastColumn, column + side * distance),
      );
      addPoint();
    }
    row += direction;
    addPoint();
    progress += 1;
  }
  return points;
}
