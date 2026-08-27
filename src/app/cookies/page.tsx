import type { Metadata } from "next";
import StaticPage from "@/components/StaticPage";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "কুকি নীতি",
  description: `${BRAND.bn}-এর কুকি ব্যবহারের নীতি।`,
};

export default function CookiesPage() {
  return (
    <StaticPage title="কুকি নীতি">
      <p>
        {BRAND.bn} সাইটের অভিজ্ঞতা উন্নত করতে সীমিত সংখ্যক কুকি ব্যবহার করে — যেমন আপনার
        পড়ার-অবস্থা মনে রাখা বা ট্রাফিক পরিসংখ্যান।
      </p>
      <p>
        ব্রাউজারের সেটিংস থেকে কুকি বন্ধ করা সম্ভব; তবে তাতে সাইটের কিছু ফিচার (যেমন নিউজলেটার)
        ঠিকভাবে কাজ নাও করতে পারে।
      </p>
    </StaticPage>
  );
}
