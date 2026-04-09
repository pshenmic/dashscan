export function PageStatus({ message }: { message: string }) {
  return (
    <main className="mx-auto max-w-[1440px] px-6 py-10">
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        {message}
      </div>
    </main>
  );
}
