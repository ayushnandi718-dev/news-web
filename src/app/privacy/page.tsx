import type { Metadata } from "next";
import StaticPage from "@/components/StaticPage";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "গোপনীয়তা নীতি",
  description: `${BRAND.bn}-এর গোপনীয়তা নীতি।`,
};

export default function PrivacyPage() {
  return (
    <StaticPage title="গোপনীয়তা নীতি">
      <p>
        {BRAND.bn} পাঠকের ব্যক্তিগত তথ্যের গোপনীয়তা রক্ষাকে গুরুত্বপূর্ণ মনে করে। সাইট চালাতে
        প্রয়োজনীয় ন্যূনতম ডেটা (যেমন কুকি, অ্যাক্সেস লগ) ছাড়া আমরা কোনও ব্যক্তিগত তথ্য সংগ্রহ
        করি না।
      </p>
      <p>
        নিউজলেটার বা মন্তব্যের মাধ্যমে দেওয়া ইমেল/নাম শুধুমাত্র সংশ্লিষ্ট সেবা দিতে ব্যবহৃত হয় —
        কোনও তৃতীয় পক্ষকে বিক্রি করা হয় না।
      </p>
      <p className="text-sm text-slate-500">নীতি হালনাগাদের তারিখ: জুলাই ২০২৬।</p>
    </StaticPage>
  );
}
