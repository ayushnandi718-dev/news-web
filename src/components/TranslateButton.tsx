"use client";

import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: { translate?: { TranslateElement?: new (o: object, e: string) => void } };
    googleTranslateElementInit?: () => void;
  }
}

const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "bn", label: "বাংলা" },
  { code: "ur", label: "اردو" },
  { code: "ta", label: "தமிழ்" },
  { code: "te", label: "తెలుగు" },
  { code: "mr", label: "मराठी" },
  { code: "gu", label: "ગુજરાતી" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "ml", label: "മലയാളം" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
  { code: "ne", label: "नेपाली" },
  { code: "si", label: "සිංහල" },
  { code: "my", label: "မြန်မာ" },
  { code: "th", label: "ไทย" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "zh-CN", label: "中文 (简体)" },
  { code: "zh-TW", label: "中文 (繁體)" },
  { code: "ar", label: "العربية" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "ru", label: "Русский" },
  { code: "it", label: "Italiano" },
  { code: "nl", label: "Nederlands" },
  { code: "tr", label: "Türkçe" },
  { code: "id", label: "Bahasa Indonesia" },
];

function loadGoogleTranslateScript(): Promise<void> {
  return new Promise((resolve) => {
    if (document.getElementById("google-translate-script")) {
      resolve();
      return;
    }
    window.googleTranslateElementInit = () => {
      const g = window.google?.translate;
      if (g?.TranslateElement) {
        new g.TranslateElement(
          { pageLanguage: "bn", autoDisplay: false },
          "google_translate_element"
        );
      }
      resolve();
    };
    const s = document.createElement("script");
    s.id = "google-translate-script";
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    document.head.appendChild(s);
  });
}

function setGoogleTranslateLang(lang: string) {
  const sel = document.querySelector("select.goog-te-combo") as HTMLSelectElement | null;
  if (sel) {
    sel.value = lang;
    sel.dispatchEvent(new Event("change"));
  }
}

export default function TranslateButton() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !loaded) {
      loadGoogleTranslateScript().then(() => setLoaded(true));
    }
  }, [open, loaded]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const translate = useCallback(
    (lang: string) => {
      if (lang === "bn") {
        setActive(null);
        const frame = document.querySelector("iframe.skiptranslate") as HTMLIFrameElement | null;
        if (frame) frame.style.display = "none";
        return;
      }
      setActive(lang);
      setGoogleTranslateLang(lang);
    },
    []
  );

  return (
    <div className="relative inline-block" ref={panelRef}>
      {/* Hidden container for Google Translate widget */}
      <div id="google_translate_element" className="hidden" />

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand hover:text-brand active:bg-slate-100"
        aria-label="Translate article"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M3 5h12M9 3v2m1.048 3.5A18.02 18.02 0 0 1 12 9c1.2 0 2.35.28 3.4.8M15 11l-3 3 3 3" />
          <path d="M5.05 6.5A18.02 18.02 0 0 0 5 9c0 4.42 3.58 8 8 8 1.1 0 2.15-.22 3.1-.63" />
          <path d="M14.5 17.5L12 21l-2.5-3.5" />
        </svg>
        {active ? LANGUAGES.find((l) => l.code === active)?.label || "Translate" : "Translate"}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Translate to
          </p>
          <div className="max-h-72 overflow-y-auto">
            <button
              onClick={() => {
                translate("bn");
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition ${
                active === null ? "bg-brand/10 font-bold text-brand" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              বাংলা (Original)
            </button>
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  translate(l.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition ${
                  active === l.code ? "bg-brand/10 font-bold text-brand" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
