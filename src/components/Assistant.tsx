"use client";

import { useState } from "react";
import { assistantStore, FREQUENCES, type Etape } from "@/lib/assistant";
import { chargerCatalogue, type Niveau } from "@/lib/catalogue";
import { genererProgramme, TYPES, type TypeProgramme } from "@/lib/generateProgram";
import { calculerBesoins, OBJECTIFS, type Besoins, type Objectif } from "@/lib/nutrition";
import { profileStore, type Experience, type Profile, type Sexe } from "@/lib/profile";
import { programStore } from "@/lib/stores";

const NIVEAU_DEPUIS_EXPERIENCE: Record<Experience, Niveau> = {
  debutant: "beginner",
  intermediaire: "intermediate",
  avance: "expert",
};

export function Assistant({ profil }: { profil: Profile }) {
  const [etape, setEtape] = useState<Etape>("toi");
  const [frequence, setFrequence] = useState(4);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [besoins, setBesoins] = useState<Besoins | null>(null);

  const terminer = () => assistantStore.set(true);

  const construire = async (type: TypeProgramme) => {
    setEnCours(true);
    setErreur(null);
    try {
      const catalogue = await chargerCatalogue();
      const niveau = profil.experience
        ? NIVEAU_DEPUIS_EXPERIENCE[profil.experience]
        : "intermediate";
      programStore.set(genererProgramme(catalogue, { frequence, type, niveau }));
      terminer();
    } catch {
      setErreur("Le catalogue d'exercices n'a pas pu être chargé.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Cadre etape={etape}>
      {etape === "toi" ? (
        <EtapeToi
          profil={profil}
          onSuivant={() => setEtape("objectif")}
          onPasser={() => setEtape("objectif")}
        />
      ) : etape === "objectif" ? (
        <EtapeObjectif
          onSport={() => setEtape("frequence")}
          onNutrition={() => setEtape("nutrition")}
        />
      ) : etape === "frequence" ? (
        <EtapeFrequence
          valeur={frequence}
          onChange={setFrequence}
          onSuivant={() => setEtape("type")}
        />
      ) : etape === "type" ? (
        <EtapeType
          frequence={frequence}
          enCours={enCours}
          erreur={erreur}
          onChoisir={construire}
          onRetour={() => setEtape("frequence")}
        />
      ) : (
        <EtapeNutrition
          besoins={besoins}
          onCalculer={(objectif, seances) =>
            setBesoins(calculerBesoins(profil, objectif, seances))
          }
          onTermine={terminer}
          onRetour={() => setEtape("objectif")}
        />
      )}
    </Cadre>
  );
}

const ORDRE: Etape[] = ["toi", "objectif", "frequence", "type"];

function Cadre({ etape, children }: { etape: Etape; children: React.ReactNode }) {
  const index = ORDRE.indexOf(etape);
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-10">
      <div className="mb-4 flex gap-1.5">
        {ORDRE.map((e, i) => (
          <span
            key={e}
            className={`h-1 flex-1 rounded-full transition ${
              index >= 0 && i <= index ? "bg-accent" : "bg-surface2"
            }`}
          />
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-surface p-7">{children}</div>
    </main>
  );
}

function Titre({ sur, children }: { sur: string; children: React.ReactNode }) {
  return (
    <>
      <div className="text-[0.7rem] font-medium tracking-[0.25em] text-accent uppercase">
        {sur}
      </div>
      <h2 className="font-display mt-2 text-3xl leading-none">{children}</h2>
    </>
  );
}

function Principal({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="font-display mt-6 w-full rounded-full bg-accent px-4 py-2.5 text-lg text-accent-fg transition hover:opacity-90 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Secondaire({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 w-full text-xs text-muted underline transition hover:text-text"
    >
      {children}
    </button>
  );
}

function Carte({
  titre,
  resume,
  actif,
  onClick,
}: {
  titre: string;
  resume: string;
  actif?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-4 py-3 text-left transition ${
        actif
          ? "border-accent bg-accent-soft"
          : "border-border bg-surface2 hover:border-border2"
      }`}
    >
      <div className={`font-medium ${actif ? "text-accent" : "text-text"}`}>{titre}</div>
      <div className="mt-0.5 text-xs text-muted">{resume}</div>
    </button>
  );
}

/* ---------------------------------------------------------------- étape 1 */

const SEXES: { id: Sexe; nom: string }[] = [
  { id: "homme", nom: "Homme" },
  { id: "femme", nom: "Femme" },
  { id: "autre", nom: "Autre" },
];

const EXPERIENCES: { id: Experience; nom: string }[] = [
  { id: "debutant", nom: "Débutant" },
  { id: "intermediaire", nom: "Intermédiaire" },
  { id: "avance", nom: "Avancé" },
];

function EtapeToi({
  profil,
  onSuivant,
  onPasser,
}: {
  profil: Profile;
  onSuivant: () => void;
  onPasser: () => void;
}) {
  const [taille, setTaille] = useState(profil.tailleCm?.toString() ?? "");
  const [poids, setPoids] = useState(profil.poidsKg?.toString() ?? "");
  const [age, setAge] = useState(profil.age?.toString() ?? "");
  const [sexe, setSexe] = useState<Sexe | null>(profil.sexe);
  const [experience, setExperience] = useState<Experience | null>(profil.experience);

  const nombre = (v: string, min: number, max: number): number | null => {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
  };

  const enregistrer = () => {
    profileStore.set({
      ...profil,
      tailleCm: nombre(taille, 120, 230),
      poidsKg: nombre(poids, 30, 300),
      age: nombre(age, 12, 100),
      sexe,
      experience,
    });
    onSuivant();
  };

  return (
    <>
      <Titre sur="Étape 1 sur 4">Parle-nous de toi</Titre>
      <p className="mt-3 text-sm text-muted">
        Tout est facultatif. Ces informations servent à calibrer le programme et à
        estimer tes besoins alimentaires — tu peux passer et les remplir plus tard.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Champ id="taille" label="Taille" unite="cm" value={taille} onChange={setTaille} placeholder="180" />
        <Champ id="poids" label="Poids" unite="kg" value={poids} onChange={setPoids} placeholder="80" />
        <Champ id="age" label="Âge" unite="ans" value={age} onChange={setAge} placeholder="30" />
      </div>

      <Groupe label="Sexe">
        {SEXES.map((s) => (
          <Puce key={s.id} actif={sexe === s.id} onClick={() => setSexe(sexe === s.id ? null : s.id)}>
            {s.nom}
          </Puce>
        ))}
      </Groupe>

      <Groupe label="Expérience en musculation">
        {EXPERIENCES.map((e) => (
          <Puce
            key={e.id}
            actif={experience === e.id}
            onClick={() => setExperience(experience === e.id ? null : e.id)}
          >
            {e.nom}
          </Puce>
        ))}
      </Groupe>

      <Principal onClick={enregistrer}>Continuer</Principal>
      <Secondaire onClick={onPasser}>Passer cette étape</Secondaire>
    </>
  );
}

function Groupe({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="text-[0.7rem] tracking-[0.15em] text-muted uppercase">{label}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Puce({
  actif,
  onClick,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm transition ${
        actif
          ? "border-accent bg-accent-soft font-medium text-accent"
          : "border-border2 text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
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
      <span className="flex items-baseline gap-1">
        <input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="font-display w-full rounded-xl border border-border bg-bg px-3 py-2 text-2xl text-text outline-none transition focus:border-accent"
        />
        <span className="text-xs text-muted">{unite}</span>
      </span>
    </label>
  );
}

/* ---------------------------------------------------------------- étape 2 */

function EtapeObjectif({
  onSport,
  onNutrition,
}: {
  onSport: () => void;
  onNutrition: () => void;
}) {
  return (
    <>
      <Titre sur="Étape 2 sur 4">Sur quoi veux-tu agir ?</Titre>
      <div className="mt-5 flex flex-col gap-2">
        <Carte
          titre="Programme sportif"
          resume="On te construit un programme d'entraînement complet"
          onClick={onSport}
        />
        <Carte
          titre="Alimentation"
          resume="On estime tes besoins en calories et en macronutriments"
          onClick={onNutrition}
        />
      </div>
      <p className="mt-4 text-xs text-muted">
        Tu pourras relancer l&apos;assistant pour l&apos;autre volet depuis ton profil.
      </p>
    </>
  );
}

/* ---------------------------------------------------------------- étape 3 */

function EtapeFrequence({
  valeur,
  onChange,
  onSuivant,
}: {
  valeur: number;
  onChange: (v: number) => void;
  onSuivant: () => void;
}) {
  const choisie = FREQUENCES.find((f) => f.jours === valeur);
  return (
    <>
      <Titre sur="Étape 3 sur 4">Combien de séances par semaine ?</Titre>
      <p className="mt-3 text-sm text-muted">
        Plus de séances, c&apos;est plus de volume d&apos;entraînement, donc des
        progrès plus rapides. Jusqu&apos;à un point : au-delà de cinq jours, c&apos;est
        la récupération qui limite, pas l&apos;entraînement.
      </p>
      <div className="mt-5 flex flex-wrap gap-1.5">
        {FREQUENCES.map((f) => (
          <button
            key={f.jours}
            type="button"
            onClick={() => onChange(f.jours)}
            className={`font-display size-12 rounded-full border text-xl transition ${
              valeur === f.jours
                ? "border-accent bg-accent text-accent-fg"
                : "border-border2 text-muted hover:text-text"
            }`}
          >
            {f.jours}
          </button>
        ))}
      </div>
      {choisie ? (
        <p className="mt-4 rounded-xl bg-surface2 px-4 py-3 text-sm text-muted">
          <span className="text-text">{choisie.jours} séances</span> — {choisie.note}
        </p>
      ) : null}
      <Principal onClick={onSuivant}>Continuer</Principal>
    </>
  );
}

/* ---------------------------------------------------------------- étape 4 */

function EtapeType({
  frequence,
  enCours,
  erreur,
  onChoisir,
  onRetour,
}: {
  frequence: number;
  enCours: boolean;
  erreur: string | null;
  onChoisir: (t: TypeProgramme) => void;
  onRetour: () => void;
}) {
  const adaptes = TYPES.filter((t) => t.jours.includes(frequence));
  const autres = TYPES.filter((t) => !t.jours.includes(frequence));

  return (
    <>
      <Titre sur="Étape 4 sur 4">Quel type de programme ?</Titre>
      <p className="mt-3 text-sm text-muted">
        Adaptés à {frequence} séance{frequence > 1 ? "s" : ""} par semaine :
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {adaptes.map((t) => (
          <Carte key={t.id} titre={t.nom} resume={t.resume} onClick={() => onChoisir(t.id)} />
        ))}
      </div>
      {autres.length ? (
        <>
          <p className="mt-5 text-xs text-muted">
            Possibles, mais mieux adaptés à un autre nombre de séances :
          </p>
          <div className="mt-2 flex flex-col gap-2 opacity-60">
            {autres.map((t) => (
              <Carte
                key={t.id}
                titre={t.nom}
                resume={`${t.resume} — conçu pour ${t.jours.join(", ")} jours`}
                onClick={() => onChoisir(t.id)}
              />
            ))}
          </div>
        </>
      ) : null}
      {enCours ? <p className="mt-4 text-sm text-muted">Construction du programme…</p> : null}
      {erreur ? <p className="mt-4 text-sm text-accent2">{erreur}</p> : null}
      <Secondaire onClick={onRetour}>← Changer la fréquence</Secondaire>
    </>
  );
}

/* ------------------------------------------------------------- nutrition */

function EtapeNutrition({
  besoins,
  onCalculer,
  onTermine,
  onRetour,
}: {
  besoins: Besoins | null;
  onCalculer: (o: Objectif, seances: number) => void;
  onTermine: () => void;
  onRetour: () => void;
}) {
  const [objectif, setObjectif] = useState<Objectif>("masse");
  const [seances, setSeances] = useState(4);

  return (
    <>
      <Titre sur="Alimentation">Tes besoins estimés</Titre>
      <p className="mt-3 text-sm text-muted">
        Calcul par la formule de Mifflin-St Jeor. Ce sont des estimations de
        population : prends-les comme point de départ et ajuste-les sur
        l&apos;évolution réelle de ton poids.
      </p>

      <div className="mt-5 flex flex-col gap-2">
        {OBJECTIFS.map((o) => (
          <Carte
            key={o.id}
            titre={o.nom}
            resume={o.resume}
            actif={objectif === o.id}
            onClick={() => setObjectif(o.id)}
          />
        ))}
      </div>

      <Groupe label="Séances par semaine">
        {FREQUENCES.map((f) => (
          <Puce key={f.jours} actif={seances === f.jours} onClick={() => setSeances(f.jours)}>
            {f.jours}
          </Puce>
        ))}
      </Groupe>

      <Principal onClick={() => onCalculer(objectif, seances)}>Calculer</Principal>

      {besoins && "manquant" in besoins ? (
        <p className="mt-4 rounded-xl bg-surface2 px-4 py-3 text-sm text-muted">
          Il manque {besoins.manquant.join(", ")} pour faire ce calcul. Renseigne-les
          dans ton profil, puis reviens ici.
        </p>
      ) : besoins ? (
        <>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Tuile valeur={`${besoins.calories}`} unite="kcal/jour" label="Objectif" fort />
            <Tuile valeur={`${besoins.proteines}`} unite="g" label="Protéines" />
            <Tuile valeur={`${besoins.glucides}`} unite="g" label="Glucides" />
            <Tuile valeur={`${besoins.lipides}`} unite="g" label="Lipides" />
          </div>
          <p className="mt-3 text-xs text-muted">
            Métabolisme de base {besoins.metabolismeBase} kcal · dépense estimée{" "}
            {besoins.depenseTotale} kcal
            {besoins.approximeSexe
              ? " · sexe non renseigné : valeur intermédiaire entre les deux formules"
              : ""}
          </p>
          <Principal onClick={onTermine}>Terminer</Principal>
        </>
      ) : null}

      <Secondaire onClick={onRetour}>← Retour</Secondaire>
    </>
  );
}

function Tuile({
  valeur,
  unite,
  label,
  fort,
}: {
  valeur: string;
  unite: string;
  label: string;
  fort?: boolean;
}) {
  return (
    <div className={`rounded-xl px-4 py-3 ${fort ? "bg-accent-soft" : "bg-calm-soft"}`}>
      <div className={`font-display text-2xl leading-none ${fort ? "text-accent" : "text-text"}`}>
        {valeur}
        <span className="ml-1 text-xs text-muted">{unite}</span>
      </div>
      <div className="mt-1 text-[0.7rem] tracking-[0.15em] text-muted uppercase">{label}</div>
    </div>
  );
}
