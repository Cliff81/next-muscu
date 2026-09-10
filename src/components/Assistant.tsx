"use client";

import { useState } from "react";
import { onboardingStore, FREQUENCIES, type Step } from "@/lib/onboarding";
import { loadCatalog, type Level } from "@/lib/catalog";
import { generateProgram, PROGRAM_TYPES, type Place, type ProgramType } from "@/lib/generateProgram";
import { SUPPORTS, type Support } from "@/lib/homeTraining";
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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [needs, setNeeds] = useState<Needs | null>(null);

  const finish = () => onboardingStore.set(true);

  const build = async (type: ProgramType) => {
    setBusy(true);
    setError(null);
    try {
      const catalog = await loadCatalog();
      const level = profile.experience
        ? LEVEL_FROM_EXPERIENCE[profile.experience]
        : "intermediate";
      programStore.set(generateProgram(catalog, { frequency, type, level, place, supports }));
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
        />
      ) : step === "place" ? (
        <StepPlace
          place={place}
          supports={supports}
          onPlace={setPlace}
          onSupports={setSupports}
          onNext={() => setStep("frequency")}
          onBack={() => setStep("goal")}
        />
      ) : step === "frequency" ? (
        <StepFrequency
          value={frequency}
          onChange={setFrequency}
          onNext={() => setStep("type")}
          onBack={() => setStep("place")}
        />
      ) : step === "type" ? (
        <StepType
          frequency={frequency}
          busy={busy}
          error={error}
          onChoose={build}
          onBack={() => setStep("frequency")}
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

const ORDER: Step[] = ["you", "goal", "place", "frequency", "type"];

function Frame({ step, children }: { step: Step; children: React.ReactNode }) {
  const index = ORDER.indexOf(step);
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-10">
      <div className="mb-4 flex gap-1.5">
        {ORDER.map((e, i) => (
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
      <Heading eyebrow="Étape 1 sur 5">Parle-nous de toi</Heading>
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
}: {
  onSport: () => void;
  onNutrition: () => void;
}) {
  return (
    <>
      <Heading eyebrow="Étape 2 sur 5">Sur quoi veux-tu agir ?</Heading>
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
      </div>
      <p className="mt-4 text-xs text-muted">
        Tu pourras relancer l&apos;assistant pour l&apos;autre volet depuis ton profil.
      </p>
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
      <Heading eyebrow="Étape 3 sur 5">Où t&apos;entraînes-tu ?</Heading>
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
      <Heading eyebrow="Étape 4 sur 5">Combien de séances par semaine ?</Heading>
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
      <Heading eyebrow="Étape 5 sur 5">Quel type de programme ?</Heading>
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
            Possibles, mais mieux adaptés à un autre toNumber de séances :
          </p>
          <div className="mt-2 flex flex-col gap-2 opacity-60">
            {others.map((t) => (
              <OptionCard
                key={t.id}
                title={t.name}
                summary={`${t.summary} — conçu pour ${t.days.join(", ")} days`}
                onClick={() => onChoose(t.id)}
              />
            ))}
          </div>
        </>
      ) : null}
      {busy ? <p className="mt-4 text-sm text-muted">Construction du programme…</p> : null}
      {error ? <p className="mt-4 text-sm text-accent2">{error}</p> : null}
      <LinkButton onClick={onBack}>← Changer la fréquence</LinkButton>
    </>
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
