import { useState, useEffect } from "react";
import { fetchPivoData } from "../lib/pivos";
import styles from "./PivoBadge.module.css";

export function PivoBadge({ pivoId }) {
  const [pivo, setPivo] = useState(null);
  const [loading, setLoading] = useState(!!pivoId);

  useEffect(() => {
    if (!pivoId) {
      setLoading(false);
      return;
    }

    const loadPivo = async () => {
      const data = await fetchPivoData(pivoId);
      setPivo(data);
      setLoading(false);
    };

    loadPivo();
  }, [pivoId]);

  if (!pivoId || !pivo) {
    return null;
  }

  return (
    <div className={styles.badge} title={`Gestor responsável: ${pivo.name}`}>
      {pivo.profile_photo_url && (
        <img
          src={pivo.profile_photo_url}
          alt={pivo.name}
          className={styles.avatar}
        />
      )}
      <span className={styles.name}>{pivo.name}</span>
    </div>
  );
}
