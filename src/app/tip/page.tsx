import type { Metadata } from "next";
import { BRAND, siteUrl } from "@/lib/brand";
import NewsTipForm from "./NewsTipForm";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `সংবাদ টিপ — ${BRAND.bn}`,
  description: `আপনার এলাকার খবর আমাদের জানান। ${BRAND.bn}`,
  alternates: { canonical: `${siteUrl()}/tip` },
};

export default function TipPage() {
  return (
    <main className="mx-auto max-w-[640px] px-4 py-8">
      <h1 className="text-2xl font-bold text-brand">সংবাদ টিপ দিন</h1>
      <p className="mt-1 text-sm text-slate-500">আপনার এলাকায় কোনো খবর ঘটেছে? আমাদের জানান।</p>
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <NewsTipForm />
      </div>
    </main>
  );
}
