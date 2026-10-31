export function HomeBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 -top-[88px] bottom-0 -z-10 overflow-hidden"
    >
      <div className="dash-home-grid-surface absolute inset-0">
        <div className="dash-home-grid-fill absolute inset-y-0 left-1/2 w-[1440px] -translate-x-1/2" />
        <div
          className="absolute left-1/2 top-0 h-[1132px] w-[1440px] -translate-x-1/2 bg-foreground"
          style={{
            mask: "url(/images/home/grid.svg) center / contain no-repeat",
          }}
        />
      </div>
      <div className="dash-home-decoration absolute inset-x-0 top-0">
        <img
          src="/images/home/hero-decoration.png"
          alt=""
          width={1440}
          height={498}
          className="block w-full max-w-none"
        />
      </div>
    </div>
  );
}
