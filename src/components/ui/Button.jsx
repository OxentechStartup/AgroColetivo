import { Loader } from "lucide-react";
import styles from "./Button.module.css";

export function Button({
  children,
  variant = "primary",
  size = "md",
  block = false,
  disabled = false,
  loading = false,
  onClick,
  href,
  target,
  rel,
  type = "button",
}) {
  const cls = [
    styles.btn,
    styles[variant],
    styles[size],
    block ? styles.block : "",
  ]
    .filter(Boolean)
    .join(" ");

  const isDisabled = disabled || loading;

  if (href)
    return (
      <a className={cls} href={href} target={target} rel={rel}>
        {children}
      </a>
    );

  return (
    <button className={cls} type={type} disabled={isDisabled} onClick={onClick}>
      {loading ? (
        <>
          <Loader size={16} className={styles.spinner} />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
