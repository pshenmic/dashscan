export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 h-[88px] bg-transparent">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between rounded-t-3xl border-t border-border px-6 text-sm text-muted-foreground">
        <p className="m-0">&copy; {year} DashScan. All rights reserved.</p>
      </div>
    </footer>
  );
}
