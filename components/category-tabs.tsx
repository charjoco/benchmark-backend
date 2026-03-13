"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ALL_CATEGORIES, CATEGORY_LABELS } from "@/lib/normalize/category";
import type { AppCategory } from "@/types";

export function CategoryTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("category") as AppCategory | null;

  function setCategory(cat: AppCategory | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (cat) {
      params.set("category", cat);
    } else {
      params.delete("category");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const tabs: Array<{ key: AppCategory | null; label: string }> = [
    { key: null, label: "All" },
    ...ALL_CATEGORIES.map((c) => ({ key: c, label: CATEGORY_LABELS[c] })),
  ];

  return (
    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
      {tabs.map(({ key, label }) => (
        <button
          key={key ?? "all"}
          onClick={() => setCategory(key)}
          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            current === key
              ? "bg-white text-zinc-900"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
