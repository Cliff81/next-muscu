"use client";

import { useState } from "react";
import {
  googleConfigure,
  mensurations,
  profilDepuisJeton,
  profileStore,
  type Profile,
} from "@/lib/profile";
import { APP_NAME_PARTS, APP_TAGLINE } from "@/lib/app";
import { monterBoutonGoogle } from "@/lib/googleButton";

/**
 * Porte d'entrée de l'application : connexion Google, puis mensurations.
 *
 * Sans identifiant client Google configuré, l'écran demande directement la
 * taille et le poids : la fonctionnalité reste utilisable, la connexion se
 * greffe dessus quand elle est configurée.
 */
export function SignInGate({ children }: { children: React.ReactNode }) {
  const profil = profileStore.useValue();

  if (!profil) return <EcranConnexion />;
  if (profil.tailleCm === null || profil.poidsKg === null) {
    return <EcranMensurations profil={profil} />;
  }
  return <>{children}</>;
}

function Cadre({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-7">
        {children}
      </div>
    </main>
  );
}

function EcranConnexion() {
  const [erreurJeton, setErreurJeton] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const recevoirJeton = (jwt: string) => {
    const issu = profilDepuisJeton(jwt);
    if ("erreur" in issu) {
      setErreurJeton(issu.erreur);
      return;
    }
    setErreurJeton(null);
    profileStore.set(issu);
  };

  return (
    <Cadre>
      <h1 className="font-display text-5xl leading-none tracking-[0.02em]">
        {APP_NAME_PARTS[0]}
        <span className="text-accent">{APP_NAME_PARTS[1]}</span>
      </h1>
      <p className="mt-2 text-[0.85rem] text-muted">{APP_TAGLINE}</p>

      {googleConfigure() ? (
        <>
          <p className="mt-5 text-sm text-muted">
            Connecte-toi pour retrouver ton profil et tes mensurations.
          </p>
          <div
            ref={(el) => {
              if (el) void monterBoutonGoogle(el, recevoirJeton).then(setErreur);
            }}
            className="mt-5 flex justify-center"
          />
          {erreur ? <p className="mt-3 text-sm text-accent2">{erreur}</p> : null}
          {erreurJeton ? (
            <p className="mt-3 text-sm text-accent2">{erreurJeton}</p>
          ) : null}
          <button
            type="button"
            onClick={() =>
              profileStore.set({
                sub: "local",
                email: "",
                name: "Moi",
                picture: "",
                tailleCm: null,
                poidsKg: null,
              })
            }
            className="mt-5 w-full text-xs text-muted underline transition hover:text-text"
          >
            Continuer sans compte Google
          </button>
        </>
      ) : (
        <>
          <p className="mt-5 text-sm text-muted">
            Renseigne ta taille et ton poids pour commencer.
          </p>
          <button
            type="button"
            onClick={() =>
              profileStore.set({
                sub: "local",
                email: "",
                name: "Moi",
                picture: "",
                tailleCm: null,
                poidsKg: null,
              })
            }
            className="font-display mt-5 w-full rounded-md bg-accent px-4 py-2.5 text-lg text-bg transition hover:opacity-90"
          >
            Commencer
          </button>
          <p className="mt-4 text-xs text-muted">
            La connexion Google n&apos;est pas configurée sur cette installation.
          </p>
        </>
      )}
    </Cadre>
  );
}

const TAILLE_MIN = 120;
const TAILLE_MAX = 230;
const POIDS_MIN = 30;
const POIDS_MAX = 300;

export function EcranMensurations({
  profil,
  onFini,
}: {
  profil: Profile;
  onFini?: () => void;
}) {
  const [taille, setTaille] = useState(profil.tailleCm?.toString() ?? "");
  const [poids, setPoids] = useState(profil.poidsKg?.toString() ?? "");
  const [erreur, setErreur] = useState<string | null>(null);

  const valider = () => {
    const t = Number(taille.replace(",", "."));
    const p = Number(poids.replace(",", "."));
    if (!Number.isFinite(t) || t < TAILLE_MIN || t > TAILLE_MAX) {
      setErreur(`Taille attendue entre ${TAILLE_MIN} et ${TAILLE_MAX} cm.`);
      return;
    }
    if (!Number.isFinite(p) || p < POIDS_MIN || p > POIDS_MAX) {
      setErreur(`Poids attendu entre ${POIDS_MIN} et ${POIDS_MAX} kg.`);
      return;
    }
    profileStore.set({
      ...profil,
      tailleCm: Math.round(t),
      poidsKg: Math.round(p * 10) / 10,
    });
    onFini?.();
  };

  return (
    <Cadre>
      <div className="text-[0.7rem] font-medium tracking-[0.25em] text-accent uppercase">
        {profil.name}
      </div>
      <h2 className="font-display mt-2 text-3xl leading-none">Tes mensurations</h2>
      <p className="mt-3 text-sm text-muted">
        Elles servent à afficher ton profil et à situer ta progression. Le poids du
        corps est distinct des charges que tu soulèves.
      </p>

      <div className="mt-5 flex flex-col gap-4">
        <Champ
          id="taille"
          label="Taille"
          unite="cm"
          value={taille}
          onChange={setTaille}
          placeholder="180"
        />
        <Champ
          id="poids"
          label="Poids du corps"
          unite="kg"
          value={poids}
          onChange={setPoids}
          placeholder="80"
        />
      </div>

      {erreur ? <p className="mt-3 text-sm text-accent2">{erreur}</p> : null}

      <button
        type="button"
        onClick={valider}
        className="font-display mt-5 w-full rounded-md bg-accent px-4 py-2.5 text-lg text-bg transition hover:opacity-90"
      >
        {onFini ? "Enregistrer" : "C'est parti"}
      </button>

      {onFini ? (
        <button
          type="button"
          onClick={onFini}
          className="mt-3 w-full text-xs text-muted underline transition hover:text-text"
        >
          Annuler
        </button>
      ) : null}

      {mensurations(profil) ? (
        <p className="mt-4 text-xs text-muted">Actuellement : {mensurations(profil)}</p>
      ) : null}
    </Cadre>
  );
}

function Champ({
  id,
  label,
  unite,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  unite: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-[0.7rem] tracking-[0.15em] text-muted uppercase">{label}</span>
      <span className="flex items-center gap-2">
        <input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="font-display w-full rounded-md border border-border bg-bg px-3 py-2 text-2xl text-text outline-none transition focus:border-accent"
        />
        <span className="text-sm text-muted">{unite}</span>
      </span>
    </label>
  );
}
