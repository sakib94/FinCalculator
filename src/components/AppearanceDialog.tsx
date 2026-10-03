import { useEffect, useRef } from "react";
import { useT } from "@/hooks/PreferencesContext";
import { AppearanceSettings } from "@/pages/SettingsPage";
import { Icon } from "./Icon";

/**
 * Appearance settings over the current page. The calculator (or whatever
 * page you were on) stays open behind it with its inputs intact; every
 * change applies instantly, so you see it on the real page as well as in
 * the preview, and closing simply returns you to it.
 *
 * Closes with the × button, Escape or a click on the backdrop. Focus moves
 * into the dialog, Tab stays inside it, and focus returns to whatever
 * opened it.
 */
export function AppearanceDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    // A class rather than body.style, so it never fights the drawer's own
    // scroll lock when the dialog is opened from the drawer.
    document.documentElement.classList.add("dialog-open");
    closeRef.current?.focus();
    return () => {
      document.documentElement.classList.remove("dialog-open");
      // Opened from the header menu, the button that opened it has gone;
      // fall back to the menu's own button.
      const target =
        previous && previous.isConnected && previous !== document.body
          ? previous
          : document.querySelector<HTMLElement>(".theme-menu .icon-btn");
      target?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !dialogRef.current) return;
    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
      // Radio groups keep one tab stop (the others are tabIndex -1).
    ).filter((el) => el.tabIndex >= 0 && el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="dialog-scrim settings-scrim"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="dialog settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="appearance-dialog-title"
        onKeyDown={onKeyDown}
      >
        <div className="sd-head">
          <div className="sd-title-wrap">
            <span className="sd-icon" aria-hidden="true">
              <Icon name="sparkle" size={17} />
            </span>
            <div>
              <h2 id="appearance-dialog-title" className="sd-title">
                {t("Appearance")}
              </h2>
              <p className="sd-lead">
                {t("Changes apply instantly and are saved in this browser.")}
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="icon-btn sd-close"
            onClick={onClose}
            aria-label={t("Close")}
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="sd-body">
          <AppearanceSettings />
        </div>
      </div>
    </div>
  );
}
