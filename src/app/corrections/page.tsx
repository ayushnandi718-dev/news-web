import type { Metadata } from "next";
import StaticPage from "@/components/StaticPage";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "সংশোধনী নীতি",
  description: `${BRAND.bn}-এর সংবাদ সংশোধনী নীতি।`,
};

export default function CorrectionsPage() {
  return (
    <StaticPage title="সংশোধনী নীতি">
      <p>
        {BRAND.bn} সাংবাদিকতার স্বচ্ছতা ও নির্ভুলতার পক্ষে। কোনও সংবাদে তথ্যগত ভুল চোখে পড়লে
        আমাদের{" "}
        <a href="/contact" className="font-semibold text-brand hover:underline">
          নিউজরুমে
        </a>{" "}
        জানান — যাচাইয়ের পর দ্রুত সংশোধন করা হবে।
      </p>
      <p>
        উল্লেখযোগ্য সংশোধনী সংশ্লিষ্ট সংবাদের নিচে স্পষ্টভাবে উল্লেখ করা হয়। ভুল তথ্য প্রমাণিত
        হলে সংবাদটি প্রত্যাহারও করা হয়।
      </p>
    </StaticPage>
  );
}
