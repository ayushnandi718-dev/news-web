"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type ToastKind = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ModalOptions {
  title: string;
  content: React.ReactNode;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /** red destructive styling */
  danger?: boolean;
}

interface UIApi {
  toast(message: string, kind?: ToastKind): void;
  confirm(options: ConfirmOptions | string): Promise<boolean>;
  modal(options: ModalOptions): void;
}

const UICtx = createContext<UIApi | null>(null);

/** useUI() → { toast(msg, 'success'|'error'|…), confirm({title, danger}) : Promise<boolean> } */
export function useUI(): UIApi {
  const ctx = useContext(UICtx);
  if (!ctx) throw new Error("useUI must be used inside <UIProvider>");
  return ctx;
}

const TOAST_STYLE: Record<ToastKind, { wrap: string; icon: React.ReactElement }> = {
  success: {
    wrap: "border-emerald-200 bg-white",
    icon: (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      </span>
    ),
  },
  error: {
    wrap: "border-red-200 bg-white",
    icon: (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </span>
    ),
  },
  warning: {
    wrap: "border-amber-200 bg-white",
    icon: (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
      </span>
    ),
  },
  info: {
    wrap: "border-blue-200 bg-white",
    icon: (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 16v-4m0-4h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" /></svg>
      </span>
    ),
  },
};

interface DialogState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export default function UIProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [modal, setModal] = useState<ModalOptions | null>(null);
  const idRef = useRef(0);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id = ++idRef.current;
      setToasts((t) => [...t.slice(-4), { id, kind, message }]);
      window.setTimeout(() => dismiss(id), kind === "error" ? 6000 : 3800);
    },
    [dismiss]
  );

  const confirm = useCallback((options: ConfirmOptions | string) => {
    const opts: ConfirmOptions = typeof options === "string" ? { title: options } : options;
    return new Promise<boolean>((resolve) => setDialog({ ...opts, resolve }));
  }, []);

  const openModal = useCallback((options: ModalOptions) => {
    setModal(options);
  }, []);

  useEffect(() => {
    if (!modal) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setModal(null);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [modal]);

  function answer(value: boolean) {
    dialog?.resolve(value);
    setDialog(null);
  }

  useEffect(() => {
    if (!dialog) return;
    confirmBtnRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") answer(false);
      if (e.key === "Enter") answer(true);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog]);

  return (
    <UICtx.Provider value={{ toast, confirm, modal: openModal }}>
      {children}

      {/* ===== Toast stack ===== */}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[120] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`animate-ui-toast pointer-events-auto flex items-start gap-2.5 rounded-xl border p-3 shadow-lg ${TOAST_STYLE[t.kind].wrap}`}
          >
            {TOAST_STYLE[t.kind].icon}
            <p className="min-w-0 flex-1 pt-0.5 text-[13px] font-semibold leading-snug text-slate-800">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="-mr-1 -mt-1 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
      </div>

      {/* ===== Confirm dialog ===== */}
      {dialog && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div className="animate-ui-overlay absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]" onClick={() => answer(false)} aria-hidden="true" />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label={dialog.title}
            className="animate-ui-pop relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  dialog.danger ? "bg-red-100 text-red-600" : "bg-brand/10 text-brand"
                }`}
              >
                {dialog.danger ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 16v-4m0-4h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" /></svg>
                )}
              </span>
              <div className="min-w-0">
                <h2 className="text-[15px] font-bold leading-snug text-slate-900">{dialog.title}</h2>
                {dialog.message && <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{dialog.message}</p>}
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => answer(false)}
                className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                {dialog.cancelText ?? "Cancel"}
              </button>
              <button
                ref={confirmBtnRef}
                onClick={() => answer(true)}
                className={`rounded-lg px-3.5 py-1.5 text-[13px] font-bold text-white transition ${
                  dialog.danger ? "bg-red-600 hover:bg-red-700" : "bg-brand hover:bg-brand-dark"
                }`}
              >
                {dialog.confirmText ?? "OK"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Content modal ===== */}
      {modal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div className="animate-ui-overlay absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]" onClick={() => setModal(null)} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={modal.title}
            className="animate-ui-pop relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
          >
            <div className="mb-3 flex items-start gap-2">
              <h2 className="mr-auto text-[15px] font-bold leading-snug text-slate-900">{modal.title}</h2>
              <button
                onClick={() => setModal(null)}
                aria-label="Close"
                className="-mt-1 -mr-1 rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            {modal.content}
          </div>
        </div>
      )}
    </UICtx.Provider>
  );
}
