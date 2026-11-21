import { type ComponentProps, type CSSProperties, useState } from "react";
import { Geography } from "react-simple-maps";

type GeographyStyles = Record<"default" | "hover" | "pressed", CSSProperties>;

type MapGeographyProps = Pick<
  ComponentProps<typeof Geography>,
  "geography" | "onClick"
> & {
  styles: GeographyStyles;
};

export function MapGeography({
  geography,
  onClick,
  styles,
}: MapGeographyProps) {
  const [interaction, setInteraction] =
    useState<keyof GeographyStyles>("default");

  return (
    <Geography
      geography={geography}
      onClick={onClick}
      style={styles[interaction]}
      onMouseEnter={() => setInteraction("hover")}
      onMouseLeave={() => setInteraction("default")}
      onMouseDown={() => setInteraction("pressed")}
      onMouseUp={() => setInteraction("hover")}
    />
  );
}
