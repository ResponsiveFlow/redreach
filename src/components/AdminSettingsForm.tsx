"use client";

import { useActionState } from "react";
import { saveSettingsAction, type AdminState } from "@/app/admin/actions";
import { SETTING_LIMITS, type SettingKey } from "@/lib/admin-config";
import { useI18n } from "@/lib/i18n/client";

export type SettingsValues = {
  countdownEnabled: boolean;
  countdownAt: string; // "YYYY-MM-DDTHH:mm", ora di Roma
  sector_cols: number;
  sector_rows: number;
  sector_fill_pct: number;
  hold_minutes: number;
  deposits_min: number;
  deposits_max: number;
};

const label = "flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider opacity-90";
const hint = "text-xs font-normal normal-case tracking-normal opacity-60";

export function AdminSettingsForm({ values }: { values: SettingsValues }) {
  const { t } = useI18n();
  const a = t.admin;
  const [state, action, pending] = useActionState<AdminState, FormData>(saveSettingsAction, null);

  const numField = (k: SettingKey, title: string, help: string, step = 1) => (
    <label className={label}>
      {title}
      <input
        className="field"
        name={k}
        type="number"
        inputMode="decimal"
        step={step}
        min={SETTING_LIMITS[k].min}
        max={SETTING_LIMITS[k].max}
        defaultValue={values[k]}
        required
      />
      <span className={hint}>{help}</span>
    </label>
  );

  return (
    <form action={action} className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-radar">{a.launchTitle}</h2>
        <p className="text-sm opacity-80">{a.launchText}</p>
        <label className="flex items-center gap-3 text-base font-bold">
          <input
            type="checkbox"
            name="countdown_enabled"
            defaultChecked={values.countdownEnabled}
            className="size-6 accent-[var(--mars)]"
          />
          {a.countdownOn}
        </label>
        <label className={label}>
          {a.countdownAt}
          <input className="field" type="datetime-local" name="countdown_at" defaultValue={values.countdownAt} />
          <span className={hint}>{a.countdownTz}</span>
        </label>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-radar">{a.sectorsTitle}</h2>
        <p className="text-sm opacity-80">{a.sectorsText}</p>
        {numField("sector_fill_pct", a.fillPct, a.fillPctHelp)}
        <div className="grid grid-cols-2 gap-3">
          {numField("sector_cols", a.cols, a.colsHelp)}
          {numField("sector_rows", a.rows, a.rowsHelp)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {numField("deposits_min", a.depositsMin, a.depositsHelp)}
          {numField("deposits_max", a.depositsMax, a.depositsHelp)}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-radar">{a.holdTitle}</h2>
        {numField("hold_minutes", a.holdMinutes, a.holdHelp)}
      </section>

      {state && !state.ok && (
        <p role="alert" className="text-sm font-bold text-orange">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-sm font-bold text-radar">
          {a.saved}
        </p>
      )}
      <button className="btn" disabled={pending}>
        {pending ? a.saving : a.save}
      </button>
    </form>
  );
}
