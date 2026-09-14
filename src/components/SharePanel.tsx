"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { Modal } from "@/components/Modal";
import { notify } from "@/lib/toast";
import type { Program } from "@/lib/types";

/**
 * Partage d'un programme par QR.
 *
 * C'est un **code** qui voyage, pas le programme : vingt kilo-octets de JSON
 * ne tiennent pas dans un QR, et un lien court reste lisible même froissé ou
 * photographié de travers. Le programme, lui, est déposé côté serveur et lu
 * par qui ouvre le lien.
 */
export function SharePanel({ program, onClose }: { program: Program; onClose: () => void }) {
  const { isAuthenticated } = useConvexAuth();
  const create = useMutation(api.shares.create);
  const revoke = useMutation(api.shares.revoke);
  const partages = useQuery(api.shares.mine, isAuthenticated ? {} : "skip");
  const [lien, setLien] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    let vivant = true;

    void create({ program, title: `${program.title} ${program.titleAccent}`.trim() })
      .then(async ({ code }) => {
        if (!vivant) return;
        const url = `${window.location.origin}/p/${code}`;
        setLien(url);
        // Chargé à l'ouverture de la fenêtre seulement : l'encodeur pèse plus
        // que tout le reste de la page, et ne sert qu'ici.
        const QRCode = (await import("qrcode")).default;
        const dessin = await QRCode.toString(url, {
          type: "svg",
          margin: 1,
          // Modules sombres sur fond clair : c'est ce que les caméras lisent
          // le mieux, quel que soit le visage de l'application.
          color: { dark: "#0e0f13", light: "#ffffff" },
        });
        if (vivant) setSvg(dessin);
      })
      .catch(() => {
        if (vivant) setErreur("Le partage n'a pas pu être créé. Réessaie dans un instant.");
      });

    return () => {
      vivant = false;
    };
  }, [create, isAuthenticated, program]);

  return (
    <Modal title="Partager ce programme" onClose={onClose}>
      {!isAuthenticated ? (
        <p className="rounded-xl bg-surface2 px-4 py-3 text-sm text-muted">
          Le partage passe par ton compte : connecte-toi avec Google pour
          obtenir un lien.
        </p>
      ) : erreur ? (
        <p className="rounded-xl bg-surface2 px-4 py-3 text-sm text-accent2">{erreur}</p>
      ) : (
        <>
          <p className="text-[0.8rem] text-muted">
            Fais scanner ce code. La personne verra le programme et pourra le
            garder — le tien ne bouge pas.
          </p>

          <div className="mt-4 flex justify-center">
            {svg ? (
              <div
                className="w-56 rounded-xl bg-white p-3"
                // Le SVG vient de l'encodeur, pas d'une saisie : il n'y a rien
                // à échapper.
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : (
              <div className="grid h-56 w-56 place-items-center rounded-xl bg-surface2 text-sm text-muted">
                Création du lien…
              </div>
            )}
          </div>

          {lien && (
            <>
              <p className="mt-4 rounded-lg bg-surface2 px-3 py-2 text-center text-[0.75rem] break-all text-muted">
                {lien}
              </p>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(lien)
                    .then(() => notify("Lien copié."))
                    .catch(() => notify("Copie impossible — le lien reste affiché."));
                }}
                className="mt-3 w-full rounded-md bg-accent px-4 py-2.5 text-sm font-bold text-accent-fg transition hover:opacity-90"
              >
                Copier le lien
              </button>
            </>
          )}

          {partages && partages.length > 0 && (
            <div className="mt-5 border-t border-border pt-3">
              <div className="text-[0.65rem] tracking-[0.12em] text-muted uppercase">Mes partages</div>
              <ul className="mt-2 flex flex-col gap-1.5">
                {partages.map((p) => (
                  <li
                    key={p.code}
                    className="flex items-center justify-between gap-3 rounded-lg bg-surface2 px-3 py-2 text-[0.8rem]"
                  >
                    <span className="min-w-0">
                      <span className="truncate">{p.title}</span>
                      <span className="ml-2 font-mono text-[0.7rem] text-muted">{p.code}</span>
                      {lien?.endsWith(`/${p.code}`) && (
                        <span className="ml-2 text-[0.65rem] text-accent">celui-ci</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!window.confirm(`Retirer le partage « ${p.title} » ? Le lien cessera de fonctionner.`)) return;
                        void revoke({ code: p.code })
                          .then((ok) => notify(ok ? "Partage retiré : le lien ne mène plus à rien." : "Ce partage n'existe plus."))
                          .catch(() => notify("Impossible de retirer le partage pour l'instant."));
                      }}
                      className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted transition hover:border-neg hover:text-neg"
                    >
                      Retirer
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[0.7rem] text-muted">
                Un lien retiré cesse de fonctionner aussitôt. Ce que la personne a déjà gardé chez elle reste chez elle.
              </p>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
