"use client";

import { useState } from "react";
import { onboardingStore, FREQUENCIES, SESSION_TIMES, type Step } from "@/lib/onboarding";
import { loadCatalog, type Level } from "@/lib/catalog";
import {
  generateProgram,
  MUSCLE_GROUPS,
  PROGRAM_TYPES,
  type Place,
  type ProgramType,
} from "@/lib/generateProgram";
import {
  MAX_EXERCISES,
  MIN_EXERCISES,
  draftTitle,
  draftsReady,
  emptyDrafts,
  toTemplate,
  type DayDraft,
} from "@/lib/customProgram";
import { SUPPORTS, type Support } from "@/lib/homeTraining";
import { PAIN_AREAS, type PainArea } from "@/lib/painAreas";
import { archiveProgram, libraryStore, removeSaved, type SavedProgram } from "@/lib/programLibrary";
import { computeNeeds, GOALS, type Needs, type Goal } from "@/lib/nutrition";
import { profileStore, type Experience, type Profile, type Sex } from "@/lib/profile";
import { goalStore, programStore } from "@/lib/stores";

const LEVEL_FROM_EXPERIENCE: Record<Experience, Level> = {
  debutant: "beginner",
  intermediaire: "intermediate",
  avance: "expert",
};

export function Assistant({ profile }: { profile: Profile }) {
  const [step, setStep] = useState<Step>("you");
  const [frequency, setFrequency] = useState(4);
  const [place, setPlace] = useState<Place>("gym");
  const [supports, setSupports] = useState<Support[]>([]);
  const [painAreas, setPainAreas] = useState<PainArea[]>([]);
  const [minutesPerSession, setMinutes] = useState(60);
  const [drafts, setDrafts] = useState<DayDraft[]>([]);
  const [dayIndex, setDayIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [needs, setNeeds] = useState<Needs | null>(null);

  const finish = () => onboardingStore.set(true);

  /**
   * Construit et installe le programme.
   *
   * `plan` n'est fourni que par la construction pas à pas : sans lui, le
   * découpage vient du type choisi. Tout le reste — matériel, douleurs, temps
   * disponible — s'applique dans les deux cas, c'est le même moteur.
   */
  const build = async (type: ProgramType, plan?: DayDraft[]) => {
    setBusy(true);
    setError(null);
    try {
      const catalog = await loadCatalog();
      // Le programme en cours est mis de côté avant d'être remplacé : c'est le
      // moment où il disparaissait sans retour possible.
      archiveProgram(programStore.get());
      const level = profile.experience
        ? LEVEL_FROM_EXPERIENCE[profile.experience]
        : "intermediate";
      programStore.set(
        generateProgram(catalog, {
          frequency,
          type,
          level,
          place,
          supports,
          painAreas,
          minutesPerSession,
          rotation: plan?.map(toTemplate),
          title: plan ? "Sur mesure" : undefined,
        })
      );
      finish();
    } catch {
      setError("Le catalogue d'exercices n'a pas pu être chargé.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Frame step={step}>
      {step === "you" ? (
        <StepYou
          profile={profile}
          onNext={() => setStep("goal")}
          onSkip={() => setStep("goal")}
        />
      ) : step === "goal" ? (
        <StepGoal
          onSport={() => setStep("place")}
          onNutrition={() => setStep("nutrition")}
          onLibrary={() => setStep("library")}
        />
      ) : step === "library" ? (
        <StepLibrary
          onRestore={(saved) => {
            // Le programme en cours est conservé lui aussi : on échange, on ne
            // perd rien.
            archiveProgram(programStore.get());
            programStore.set(saved.program);
            finish();
          }}
          onBack={() => setStep("goal")}
        />
      ) : step === "place" ? (
        <StepPlace
          place={place}
          supports={supports}
          onPlace={setPlace}
          onSupports={setSupports}
          onNext={() => setStep("pain")}
          onBack={() => setStep("goal")}
        />
      ) : step === "pain" ? (
        <StepPain
          areas={painAreas}
          onChange={setPainAreas}
          onNext={() => setStep("frequency")}
          onBack={() => setStep("place")}
        />
      ) : step === "frequency" ? (
        <StepFrequency
          value={frequency}
          onChange={setFrequency}
          onNext={() => setStep("time")}
          onBack={() => setStep("pain")}
        />
      ) : step === "time" ? (
        <StepTime
          value={minutesPerSession}
          onChange={setMinutes}
          onNext={() => setStep("build")}
          onBack={() => setStep("frequency")}
        />
      ) : step === "build" ? (
        <StepBuild
          frequency={frequency}
          onAuto={() => setStep("type")}
          onManual={() => {
            setDrafts(emptyDrafts(frequency, minutesPerSession));
            setDayIndex(0);
            setStep("days");
          }}
          onBack={() => setStep("time")}
        />
      ) : step === "days" ? (
        <StepDays
          drafts={drafts}
          index={dayIndex}
          busy={busy}
          error={error}
          onChange={(draft) =>
            setDrafts((liste) => liste.map((d, i) => (i === dayIndex ? draft : d)))
          }
          onPrevious={() => (dayIndex === 0 ? setStep("build") : setDayIndex(dayIndex - 1))}
          onNext={() => setDayIndex(dayIndex + 1)}
          onFinish={() => void build("split", drafts)}
        />
      ) : step === "type" ? (
        <StepType
          frequency={frequency}
          busy={busy}
          error={error}
          onChoose={(type) => void build(type)}
          onBack={() => setStep("build")}
        />
      ) : (
        <StepNutrition
          needs={needs}
          onCompute={(goal, sessions) =>
            setNeeds(computeNeeds(profile, goal, { sessionsPerWeek: sessions, minutesPerSession: 60 }))
          }
          onDone={finish}
          onBack={() => setStep("goal")}
        />
      )}
    </Frame>
  );
}

const ORDER: Step[] = ["you", "goal", "place", "pain", "frequency", "time", "build"];

function Frame({ step, children }: { step: Step; children: React.ReactNode }) {
  const index = ORDER.indexOf(step);
  // Les écrans qui prolongent la septième étape — découpage, journées composées
  // à la main, nutrition — n'y figurent pas : la barre y reste pleine plutôt
  // que de se vider d'un coup.
  const atteint = index >= 0 ? index : ORDER.length - 1;
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-10">
      <div className="mb-4 flex gap-1.5">
        {ORDER.map((e, i) => (
          <span
            key={e}
            className={`h-1 flex-1 rounded-full transition ${
              i <= atteint ? "bg-accent" : "bg-surface2"
            }`}
          />
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-surface p-7">{children}</div>
    </main>
  );
}

function Heading({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <>
      <div className="text-[0.7rem] font-medium tracking-[0.25em] text-accent uppercase">
        {eyebrow}
      </div>
      <h2 className="font-display mt-2 text-3xl leading-none">{children}</h2>
    </>
  );
}

function PrimaryButton({
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

function LinkButton({
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

function OptionCard({
  title,
  summary,
  active,
  onClick,
}: {
  title: string;
  summary: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-4 py-3 text-left transition ${
        active
          ? "border-accent bg-accent-soft"
          : "border-border bg-surface2 hover:border-border2"
      }`}
    >
      <div className={`font-medium ${active ? "text-accent" : "text-text"}`}>{title}</div>
      <div className="mt-0.5 text-xs text-muted">{summary}</div>
    </button>
  );
}

/* ---------------------------------------------------------------- étape 1 */

const SEXES: { id: Sex; name: string }[] = [
  { id: "homme", name: "Homme" },
  { id: "femme", name: "Femme" },
  { id: "autre", name: "Autre" },
];

const EXPERIENCES: { id: Experience; name: string }[] = [
  { id: "debutant", name: "Débutant" },
  { id: "intermediaire", name: "Intermédiaire" },
  { id: "avance", name: "Avancé" },
];

function StepYou({
  profile,
  onNext,
  onSkip,
}: {
  profile: Profile;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [height, setHeight] = useState(profile.heightCm?.toString() ?? "");
  const [weight, setWeight] = useState(profile.weightKg?.toString() ?? "");
  const [age, setAge] = useState(profile.age?.toString() ?? "");
  const [sex, setSex] = useState<Sex | null>(profile.sex);
  const [experience, setExperience] = useState<Experience | null>(profile.experience);

  const toNumber = (v: string, min: number, max: number): number | null => {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
  };

  const persist = () => {
    profileStore.set({
      ...profile,
      heightCm: toNumber(height, 120, 230),
      weightKg: toNumber(weight, 30, 300),
      age: toNumber(age, 12, 100),
      sex,
      experience,
    });
    onNext();
  };

  return (
    <>
      <Heading eyebrow="Étape 1 sur 7">Parle-nous de toi</Heading>
      <p className="mt-3 text-sm text-muted">
        Tout est facultatif. Ces informations servent à calibrer le programme et à
        estimer tes besoins alimentaires — tu peux passer et les remplir plus tard.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Field id="height" label="Taille" unit="cm" value={height} onChange={setHeight} placeholder="180" />
        <Field id="weight" label="Poids" unit="kg" value={weight} onChange={setWeight} placeholder="80" />
        <Field id="age" label="Âge" unit="ans" value={age} onChange={setAge} placeholder="30" />
      </div>

      <FieldGroup label="Sexe">
        {SEXES.map((s) => (
          <Chip key={s.id} active={sex === s.id} onClick={() => setSex(sex === s.id ? null : s.id)}>
            {s.name}
          </Chip>
        ))}
      </FieldGroup>

      <FieldGroup label="Expérience en musculation">
        {EXPERIENCES.map((e) => (
          <Chip
            key={e.id}
            active={experience === e.id}
            onClick={() => setExperience(experience === e.id ? null : e.id)}
          >
            {e.name}
          </Chip>
        ))}
      </FieldGroup>

      <PrimaryButton onClick={persist}>Continuer</PrimaryButton>
      <LinkButton onClick={onSkip}>Passer cette étape</LinkButton>
    </>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="text-[0.7rem] tracking-[0.15em] text-muted uppercase">{label}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
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
      className={`rounded-full border px-3 py-1 text-sm transition ${
        active
          ? "border-accent bg-accent-soft font-medium text-accent"
          : "border-border2 text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  id,
  label,
  unit,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  unit: string;
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
        <span className="text-xs text-muted">{unit}</span>
      </span>
    </label>
  );
}

/* ---------------------------------------------------------------- étape 2 */

function StepGoal({
  onSport,
  onNutrition,
  onLibrary,
}: {
  onSport: () => void;
  onNutrition: () => void;
  onLibrary: () => void;
}) {
  const library = libraryStore.useValue();
  return (
    <>
      <Heading eyebrow="Étape 2 sur 7">Sur quoi veux-tu agir ?</Heading>
      <div className="mt-5 flex flex-col gap-2">
        <OptionCard
          title="Programme sportif"
          summary="On te construit un programme d'entraînement complet"
          onClick={onSport}
        />
        <OptionCard
          title="Alimentation"
          summary="On estime tes besoins en calories et en macronutriments"
          onClick={onNutrition}
        />
        {library.length > 0 && (
          <OptionCard
            title="Reprendre un programme gardé"
            summary={`${library.length} programme${library.length > 1 ? "s" : ""} mis de côté`}
            onClick={onLibrary}
          />
        )}
      </div>
      <p className="mt-4 text-xs text-muted">
        Ton programme actuel est mis de côté avant d&apos;être remplacé : construire
        autre chose ne le fait pas disparaître.
      </p>
    </>
  );
}

/**
 * Programmes mis de côté.
 *
 * Reprendre l'un d'eux archive d'abord celui en cours : on échange, on ne perd
 * rien — c'est toute la raison d'être de cet écran.
 */
function StepLibrary({
  onRestore,
  onBack,
}: {
  onRestore: (saved: SavedProgram) => void;
  onBack: () => void;
}) {
  const library = libraryStore.useValue();

  return (
    <>
      <Heading eyebrow="Programmes gardés">Reprendre un programme</Heading>
      <p className="mt-3 text-sm text-muted">
        Celui que tu utilises en ce moment sera mis de côté à son tour.
      </p>

      {library.length === 0 ? (
        <p className="mt-5 rounded-xl bg-surface2 px-4 py-3 text-sm text-muted">
          Aucun programme gardé pour l&apos;instant.
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-2">
          {library.map((saved) => {
            const jours = saved.program.days.length;
            const exos = saved.program.days.reduce(
              (n, d) => n + d.sections.reduce((m, sec) => m + sec.exercises.length, 0),
              0
            );
            return (
              <li
                key={saved.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface2 p-3"
              >
                <button
                  type="button"
                  onClick={() => onRestore(saved)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="truncate text-[0.9rem] font-medium">{saved.name}</div>
                  <div className="text-[0.72rem] text-muted">
                    {jours} jour{jours > 1 ? "s" : ""} · {exos} exercices · gardé le{" "}
                    {new Date(saved.savedAt).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                    })}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => removeSaved(saved.id)}
                  aria-label={`Oublier ${saved.name}`}
                  title="Oublier ce programme"
                  className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted transition hover:border-neg hover:text-neg"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-[0.75rem] text-muted">
        Ces programmes restent sur cet appareil : ils ne suivent pas encore d&apos;un
        téléphone à l&apos;autre.
      </p>

      <LinkButton onClick={onBack}>Revenir en arrière</LinkButton>
    </>
  );
}

/* ---------------------------------------------------------------- étape 4 */

/**
 * Où l'on s'entraîne, et avec quoi.
 *
 * La question du mobilier n'est pas cosmétique : le catalogue classe un
 * « Bench Dips » en poids du corps sans dire qu'il demande une chaise, et un
 * « Pullups » sans dire qu'il demande une barre. Sans ces réponses on
 * proposerait des tractions à quelqu'un qui n'a qu'un tapis.
 */
function StepPlace({
  place,
  supports,
  onPlace,
  onSupports,
  onNext,
  onBack,
}: {
  place: Place;
  supports: Support[];
  onPlace: (p: Place) => void;
  onSupports: (s: Support[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const toggle = (id: Support) =>
    onSupports(supports.includes(id) ? supports.filter((s) => s !== id) : [...supports, id]);

  return (
    <>
      <Heading eyebrow="Étape 3 sur 7">Où t&apos;entraînes-tu ?</Heading>
      <p className="mt-3 text-sm text-muted">
        Le programme est construit avec ce dont tu disposes vraiment.
      </p>

      <div className="mt-5 flex flex-col gap-2">
        <OptionCard
          title="En salle"
          summary="Barre, haltères, poulies et machines"
          active={place === "gym"}
          onClick={() => onPlace("gym")}
        />
        <OptionCard
          title="À la maison, au poids du corps"
          summary="Sans matériel, ou avec ce qui traîne chez toi"
          active={place === "home"}
          onClick={() => onPlace("home")}
        />
      </div>

      {place === "home" && (
        <div className="mt-5">
          <FieldGroup label="De quoi disposes-tu ?">
            <div className="flex flex-col gap-2">
              {SUPPORTS.map((s) => (
                <OptionCard
                  key={s.id}
                  title={s.name}
                  summary={s.summary}
                  active={supports.includes(s.id)}
                  onClick={() => toggle(s.id)}
                />
              ))}
            </div>
          </FieldGroup>
          <p className="mt-2 text-[0.78rem] text-muted">
            {supports.includes("bar")
              ? "Avec une barre ou une table, le programme est complet."
              : "Sans barre de traction ni table solide, aucun mouvement de tirage n'est possible au poids du corps : le dos restera de côté. C'est le seul manque réel."}
          </p>
        </div>
      )}

      <PrimaryButton onClick={onNext}>Continuer</PrimaryButton>
      <LinkButton onClick={onBack}>Revenir en arrière</LinkButton>
    </>
  );
}

/**
 * Douleurs déclarées.
 *
 * Ce n'est pas un questionnaire médical et l'écran le dit : c'est un filtre de
 * bon sens, qui met de côté les mouvements connus pour charger fortement une
 * articulation. Sauter la question est le cas normal.
 */
function StepPain({
  areas,
  onChange,
  onNext,
  onBack,
}: {
  areas: PainArea[];
  onChange: (a: PainArea[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const toggle = (id: PainArea) =>
    onChange(areas.includes(id) ? areas.filter((a) => a !== id) : [...areas, id]);

  return (
    <>
      <Heading eyebrow="Étape 4 sur 7">As-tu mal quelque part ?</Heading>
      <p className="mt-3 text-sm text-muted">
        Les mouvements qui chargent ces zones seront écartés du programme. Si tu
        n&apos;as mal nulle part, passe à la suite.
      </p>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {PAIN_AREAS.map((zone) => (
          <Chip key={zone.id} active={areas.includes(zone.id)} onClick={() => toggle(zone.id)}>
            {zone.name}
          </Chip>
        ))}
      </div>

      {areas.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5">
          {areas.map((id) => {
            const zone = PAIN_AREAS.find((z) => z.id === id);
            return (
              <li key={id} className="rounded-xl bg-surface2 px-4 py-2.5 text-[0.8rem] text-muted">
                <span className="text-text">{zone?.name}</span> — {zone?.summary.toLowerCase()}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-[0.75rem] text-muted">
        Ce n&apos;est pas un avis médical. Une douleur qui dure, ou qui revient à
        chaque effort, demande un médecin — pas un programme aménagé.
      </p>

      <PrimaryButton onClick={onNext}>
        {areas.length ? "Continuer" : "Je n'ai mal nulle part"}
      </PrimaryButton>
      <LinkButton onClick={onBack}>Revenir en arrière</LinkButton>
    </>
  );
}

/** Temps disponible par séance : les séances y seront ramenées. */
function StepTime({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: number;
  onChange: (v: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const choisi = SESSION_TIMES.find((t) => t.minutes === value);
  return (
    <>
      <Heading eyebrow="Étape 6 sur 7">Combien de temps par séance ?</Heading>
      <p className="mt-3 text-sm text-muted">
        Échauffement compris. Une séance trop longue pour ton emploi du temps est
        une séance qu&apos;on saute : mieux vaut court et tenu.
      </p>
      <div className="mt-5 flex flex-wrap gap-1.5">
        {SESSION_TIMES.map((t) => (
          <button
            key={t.minutes}
            type="button"
            onClick={() => onChange(t.minutes)}
            className={`font-display size-14 rounded-full border text-lg transition ${
              value === t.minutes
                ? "border-accent bg-accent text-accent-fg"
                : "border-border2 text-muted hover:text-text"
            }`}
          >
            {t.minutes}
          </button>
        ))}
      </div>
      {choisi && (
        <p className="mt-4 rounded-xl bg-surface2 px-4 py-3 text-sm text-muted">
          <span className="text-text">{choisi.minutes} minutes</span> — {choisi.note}
        </p>
      )}
      <PrimaryButton onClick={onNext}>Continuer</PrimaryButton>
      <LinkButton onClick={onBack}>Revenir en arrière</LinkButton>
    </>
  );
}

function StepFrequency({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: number;
  onChange: (v: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const selected = FREQUENCIES.find((f) => f.days === value);
  return (
    <>
      <Heading eyebrow="Étape 5 sur 7">Combien de séances par semaine ?</Heading>
      <p className="mt-3 text-sm text-muted">
        Plus de séances, c&apos;est plus de volume d&apos;entraînement, donc des
        progrès plus rapides. Jusqu&apos;à un point : au-delà de cinq jours, c&apos;est
        la récupération qui limite, pas l&apos;entraînement.
      </p>
      <div className="mt-5 flex flex-wrap gap-1.5">
        {FREQUENCIES.map((f) => (
          <button
            key={f.days}
            type="button"
            onClick={() => onChange(f.days)}
            className={`font-display size-12 rounded-full border text-xl transition ${
              value === f.days
                ? "border-accent bg-accent text-accent-fg"
                : "border-border2 text-muted hover:text-text"
            }`}
          >
            {f.days}
          </button>
        ))}
      </div>
      {selected ? (
        <p className="mt-4 rounded-xl bg-surface2 px-4 py-3 text-sm text-muted">
          <span className="text-text">{selected.days} séances</span> — {selected.note}
        </p>
      ) : null}
      <PrimaryButton onClick={onNext}>Continuer</PrimaryButton>
      <LinkButton onClick={onBack}>Revenir en arrière</LinkButton>
    </>
  );
}

/* ---------------------------------------------------------------- étape 5 */

function StepType({
  frequency,
  busy,
  error,
  onChoose,
  onBack,
}: {
  frequency: number;
  busy: boolean;
  error: string | null;
  onChoose: (t: ProgramType) => void;
  onBack: () => void;
}) {
  const suited = PROGRAM_TYPES.filter((t) => t.days.includes(frequency));
  const others = PROGRAM_TYPES.filter((t) => !t.days.includes(frequency));

  return (
    <>
      <Heading eyebrow="Programme par défaut">Quel découpage ?</Heading>
      <p className="mt-3 text-sm text-muted">
        Adaptés à {frequency} séance{frequency > 1 ? "s" : ""} par semaine :
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {suited.map((t) => (
          <OptionCard key={t.id} title={t.name} summary={t.summary} onClick={() => onChoose(t.id)} />
        ))}
      </div>
      {others.length ? (
        <>
          <p className="mt-5 text-xs text-muted">
            Possibles, mais mieux adaptés à un autre nombre de séances :
          </p>
          <div className="mt-2 flex flex-col gap-2 opacity-60">
            {others.map((t) => (
              <OptionCard
                key={t.id}
                title={t.name}
                summary={`${t.summary} — conçu pour ${t.days.join(", ")} jours`}
                onClick={() => onChoose(t.id)}
              />
            ))}
          </div>
        </>
      ) : null}
      {busy ? <p className="mt-4 text-sm text-muted">Construction du programme…</p> : null}
      {error ? <p className="mt-4 text-sm text-accent2">{error}</p> : null}
      <LinkButton onClick={onBack}>← Revenir au choix de construction</LinkButton>
    </>
  );
}

/* ------------------------------------------------------- pas à pas */

function StepBuild({
  frequency,
  onAuto,
  onManual,
  onBack,
}: {
  frequency: number;
  onAuto: () => void;
  onManual: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <Heading eyebrow="Étape 7 sur 7">Comment on le construit ?</Heading>
      <p className="mt-3 text-sm text-muted">
        Dans les deux cas, c&apos;est moi qui choisis les mouvements — en tenant
        compte de ton matériel, de tes douleurs et de ton temps. La différence
        est de savoir qui dessine le découpage.
      </p>
      <div className="mt-5 flex flex-col gap-2">
        <OptionCard
          title="Programme par défaut"
          summary={`Tu choisis un découpage éprouvé — full body, haut/bas, push pull legs — et je remplis les ${frequency} journées.`}
          onClick={onAuto}
        />
        <OptionCard
          title="Pas à pas"
          summary="Tu composes chaque journée : les groupes musculaires et le nombre d'exercices. Plus long, mais c'est ton programme."
          onClick={onManual}
        />
      </div>
      <p className="mt-4 text-[0.75rem] text-muted">
        Rien n&apos;est figé : chaque exercice reste échangeable, et les journées
        se modifient ensuite depuis le programme.
      </p>
      <LinkButton onClick={onBack}>← Changer le temps disponible</LinkButton>
    </>
  );
}

function StepDays({
  drafts,
  index,
  busy,
  error,
  onChange,
  onPrevious,
  onNext,
  onFinish,
}: {
  drafts: DayDraft[];
  index: number;
  busy: boolean;
  error: string | null;
  onChange: (draft: DayDraft) => void;
  onPrevious: () => void;
  onNext: () => void;
  onFinish: () => void;
}) {
  const draft = drafts[index];
  if (!draft) return null;

  const derniere = index === drafts.length - 1;
  const pret = draft.groups.length > 0;

  const basculer = (id: string) =>
    onChange({
      ...draft,
      groups: draft.groups.includes(id)
        ? draft.groups.filter((g) => g !== id)
        : [...draft.groups, id],
    });

  return (
    <>
      <Heading eyebrow={`Journée ${index + 1} sur ${drafts.length}`}>
        {draftTitle(draft, index)}
      </Heading>
      <p className="mt-3 text-sm text-muted">
        Coche les groupes travaillés ce jour-là. L&apos;ordre compte : les
        premiers cochés reçoivent le plus d&apos;exercices.
      </p>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {MUSCLE_GROUPS.map((groupe) => (
          <Chip
            key={groupe.id}
            active={draft.groups.includes(groupe.id)}
            onClick={() => basculer(groupe.id)}
          >
            {groupe.name}
          </Chip>
        ))}
      </div>

      <label className="mt-5 block text-[0.7rem] tracking-[0.1em] text-muted uppercase">
        Nom de la journée
        <input
          type="text"
          value={draft.title}
          placeholder={draftTitle(draft, index)}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
          className="mt-1 w-full rounded-md border border-border bg-surface2 px-3 py-2 text-sm normal-case text-text focus:border-accent focus:outline-none"
        />
      </label>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-[0.8rem] text-muted">Exercices dans la séance</span>
        <div className="flex items-center gap-2">
          <Compteur
            label="Un exercice de moins"
            disabled={draft.count <= MIN_EXERCISES}
            onClick={() => onChange({ ...draft, count: draft.count - 1 })}
          >
            −
          </Compteur>
          <span className="font-display w-8 text-center text-2xl text-accent">{draft.count}</span>
          <Compteur
            label="Un exercice de plus"
            disabled={draft.count >= MAX_EXERCISES}
            onClick={() => onChange({ ...draft, count: draft.count + 1 })}
          >
            +
          </Compteur>
        </div>
      </div>
      <p className="mt-1 text-[0.75rem] text-muted">
        Une séance plus longue que le temps annoncé sera ramenée à ce qui tient
        dedans — et te le dira.
      </p>

      {drafts.some((d, i) => i !== index && d.groups.length > 0) && (
        <ul className="mt-5 flex flex-col gap-1">
          {drafts.map((d, i) =>
            i === index || !d.groups.length ? null : (
              <li key={i} className="text-[0.75rem] text-muted">
                <span className="text-accent">J{i + 1}</span> {draftTitle(d, i)} · {d.count} exercices
              </li>
            )
          )}
        </ul>
      )}

      <PrimaryButton
        onClick={derniere ? onFinish : onNext}
        disabled={!pret || busy || (derniere && !draftsReady(drafts))}
      >
        {derniere ? "Construire le programme" : "Journée suivante →"}
      </PrimaryButton>
      {!pret && (
        <p className="mt-2 text-center text-[0.75rem] text-muted">
          Choisis au moins un groupe musculaire.
        </p>
      )}
      {busy ? <p className="mt-4 text-sm text-muted">Construction du programme…</p> : null}
      {error ? <p className="mt-4 text-sm text-accent2">{error}</p> : null}
      <LinkButton onClick={onPrevious}>
        {index === 0 ? "← Revenir au choix de construction" : `← Journée ${index}`}
      </LinkButton>
    </>
  );
}

function Compteur({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="size-9 rounded-full border border-border text-lg text-muted transition hover:border-accent hover:text-accent disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------- nutrition */

function StepNutrition({
  needs,
  onCompute,
  onDone,
  onBack,
}: {
  needs: Needs | null;
  onCompute: (o: Goal, sessions: number) => void;
  onDone: () => void;
  onBack: () => void;
}) {
  // Même magasin que l'onglet Nutrition : le choix fait ici s'y retrouve.
  const goal = goalStore.useValue();
  const [sessions, setSessions] = useState(4);

  return (
    <>
      <Heading eyebrow="Alimentation">Tes besoins estimés</Heading>
      <p className="mt-3 text-sm text-muted">
        Calcul par la formule de Mifflin-St Jeor. Ce sont des estimations de
        population : prends-les comme point de départ et ajuste-les sur
        l&apos;évolution réelle de ton poids.
      </p>

      <div className="mt-5 flex flex-col gap-2">
        {GOALS.map((o) => (
          <OptionCard
            key={o.id}
            title={o.name}
            summary={o.summary}
            active={goal === o.id}
            onClick={() => goalStore.set(o.id)}
          />
        ))}
      </div>

      <FieldGroup label="Séances par semaine">
        {FREQUENCIES.map((f) => (
          <Chip key={f.days} active={sessions === f.days} onClick={() => setSessions(f.days)}>
            {f.days}
          </Chip>
        ))}
      </FieldGroup>

      <PrimaryButton onClick={() => onCompute(goal, sessions)}>Calculer</PrimaryButton>

      {needs && "missing" in needs ? (
        <p className="mt-4 rounded-xl bg-surface2 px-4 py-3 text-sm text-muted">
          Il manque {needs.missing.join(", ")} pour faire ce calcul. Renseigne-les
          dans ton profil, puis reviens ici.
        </p>
      ) : needs ? (
        <>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <StatTile value={`${needs.calories}`} unit="kcal/jour" label="Objectif" strong />
            <StatTile value={`${needs.protein}`} unit="g" label="Protéines" />
            <StatTile value={`${needs.carbs}`} unit="g" label="Glucides" />
            <StatTile value={`${needs.fat}`} unit="g" label="Lipides" />
          </div>
          <p className="mt-3 text-xs text-muted">
            Métabolisme de base {needs.bmr} kcal · dépense estimée{" "}
            {needs.tdee} kcal
            {needs.sexApproximated
              ? " · sexe non renseigné : valeur intermédiaire entre les deux formules"
              : ""}
          </p>
          <PrimaryButton onClick={onDone}>Terminer</PrimaryButton>
        </>
      ) : null}

      <LinkButton onClick={onBack}>← Retour</LinkButton>
    </>
  );
}

function StatTile({
  value,
  unit,
  label,
  strong,
}: {
  value: string;
  unit: string;
  label: string;
  strong?: boolean;
}) {
  return (
    <div className={`rounded-xl px-4 py-3 ${strong ? "bg-accent-soft" : "bg-calm-soft"}`}>
      <div className={`font-display text-2xl leading-none ${strong ? "text-accent" : "text-text"}`}>
        {value}
        <span className="ml-1 text-xs text-muted">{unit}</span>
      </div>
      <div className="mt-1 text-[0.7rem] tracking-[0.15em] text-muted uppercase">{label}</div>
    </div>
  );
}
