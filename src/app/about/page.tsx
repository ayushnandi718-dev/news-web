import type { Metadata } from "next";
import StaticPage from "@/components/StaticPage";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "আমাদের সম্পর্কে",
  description: `${BRAND.bn} — আলিপুরদুয়ার-ভিত্তিক স্বাধীন বাংলা ডিজিটাল সংবাদমাধ্যম।`,
};

export default function AboutPage() {
  return (
    <StaticPage
      title="আমাদের সম্পর্কে"
      subtitle={`${BRAND.bn} — আলিপুরদুয়ার থেকে আপনার ভাষায়, আপনার এলাকার খবর।`}
    >
      <p>
        {BRAND.bn} আলিপুরদুয়ার-কেন্দ্রিক একটি স্বাধীন বাংলা ডিজিটাল সংবাদমাধ্যম। আলিপুরদুয়ার,
        ডুয়ার্স ও উত্তরবঙ্গের প্রতিটি গুরুত্বপূর্ণ খবর নিরপেক্ষ, দ্রুত ও নির্ভরযোগ্যভাবে পৌঁছে
        দেওয়াই আমাদের অঙ্গীকার।
      </p>
      <p>
        স্থানীয় প্রশাসন, শিক্ষা, স্বাস্থ্য, পরিবহণ, কৃষি, খেলা ও সংস্কৃতি — গ্রাম থেকে রাজ্য পর্যন্ত
        প্রতিটি স্তরের সংবাদ আমরা বাংলায় পাঠকের দরজায় পৌঁছে দিই।
      </p>
      <p className="text-sm text-slate-500">
        সম্পাদকীয় জিজ্ঞাসা বা ভুল সংশোধনের অনুরোধ{" "}
        <a href="/contact" className="font-semibold text-brand hover:underline">
          যোগাযোগ পেজে
        </a>{" "}
        পাঠাতে পারেন।
      </p>
    </StaticPage>
  );
}
