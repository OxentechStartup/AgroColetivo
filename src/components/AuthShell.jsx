import styles from "./AuthShell.module.css";
import { BRAND_NAME, BRAND_LOGO_URL } from "../constants/branding";

export function AuthShell({
  kicker,
  title,
  subtitle,
  bullets = [],
  contentMaxWidth = 420,
  children,
}) {
  const maxWidth =
    typeof contentMaxWidth === "number"
      ? `${contentMaxWidth}px`
      : contentMaxWidth;

  return (
    <div className={styles.page}>
      <div className={styles.splitLayout}>
        <aside className={styles.visualSide} aria-hidden="true">
          <div className={styles.bgImage} />
          <div className={styles.overlay} />
          <div className={styles.visualGlowA} />
          <div className={styles.visualGlowB} />

          <div className={styles.visualContent}>
            <div className={styles.visualLogoRow}>
              <img
                src={BRAND_LOGO_URL}
                alt={BRAND_NAME}
                className={styles.visualLogoMark}
              />
              <span className={styles.visualBrand}>{BRAND_NAME}</span>
            </div>

            {kicker && <span className={styles.visualKicker}>{kicker}</span>}
            <h2 className={styles.visualTitle}>{title}</h2>
            {subtitle && <p className={styles.visualSubtitle}>{subtitle}</p>}

            {bullets.length > 0 && (
              <ul className={styles.visualBullets}>
                {bullets.slice(0, 3).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <main className={styles.authSide}>
          <div className={styles.authContent} style={{ maxWidth }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
