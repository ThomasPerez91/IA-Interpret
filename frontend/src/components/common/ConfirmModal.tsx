import React from "react";
import styles from "./ConfirmModal.module.css";

type Props = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: "default" | "danger";
  onConfirm: () => void;
  onClose: () => void;
};

export const ConfirmModal: React.FC<Props> = ({
  isOpen,
  title,
  message,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  tone = "default",
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  const confirmClass = tone === "danger" ? styles.btnDanger : styles.btnPrimary;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
        </div>
        <div className={styles.body}>
          {/* autorise un peu de markdown léger si tu veux plus tard */}
          <p className={styles.message}>{message}</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.btnGhost} onClick={onClose}>
            {cancelText}
          </button>
          <button className={confirmClass} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
