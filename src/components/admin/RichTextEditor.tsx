"use client";

import { useEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const BTNS: { cmd: string; arg?: string; label: string; title: string }[] = [
  { cmd: "bold", label: "B", title: "Bold" },
  { cmd: "italic", label: "I", title: "Italic" },
  { cmd: "underline", label: "U", title: "Underline" },
  { cmd: "formatBlock", arg: "h3", label: "H", title: "Heading" },
  { cmd: "formatBlock", arg: "p", label: "¶", title: "Paragraph" },
  { cmd: "insertUnorderedList", label: "• List", title: "Bullet list" },
  { cmd: "insertOrderedList", label: "1. List", title: "Numbered list" },
];

/**
 * Lightweight rich-text editor for ad descriptions.
 * Produces simple HTML (p/strong/em/u/h3/lists/links) which is
 * re-sanitized server-side on save — XSS safe by construction.
 */
export default function RichTextEditor({ value, onChange, placeholder }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
    // Only sync external value changes (edit mode load).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function exec(cmd: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
  }

  function makeLink() {
    const url = window.prompt("Link URL (https://…):");
    if (url && /^(https?:\/\/|mailto:)/i.test(url)) {
      exec("createLink", url);
    } else if (url) {
      alert("Sirf http(s) ya mailto links allowed hain.");
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-brand">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
        {BTNS.map((b) => (
          <button
            key={b.cmd + (b.arg ?? "")}
            type="button"
            title={b.title}
            onMouseDown={(e) => {
              e.preventDefault();
              exec(b.cmd, b.arg);
            }}
            className="min-w-8 rounded px-2 py-1 text-xs font-bold text-slate-600 transition hover:bg-brand hover:text-white"
          >
            {b.label}
          </button>
        ))}
        <button
          type="button"
          title="Link"
          onMouseDown={(e) => {
            e.preventDefault();
            makeLink();
          }}
          className="rounded px-2 py-1 text-xs font-bold text-slate-600 transition hover:bg-brand hover:text-white"
        >
          🔗 Link
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder ?? "Description"}
        data-placeholder={placeholder}
        onInput={() => onChange(ref.current?.innerHTML ?? "")}
        onBlur={() => onChange(ref.current?.innerHTML ?? "")}
        className="rich-editor min-h-36 max-h-72 overflow-y-auto px-3 py-2 text-sm leading-relaxed outline-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]"
      />
    </div>
  );
}
