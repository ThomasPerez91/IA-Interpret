// Jolis libellés FR et helpers de style pour badges

import type { DatasetStatus, DatasetStep } from "../types/datasets";

export const statusLabel: Record<DatasetStatus, string> = {
  queued: "En file d’attente",
  uploading_hdfs: "Transfert des données",
  analyzing: "Analyse en cours",
  done: "Terminé",
  failed: "Échec",
};

export const stepLabel: Record<DatasetStep, string> = {
  initial_analysis: "Analyse préliminaire",
};

export const statusClass = (s: DatasetStatus) => {
  switch (s) {
    case "done":
      return "badgeGreen";
    case "failed":
      return "badgeRed";
    case "analyzing":
      return "badgeBlue";
    case "uploading_hdfs":
      return "badgeIndigo";
    case "queued":
    default:
      return "badgeYellow";
  }
};

export const stepClass = () => {
  return "badgeBlue";
};
