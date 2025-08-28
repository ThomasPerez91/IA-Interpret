import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./RowActions.module.css";

type Props = {
  onInfo: () => void;
  onNextStep: () => void;
  onArchive: () => void;
};

type Pos = { top: number; left: number };

const MENU_WIDTH = 200;
const GAP = 8;

export const RowActions: React.FC<Props> = ({
  onInfo,
  onNextStep,
  onArchive,
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos>({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const place = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const left = Math.min(
      window.innerWidth - MENU_WIDTH - 8,
      Math.max(8, r.right - MENU_WIDTH)
    );
    let top = r.bottom + GAP;
    if (top + 10 > window.innerHeight) top = Math.max(8, r.top - GAP - 240);
    setPos({ top, left });
  };

  useLayoutEffect(() => {
    if (open) place();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const btn = btnRef.current;
      const menu = menuRef.current;
      const clickInsideBtn = !!btn && btn.contains(target);
      const clickInsideMenu = !!menu && menu.contains(target);
      if (!clickInsideBtn && !clickInsideMenu) setOpen(false);
    };
    const onScroll = () => place();
    const onResize = () => place();

    // ⚠️ utiliser 'click' (pas 'mousedown') pour laisser les onClick des items s’exécuter
    document.addEventListener("click", onDocClick);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("click", onDocClick);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Actions"
      >
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className={styles.menu}
            style={{
              top: `${pos.top}px`,
              left: `${pos.left}px`,
              width: MENU_WIDTH,
            }}
            role="menu"
          >
            <button
              className={styles.item}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onInfo();
              }}
            >
              Informations
            </button>
            <button
              className={styles.item}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onNextStep();
              }}
            >
              Étape suivante
            </button>
            <div className={styles.sep} />
            <button
              className={`${styles.item} ${styles.danger}`}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onArchive();
              }}
            >
              Archiver
            </button>
          </div>,
          document.body
        )}
    </>
  );
};
