"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { addWeight, latestWeight, removeWeight, weightTrend } from "@/lib/bodyWeight";
import { decimal, kilos } from "@/lib/format";
import { profileStore } from "@/lib/profile";
import { weightsStore } from "@/lib/stores";
import { notify } from "@/lib/toast";

const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const leJour = (date: string, long = false) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(
    "fr-FR",
    long ? { weekday: "long", day: "2-digit", month: "long" } : { day: "2-digit", month: "2-digit" }
  );

const signe = (delta: number) => (delta > 0 ? `+${decimal(delta)}` : decimal(delta));

/**
 * Poids de corps : journal, tendance, courbe.
 *
 * La dernière pesée devient le poids du profil : la nutrition et les hauts
 * faits « part du poids de corps » suivent sans qu'on ait à ressaisir quoi que
 * ce soit. Le journal reste la source ; le profil n'en garde que le dernier
 * état.
 */
export function BodyWeightSection() {
  const pesees = weightsStore.useValue();
  const profile = profileStore.useValue();
  const [date, setDate] = useState(aujourdhui);
  const [kg, setKg] = useState("");

  const derniere = latestWeight(pesees);
  const t7 = useMemo(() => weightTrend(pesees, 7), [pesees]);
  const t30 = useMemo(() => weightTrend(pesees, 30), [pesees]);
  const points = useMemo(
    () => pesees.map((e) => ({ ...e, label: leJour(e.date) })),
    [pesees]
  );

  const valeur = Number.parseFloat(kg.replace(",", "."));
  const valide = date.length === 10 && Number.isFinite(valeur) && valeur > 0 && valeur < 500;

  const noter = () => {
    if (!valide) return;
    const entree = { date, kg: valeur };
    const liste = addWeight(weightsStore.get(), entree);
    weightsStore.set(liste);
    // Le profil suit la pesée la plus récente — pas forcément celle qu'on
    // vient de saisir, si l'on complète un jour passé.
    const recente = latestWeight(liste);
    if (profile && recente && profile.weightKg !== recente.kg) {
      profileStore.set({ ...profile, weightKg: recente.kg });
    }
    setKg("");
    notify(`${kilos(entree.kg)} noté le ${leJour(entree.date, true)}.`);
  };

  return (
    <section className="mt-10">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl text-accent2">Poids de corps</h2>
        {derniere && (
          <span className="text-[0.8rem] text-muted">
            <span className="font-display text-lg text-accent">{kilos(derniere.kg)}</span> le{" "}
            {leJour(derniere.date)}
          </span>
        )}
      </div>

      {(t7 || t30) && (
        <div className="mb-3 flex flex-wrap gap-3">
          {t7 && <Tendance titre={`Sur ${t7.days} jours`} delta={t7.delta} />}
          {t30 && <Tendance titre={`Sur ${t30.days} jours`} delta={t30.delta} />}
        </div>
      )}

      {points.length >= 2 ? (
        <div className="h-[220px] rounded-lg border border-border bg-surface p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#222" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#666" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#666"
                fontSize={11}
                tickLine={false}
                width={40}
                domain={["dataMin - 1", "dataMax + 1"]}
              />
              <Tooltip
                contentStyle={{ background: "#111111", border: "1px solid #222", borderRadius: 8 }}
                labelStyle={{ color: "#f0f0f0" }}
                formatter={(v) => [`${decimal(Number(v))} kg`, "Poids"]}
              />
              <Line type="monotone" dataKey="kg" name="Poids (kg)" stroke="#5eb8ff" strokeWidth={2} dot={{ r: 3, fill: "#5eb8ff" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border bg-surface px-4 py-3 text-sm text-muted">
          {points.length === 0
            ? "Aucune pesée notée. Une par semaine, le matin à jeun, suffit à voir la tendance."
            : "Une seconde pesée et la courbe apparaît."}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-[0.7rem] tracking-[0.1em] text-muted uppercase">
          Jour
          <input
            type="date"
            value={date}
            max={aujourdhui()}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-border bg-surface2 px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-[0.7rem] tracking-[0.1em] text-muted uppercase">
          Poids (kg)
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min={20}
            max={400}
            value={kg}
            placeholder={derniere ? String(derniere.kg) : "80"}
            onChange={(e) => setKg(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") noter();
            }}
            className="w-28 rounded-md border border-border bg-surface2 px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={noter}
          disabled={!valide}
          className="rounded-md bg-accent px-4 py-2 text-sm font-bold text-accent-fg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Noter
        </button>
      </div>

      {pesees.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5">
          {[...pesees].reverse().slice(0, 6).map((e) => (
            <li
              key={e.date}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-[0.85rem]"
            >
              <span>
                <span className="text-muted">{leJour(e.date, true)}</span> · {kilos(e.kg)}
              </span>
              <button
                type="button"
                onClick={() => {
                  const liste = removeWeight(weightsStore.get(), e.date);
                  weightsStore.set(liste);
                  const recente = latestWeight(liste);
                  if (profile && recente && profile.weightKg !== recente.kg) {
                    profileStore.set({ ...profile, weightKg: recente.kg });
                  }
                  notify("Pesée retirée.");
                }}
                aria-label={`Retirer la pesée du ${leJour(e.date, true)}`}
                title="Retirer cette pesée"
                className="rounded-md border border-border px-2 py-1 text-xs text-muted transition hover:border-neg hover:text-neg"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Tendance({ titre, delta }: { titre: string; delta: number }) {
  const couleur = delta === 0 ? "text-muted" : delta < 0 ? "text-accent" : "text-accent2";
  return (
    <div className="rounded-2xl bg-calm-soft px-4 py-2">
      <div className={`font-display text-xl leading-none ${couleur}`}>{signe(delta)} kg</div>
      <div className="mt-1 text-[0.65rem] tracking-[0.15em] text-muted uppercase">{titre}</div>
    </div>
  );
}
