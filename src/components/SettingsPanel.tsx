"use client";

import { Modal } from "@/components/Modal";
import { playBeep, playPreAlert } from "@/lib/beep";
import { PRE_ALERTS, type Settings } from "@/lib/settings";
import { settingsStore } from "@/lib/stores";

/**
 * Réglages. Chaque changement s'applique aussitôt et suit le profil vers
 * Convex ; le son et la vibration se testent sur place, parce qu'un réglage
 * qu'on ne peut pas entendre avant la séance se découvre au mauvais moment.
 */
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const settings = settingsStore.useValue();
  const poser = (patch: Partial<Settings>) => settingsStore.set({ ...settings, ...patch });

  return (
    <Modal title="Réglages" onClose={onClose}>
      <div className="flex flex-col gap-5">
        <Champ
          titre="Pré-alerte de fin de repos"
          note="Un premier signal, plus doux, quelques secondes avant la fin — le temps de te relever."
        >
          <div className="flex flex-wrap gap-1.5">
            {PRE_ALERTS.map((s) => (
              <Pastille key={s} active={settings.preAlert === s} onClick={() => poser({ preAlert: s })}>
                {s === 0 ? "Aucune" : `${s} s`}
              </Pastille>
            ))}
          </div>
        </Champ>

        <Champ titre="Signal" note="La fin du repos bipe et vibre. Coupe l'un ou l'autre selon la salle.">
          <div className="flex flex-wrap items-center gap-1.5">
            <Pastille active={settings.sound} onClick={() => poser({ sound: !settings.sound })}>
              Son {settings.sound ? "activé" : "coupé"}
            </Pastille>
            <Pastille active={settings.vibrate} onClick={() => poser({ vibrate: !settings.vibrate })}>
              Vibration {settings.vibrate ? "activée" : "coupée"}
            </Pastille>
            <button
              type="button"
              onClick={() => {
                if (settings.preAlert > 0) playPreAlert(settings);
                window.setTimeout(() => playBeep(settings), settings.preAlert > 0 ? 700 : 0);
              }}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition hover:border-accent hover:text-accent"
            >
              ▶ Tester
            </button>
          </div>
        </Champ>

        <Champ titre="Nutrition" note="Le volet Nutrition est clair par défaut. En sombre, il garde son vert.">
          <div className="flex flex-wrap gap-1.5">
            <Pastille
              active={settings.nutritionTheme === "light"}
              onClick={() => poser({ nutritionTheme: "light" })}
            >
              Clair
            </Pastille>
            <Pastille
              active={settings.nutritionTheme === "dark"}
              onClick={() => poser({ nutritionTheme: "dark" })}
            >
              Sombre
            </Pastille>
          </div>
        </Champ>
      </div>
    </Modal>
  );
}

function Champ({ titre, note, children }: { titre: string; note: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[0.7rem] tracking-[0.12em] text-muted uppercase">{titre}</div>
      <div className="mt-2">{children}</div>
      <p className="mt-1.5 text-[0.75rem] text-muted">{note}</p>
    </div>
  );
}

function Pastille({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
        active
          ? "border-accent bg-accent-soft font-medium text-accent"
          : "border-border2 text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}
