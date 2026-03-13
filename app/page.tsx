import { Suspense } from "react";
import { CategoryTabs } from "@/components/category-tabs";
import { FilterBar } from "@/components/filter-bar";
import { ProductGrid } from "@/components/product-grid";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-[0.2em] uppercase text-white" style={{ fontFamily: "var(--font-cormorant)" }}>
            Benchmark
          </h1>
          <p className="text-xs tracking-[0.15em] uppercase text-zinc-500 mt-1">
            For men who set the bar
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TriggerScrapeButton />
        </div>
      </header>

      {/* Category tabs */}
      <div className="border-b border-zinc-800 px-6 py-3">
        <Suspense fallback={<div className="h-8" />}>
          <CategoryTabs />
        </Suspense>
      </div>

      {/* Main content */}
      <div className="flex">
        {/* Sidebar */}
        <Suspense fallback={<div className="w-56 border-r border-zinc-800" />}>
          <FilterBar />
        </Suspense>

        {/* Products */}
        <main className="flex-1 p-6">
          <Suspense
            fallback={
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-zinc-900 rounded-xl aspect-[4/5] animate-pulse"
                  />
                ))}
              </div>
            }
          >
            <ProductGrid searchParams={resolvedParams} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function TriggerScrapeButton() {
  return (
    <form
      action={async () => {
        "use server";
        const { runAllScrapers } = await import("@/lib/scrapers");
        runAllScrapers().catch(console.error);
      }}
    >
      <button
        type="submit"
        className="text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors"
      >
        Refresh Data
      </button>
    </form>
  );
}
