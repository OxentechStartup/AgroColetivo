import { useEffect } from "react";
import { CheckCircle, AlertCircle } from "lucide-react";
import styles from "./Toast.module.css";

export function Toast({ message, onDone, type = "success" }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      {type === "success" ? (
        <CheckCircle size={15} />
      ) : (
        <AlertCircle size={15} />
      )}
      {message}
    </div>
  );
}
