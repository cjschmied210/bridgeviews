import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center transition-colors">
      <main className="max-w-2xl space-y-8">
        <h1 className="text-4xl sm:text-6xl font-serif tracking-tight text-foreground">
          Bridgeviews
        </h1>
        <p className="text-lg text-foreground/80 font-serif italic">
          "The Literature Lab"
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
          <Link
            href="/dashboard"
            className="px-8 py-3 rounded-full border border-foreground/20 hover:bg-foreground/5 transition-all font-serif"
          >
            Teacher Dashboard
          </Link>
          <Link
            href="/space/demo"
            className="px-8 py-3 rounded-full bg-primary text-background hover:opacity-90 transition-all font-serif shadow-sm"
          >
            Enter Student Space
          </Link>
        </div>
      </main>

      <footer className="absolute bottom-8 text-sm text-foreground/40 font-serif">
        Built with Google Antigravity
      </footer>
    </div>
  );
}
