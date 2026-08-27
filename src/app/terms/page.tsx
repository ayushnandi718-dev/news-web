import type { Metadata } from "next";
import StaticPage from "@/components/StaticPage";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "ব্যবহারের শর্ত",
  description: `${BRAND.bn} ওয়েবসাইট ব্যবহারের শর্তাবলি।`,
};

export default function TermsPage() {
  return (
    <StaticPage title="ব্যবহারের শর্ত">
      <p>
        {BRAND.bn}-এ প্রকাশিত সংবাদ, ছবি ও ভিডিওর সমস্ত স্বত্ব সংরক্ষিত। অনুমতি ছাড়া কোনও কনটেন্ট
        বাণিজ্যিকভাবে পুনঃপ্রকাশ বা বিক্রি করা যাবে না।
      </p>
      <p>
        ব্যক্তিগত, অবাণিজ্যিক শেয়ারিংয়ের ক্ষেত্রে সূত্রসহ উল্লেখ করুন: © {new Date().getFullYear()}{" "}
        {BRAND.bn}।
      </p>
      <p>
        সাইটের সেবা ব্যবহারের মাধ্যমে আপনি এই শর্তগুলিতে সম্মত হচ্ছেন। শর্ত পরিবর্তনের অধিকার
        সংরক্ষিত।
      </p>
    </StaticPage>
  );
}
