"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";

type Tab = { slug: string; name: string; value: number };

export function QuestionSubtestTabs({ tabs, selected }: { tabs: Tab[]; selected: string }) {
  const router = useRouter();
  return <Tabs value={selected} onValueChange={(value) => router.push(value === "semua" ? "/admin/soal" : `/admin/soal?subtes=${value}`)}>
    <TabsList aria-label="Subtes bank soal">{tabs.map((tab) => <TabsTrigger key={tab.slug} value={tab.slug}>{tab.name}<span className="ml-1 text-xs">{tab.value}</span></TabsTrigger>)}</TabsList>
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
