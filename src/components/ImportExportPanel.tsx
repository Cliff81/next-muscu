"use client";

import { useRef, useState } from "react";
import { parseProgramJson } from "@/lib/programSchema";
import type { Program } from "@/lib/types";

type Props = {
  program: Program;
  onImport: (program: Program) => void;
  onReset: () => void;
};

export function ImportExportPanel({ program, onImport, onReset }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    file.text().then((raw) => {
      const result = parseProgramJson(raw);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const confirmed = window.confirm(
        `Importer "${result.program.title} ${result.program.titleAccent}" ? Cette action remplace tout le programme actuel (les séances déjà enregistrées restent dans l'historique).`
      );
      if (!confirmed) return;
      setError(null);
      onImport(result.program);
    });
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(program, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "programme-musculation.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    const confirmed = window.confirm("Réinitialiser le programme par défaut ? Le programme importé sera remplacé.");
    if (!confirmed) return;
    onReset();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium text-text transition hover:border-accent hover:text-accent"
        >
          Importer un programme (JSON)
        </button>
        <button
          onClick={handleExport}
          className="rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium text-text transition hover:border-accent hover:text-accent"
        >
          Exporter le programme actuel
        </button>
        <button
          onClick={handleReset}
          className="rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium text-muted transition hover:border-accent2 hover:text-accent2"
        >
          Réinitialiser
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {error && <p className="text-xs text-accent2">{error}</p>}
    </div>
  );
}
