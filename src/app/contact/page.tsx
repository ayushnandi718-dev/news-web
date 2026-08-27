import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import StaticPage from "@/components/StaticPage";
import { BRAND } from "@/lib/brand";
import { getContactSettings } from "@/lib/settings";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "যোগাযোগ",
  description: `${BRAND.bn} নিউজরুমের সঙ্গে যোগাযোগ করুন — সংবাদ পাঠান, বিজ্ঞাপন বা সাধারণ জিজ্ঞাসা।`,
};

export default async function ContactPage() {
  const s = await getContactSettings();
  const wa = s.contactWhatsapp.replace(/[^\d]/g, "");
  return (
    <StaticPage
      title="যোগাযোগ"
      subtitle="আপনার এলাকার খবর, ছবি বা ভিডিও পাঠান — অথবা বিজ্ঞাপন ও অন্যান্য জিজ্ঞাসা করুন।"
    >
      <ul className="list-disc space-y-1.5 pl-5">
        <li>
          নিউজরুম (সংবাদ পাঠান):{" "}
          <a href={`mailto:${s.contactEmail}`} className="font-semibold text-brand hover:underline">
            {s.contactEmail}
          </a>
        </li>
        {(s.contactPhone || s.contactWhatsapp) && (
          <li>
            ফোন / WhatsApp:{" "}
            {wa ? (
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand hover:underline"
              >
                {s.contactPhone || s.contactWhatsapp}
              </a>
            ) : (
              <span className="font-semibold">{s.contactPhone}</span>
            )}
          </li>
        )}
        <li>ঠিকানা: {s.contactAddress}</li>
      </ul>
      <p>
        সংবাদ পাঠালে সঙ্গে নাম ও যোগাযোগের নম্বর অবশ্যই দিন। যাচাইয়ের পরেই খবর প্রকাশ করা হয়।
      </p>
    </StaticPage>
  );
}
