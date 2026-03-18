import { useState, useCallback } from "react";
import { updateVendor, createVendor } from "../lib/vendors.js";

export function useVendorProfile(vendor, user, onVendorChange) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const save = useCallback(
    async (patch) => {
      setSaving(true);
      setError(null);
      try {
        if (vendor?.id) {
          const updated = await updateVendor(vendor.id, patch);
          onVendorChange?.(updated);
          return updated;
        } else {
          const created = await createVendor({ ...patch, user_id: user?.id });
          onVendorChange?.(created);
          return created;
        }
      } catch (e) {
        setError(e?.message || "Erro ao atualizar perfil");
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [vendor, user, onVendorChange],
  );

  return { saving, error, save };
}
