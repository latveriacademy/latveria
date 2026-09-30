"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { BookOpenText, Calculator, Brain, Languages, List, PenLine, Sigma, SpellCheck, type LucideIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";

type Tab = { slug: string; name: string; value: number };
const icons: Record<string, LucideIcon> = {
  semua: List,
  "penalaran-umum": Brain,
  "pengetahuan-pemahaman-umum": BookOpenText,
  "pemahaman-bacaan-menulis": PenLine,
  "pengetahuan-kuantitatif": Calculator,
  "literasi-bahasa-indonesia": SpellCheck,
  "literasi-bahasa-inggris": Languages,
  "penalaran-matematika": Sigma,
};

export function QuestionSubtestTabs({ tabs, selected }: { tabs: Tab[]; selected: string }) {
  const router = useRouter();
  return <Tabs value={selected} onValueChange={(value) => router.push(value === "semua" ? "/admin/soal" : `/admin/soal?subtes=${value}`)}>
    <TabsList aria-label="Subtes bank soal" className="flex h-auto max-w-full flex-wrap justify-start">
      {tabs.map((tab) => { const Icon = icons[tab.slug] ?? List; return <TabsTrigger key={tab.slug} value={tab.slug} className="min-h-10"><Icon aria-hidden="true" /><span>{tab.name}</span><span className="text-xs">{tab.value}</span></TabsTrigger>; })}
    </TabsList>
  </Tabs>;
}

export function CategorySelect({ categories, value }: { categories: string[]; value?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  return <Select value={value ?? "semua"} onValueChange={(selected) => {
    const params = new URLSearchParams(searchParams.toString());
    if (selected === "semua") params.delete("kategori"); else params.set("kategori", selected);
    params.delete("halaman");
    router.push(`/admin/soal?${params.toString()}`);
  }}>
    <SelectTrigger aria-label="Kategori materi" aria-labelledby="category-filter-label" className="w-[min(100%,390px)]"><SelectValue placeholder="Semua kategori" /></SelectTrigger>
    <SelectContent><SelectItem value="semua">Semua kategori</SelectItem>{categories.map((category) => <SelectItem value={category} key={category}>{category}</SelectItem>)}</SelectContent>
  </Select>;
}
