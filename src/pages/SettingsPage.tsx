import { LANGS } from "@/i18n";
import {
  DEFAULT_APPEARANCE,
  describeAppearance,
  themeById,
} from "@/theme/appearance";
import { useAppearance, useLanguage, useT } from "@/hooks/PreferencesContext";
import { Link } from "@/lib/router";
import { formatINR, formatSignedINR } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import {
  DensityControl,
  RadioGroup,
  ThemeControl,
  ThemeModeControl,
} from "@/components/AppearanceControls";
import { Marker } from "@/components/Chart";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";

/**
 * Settings › Appearance as a page (/settings/). The same controls also open
 * as a dialog over any page — see AppearanceDialog.
 */
export function SettingsPage() {
  const t = useT();
  return (
    <div className="page settings-page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">{t("Home")}</Link>
        <span>/</span>
        <span aria-current="page">{t("Settings")}</span>
      </nav>

      <PageHeader
        icon="sparkle"
        eyebrow={t("Settings")}
        title={t("Appearance")}
        lead={t(
          "Choose how PaiseWise looks on this device. Changes apply instantly and are saved in this browser.",
        )}
      />

      <AppearanceSettings />
    </div>
  );
}

/**
 * The appearance controls and their live preview. Every control applies
 * the moment it changes and is saved on this device; the preview is built
 * from the same components the calculators use, so what it shows is what
 * you get.
 */
export function AppearanceSettings() {
  const t = useT();
  const { themeMode, resolvedMode, theme, density, resetAppearance } =
    useAppearance();
  const { lang, setLang } = useLanguage();
  const { notify } = useToast();

  const isDefault =
    themeMode === DEFAULT_APPEARANCE.themeMode &&
    theme === DEFAULT_APPEARANCE.theme &&
    density === DEFAULT_APPEARANCE.density;

  return (
    <div className="settings-layout">
      <div className="settings-panel">
        <section className="setting" aria-labelledby="set-mode">
          <div className="setting-head setting-head-row">
            <div>
              <h2 id="set-mode">{t("Mode")}</h2>
              <p>{t("Light, dark, or Auto to match your device.")}</p>
            </div>
            <span className="setting-status">
              {describeAppearance({ theme, themeMode }, resolvedMode, t)}
            </span>
          </div>
          <ThemeModeControl size="lg" />
          {themeMode === "system" && (
            <p className="setting-note">
              <Icon name="monitor" size={14} />
              {resolvedMode === "dark"
                ? t("Your device is set to dark, so PaiseWise is dark too.")
                : t("Your device is set to light, so PaiseWise is light too.")}
            </p>
          )}
        </section>

        <section className="setting" aria-labelledby="set-theme">
          <div className="setting-head">
            <h2 id="set-theme">{t("Theme")}</h2>
            <p>
              {t(
                "Each theme pairs two tones and has a light and a dark version. Gains, costs and warnings always keep their own colours.",
              )}
            </p>
          </div>
          <ThemeControl size="lg" />
        </section>

        <section className="setting" aria-labelledby="set-density">
          <div className="setting-head">
            <h2 id="set-density">{t("Interface density")}</h2>
            <p>
              {t(
                "Compact tightens cards, fields and table rows to fit more on screen.",
              )}
            </p>
          </div>
          <DensityControl size="lg" />
        </section>

        <section className="setting" aria-labelledby="set-lang">
          <div className="setting-head">
            <h2 id="set-lang">{t("Language")}</h2>
            <p>
              {t("Labels and menus. Calculator explanations stay in English.")}
            </p>
          </div>
          <RadioGroup
            label={t("Language")}
            value={lang}
            options={LANGS.map((l) => ({ id: l.id, label: l.native }))}
            onChange={setLang}
            className="choice-seg lg"
            render={(o) => <span lang={o.id}>{o.label}</span>}
          />
        </section>

        <div className="setting-foot">
          <button
            type="button"
            className="btn ghost sm"
            disabled={isDefault}
            onClick={() => {
              resetAppearance();
              notify(t("Appearance reset to defaults"));
            }}
          >
            <Icon name="refresh" size={15} />
            {t("Reset appearance")}
          </button>
          <span className="small muted">
            <Icon name="lock" size={13} /> {t("Saved on this device only.")}
          </span>
        </div>
      </div>

      <aside className="settings-preview" aria-labelledby="preview-head">
        <p className="section-label" id="preview-head">
          {t("Preview")}
        </p>
        <AppearancePreview themeLabel={themeById(theme).label} />
      </aside>
    </div>
  );
}

/**
 * A small, live sample of the system: result card, buttons, an input,
 * status badges, a table with signed amounts, notes and chart colours.
 * Real component classes, so it changes exactly as the app does.
 */
function AppearancePreview({ themeLabel }: { themeLabel: string }) {
  const t = useT();
  const rows = [
    {
      label: t("Salary credited"),
      amount: formatSignedINR(85000),
      tone: "pos",
      status: "settled",
    },
    {
      label: t("Home loan EMI"),
      amount: formatSignedINR(-43391),
      tone: "neg",
      status: "settled",
    },
    {
      label: t("SIP instalment"),
      amount: formatINR(10000),
      tone: "",
      status: "pending",
    },
  ] as const;

  return (
    <div className="preview card" aria-hidden="false">
      <div className="hero-result preview-hero">
        <div className="h-label">{t("Available balance")}</div>
        <div className="h-value num">₹25,450</div>
        <div className="h-caption">
          {t("Theme")}: {t(themeLabel)}
        </div>
      </div>

      <div className="preview-row">
        <button type="button" className="btn sm" tabIndex={-1}>
          <Icon name="sparkle" size={14} />
          {t("Add expense")}
        </button>
        <button type="button" className="btn secondary sm" tabIndex={-1}>
          {t("Export")}
        </button>
        <button type="button" className="btn sm" disabled tabIndex={-1}>
          {t("Disabled")}
        </button>
      </div>

      <label className="field preview-field">
        <span className="field-label">{t("Amount")}</span>
        <span className="input-wrap">
          <span className="affix left" aria-hidden="true">
            ₹
          </span>
          <input
            className="input"
            defaultValue="5,000"
            inputMode="numeric"
            tabIndex={-1}
          />
        </span>
      </label>

      <div className="preview-row">
        <span className="badge positive">
          <Icon name="check" size={12} strokeWidth={2.4} /> {t("Settled")}
        </span>
        <span className="badge warning">
          <Icon name="refresh" size={12} /> {t("Pending")}
        </span>
        <span className="badge negative">
          <Icon name="alert" size={12} /> {t("Failed")}
        </span>
        <span className="badge brand">{t("New")}</span>
      </div>

      <div className="table-scroll preview-table">
        <table className="data">
          <thead>
            <tr>
              <th scope="col">{t("Item")}</th>
              <th scope="col">{t("Amount")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.label} className={i === 0 ? "is-selected" : undefined}>
                <th scope="row">{r.label}</th>
                <td className={`amount ${r.tone}`}>
                  {r.amount}
                  {r.status === "pending" && (
                    <span className="amount-status"> · {t("Pending")}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="preview-notes">
        <div className="note success">
          <Icon name="check" size={15} className="i" />
          <div>{t("Payment settled.")}</div>
        </div>
        <div className="note warn">
          <Icon name="alert" size={15} className="i" />
          <div>{t("Action needed: add your PAN.")}</div>
        </div>
        <div className="note error">
          <Icon name="alert" size={15} className="i" />
          <div>{t("Could not save — try again.")}</div>
        </div>
      </div>

      <div className="preview-chart">
        <span className="small muted">{t("Chart colours")}</span>
        <span className="preview-series">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="ps-item">
              <Marker index={i} />
              <span
                className="ps-bar"
                style={{
                  background: `var(--series-${i + 1})`,
                  width: `${38 - i * 6}px`,
                }}
              />
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
