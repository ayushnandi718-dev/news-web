import { confirmSubscription } from "@/lib/newsletter";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function NewsletterConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const success = await confirmSubscription(token).catch(() => false);

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-ink">
        {success ? "সাবস্ক্রিপশন নিশ্চিত হয়েছে ✓" : "লিঙ্কটি সঠিক নয়"}
      </h1>
      <p className="mt-3 text-sm text-slate-600">
        {success
          ? `প্রতিদিন সকালে ${BRAND.bn}-এর সেরা খবর আপনার ইনবক্সে পৌঁছে যাবে।`
          : "এই লিঙ্কটি ইতিমধ্যে ব্যবহৃত হয়েছে বা সঠিক নয়।"}
      </p>
      <a href="/" className="mt-6 inline-block bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark">
        ছবরে ফিরুন
      </a>
    </div>
  );
}
