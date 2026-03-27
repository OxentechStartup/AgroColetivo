# 📊 Fluxo Completo: VendorProfilePage → Atualização do Contexto

## 1️⃣ ONDE VENDORPROFILEPAGE É RENDERIZADO?

### Arquivo: [src/App.jsx](src/App.jsx#L251-L257)

```jsx
// Em AppContent(), dentro do switch das páginas
case "vendor-profile":
  return (
    <VendorProfilePage
      user={user}
      vendor={vendor}
      onSaved={(result) => {
        reload();
      }}
      onDeleteAccount={() => setShowDeleteModal(true)}
    />
  );
```

**Props passadas:**

- `user` - Dados do usuário autenticado
- `vendor` - Dados do vendor (pode ser null inicialmente)
- `onSaved` - **Callback que chama `reload()`** ← A CHAVE!
- `onDeleteAccount` - Para deletar conta

**Origem dos dados:**

```jsx
// De AppContext (via AppProvider)
const { user, vendors, ownVendor, reload } = useContext(AppContext);

// Vendor é computado assim:
const vendor =
  user?.role === ROLES.VENDOR
    ? (ownVendor ?? null) // Se é VENDOR, usa ownVendor
    : (vendors?.find((v) => v.user_id === user?.id) ?? null); // Se é GESTOR/ADMIN
```

---

## 2️⃣ A FUNÇÃO onSaved - COMO FUNCIONA?

### Callback definido em [src/App.jsx](src/App.jsx#L250-L256)

```jsx
onSaved={(result) => {
  reload();  // Chama a função reload do contexto
}}
```

**O que `reload()` faz:**

- `reload()` é **`loadAll()`** do hook `useCampaigns`
- **Recarrega TUDO**: campanhas, vendors, e ownVendor
- Atualiza o estado completo do contexto

---

## 3️⃣ FLUXO DENTRO DO VENDORPROFILEPAGE

### Arquivo: [src/pages/VendorProfilePage.jsx](src/pages/VendorProfilePage.jsx#L23-L140)

```jsx
export function VendorProfilePage({ user, vendor, onSaved, onDeleteAccount }) {
  // Estados do formulário
  const [name, setName] = useState(vendor?.name ?? user?.name ?? "");
  const [phone, setPhone] = useState(
    vendor?.phone ? maskPhone(vendor.phone) : "",
  );
  const [city, setCity] = useState(vendor?.city ?? "");
  const [notes, setNotes] = useState(vendor?.notes ?? "");
  const [photoUrl, setPhotoUrl] = useState(vendor?.photo_url ?? "");
  const [saving, setSaving] = useState(false);

  // ✅ SINCRONIZAÇÃO: Quando vendor muda (após reload), atualiza os inputs
  useEffect(() => {
    if (vendor) {
      setName(vendor.name ?? user?.name ?? "");
      setPhone(vendor.phone ? maskPhone(vendor.phone) : "");
      setCity(vendor.city ?? "");
      setNotes(vendor.notes ?? "");
      setPhotoUrl(vendor.photo_url ?? "");
    }
  }, [vendor?.id]); // Dependency: quando vendor.id muda → sincroniza

  // ✅ SALVAR PERFIL
  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        phone: unmaskPhone(phone),
        city: city.trim() || null,
        notes: notes.trim() || null,
        photo_url: photoUrl || null,
      };

      let result;

      // ✅ UPDATE ou CREATE
      if (vendor?.id) {
        result = await updateVendor(vendor.id, payload); // UPDATE
      } else {
        result = await createVendor({ ...payload, user_id: user?.id }); // CREATE
      }

      // ✅ PERSISTE NA SESSÃO LOCAL
      try {
        const current = JSON.parse(localStorage.getItem("agro_auth") || "{}");
        localStorage.setItem(
          "agro_auth",
          JSON.stringify({
            ...current,
            vendor_photo_url: photoUrl || null,
            profile_photo_url: photoUrl || null,
          }),
        );
      } catch {}

      showToast("Perfil atualizado!");

      // ✅ CHAMA onSaved → DISPARA reload()
      onSaved?.(result);
    } catch (e) {
      showToast(e?.message || "Erro ao salvar perfil.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Renderizar o formulário...
}
```

---

## 4️⃣ ATUALIZAÇÃO DO BANCO DE DADOS: updateVendor()

### Arquivo: [src/lib/vendors.js](src/lib/vendors.js#L69-L109)

```javascript
export async function updateVendor(id, patch) {
  // ✅ PASSO 1: UPDATE na tabela vendors
  const payload = {
    name: patch.name?.trim(),
    phone: (patch.phone ?? "").replace(/\D/g, ""),
    city: patch.city?.trim() || null,
    notes: patch.notes?.trim() || null,
  };
  if (patch.photo_url !== undefined) {
    payload.photo_url = patch.photo_url;
  }

  const { error: updateError } = await supabase
    .from("vendors")
    .update(payload)
    .eq("id", id);

  if (updateError)
    throw new Error(updateError?.message || "Erro ao atualizar vendor");

  // ✅ PASSO 2: SELECT dos dados atualizados
  const { data, error: selectError } = await supabase
    .from("vendors")
    .select("id, name, phone, city, notes, user_id, photo_url")
    .eq("id", id)
    .single();

  if (selectError)
    throw new Error(selectError?.message || "Erro ao carregar vendor");

  // ✅ PASSO 3: SINCRONIZA foto com users.profile_photo_url
  if (patch.photo_url !== undefined && data.user_id) {
    await supabase
      .from("users")
      .update({ profile_photo_url: patch.photo_url || null })
      .eq("id", data.user_id);
  }

  // ✅ RETORNA os dados atualizados
  return { ...data, admin_user_id: data.user_id };
}
```

---

## 5️⃣ RELOAD DO CONTEXTO: Como funciona a atualização?

### Arquivo: [src/hooks/useCampaigns.js](src/hooks/useCampaigns.js#L93-L240)

```javascript
export function useCampaigns(user) {
  const [campaigns, setCampaigns] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [ownVendor, setOwnVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ FUNÇÃO PRINCIPAL QUE RECARREGA TUDO
  const loadAll = useCallback(async () => {
    if (!user) {
      setCampaigns([]);
      setVendors([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // ✅ RESOLVE vendorId se necessário
      let userWithVendorId = user;
      if (user.role === ROLES.VENDOR && !user.vendorId) {
        let { data: vRow } = await supabase
          .from("vendors")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (vRow) userWithVendorId = { ...user, vendorId: vRow.id };
      }

      const isVendor = user.role === ROLES.VENDOR;
      const vendorId = userWithVendorId?.vendorId ?? null;

      // ✅ BUSCA CAMPANHAS E VENDORS EM PARALELO
      const [rawCampaigns, rawVendors] = await Promise.all([
        fetchCampaigns(userWithVendorId),
        fetchVendors(user.id, user.role),
      ]);

      // ✅ BUSCA O VENDOR PRÓPRIO (se for VENDOR)
      if (isVendor && vendorId) {
        supabase
          .from("vendors")
          .select("*")
          .eq("id", vendorId)
          .maybeSingle()
          .then(({ data: vFull }) => {
            if (vFull) setOwnVendor({ ...vFull, admin_user_id: vFull.user_id }); // ← ATUALIZA ownVendor
          });
      }

      // Resto do processamento...
      setCampaigns(withOrders);
      setVendors(rawVendors);
    } catch (err) {
      setError(err?.message || "Erro ao carregar cotações");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ✅ EXECUTA loadAll QUANDO USER MUDA
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ✅ RETORNA o reload
  return {
    campaigns,
    vendors,
    ownVendor, // ← AQUI! Este é o vendor atualizado
    loading,
    error,
    reload: loadAll, // ← AQUI! A função reload
    reloadCampaign,
    // ... outras funções
  };
}
```

---

## 6️⃣ ATUALIZAÇÃO DO CONTEXT: AppProvider

### Arquivo: [src/context/AppProvider.jsx](src/context/AppProvider.jsx#L1-L165)

```jsx
export function AppProvider({ children }) {
  // ✅ Obtém dados do hook useCampaigns
  const {
    campaigns,
    vendors,
    ownVendor, // ← Vendor próprio para VENDOR users
    loading: campaignsLoading,
    error: campaignsError,
    addCampaign,
    reload, // ← A função que recarrega tudo
    reloadCampaign,
    // ... outras funções
  } = useCampaigns(user);

  // ✅ CRIA o contexto com todos os dados
  const contextValue = useMemo(() => {
    return {
      user,
      isAuthenticated,
      profile,
      authLoading,
      authError,
      campaigns,
      vendors,
      ownVendor, // ← Expõe ownVendor para toda app!
      campaignsLoading,
      campaignsError,
      reload, // ← Expõe reload para toda app!
      reloadCampaign,
      // ... outras funções
    };
  }, [
    user,
    campaigns,
    vendors,
    ownVendor, // Dependency
    reload, // Dependency
    // ... outras dependencies
  ]);

  // ✅ PROVÊ o contexto
  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}
```

---

## 7️⃣ FLUXO COMPLETO: RESUMIDO

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. USUÁRIO CLICA "SALVAR PERFIL" em VendorProfilePage              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. handleSave() executa em VendorProfilePage                        │
│    - Valida dados                                                    │
│    - Chama updateVendor() ou createVendor()                         │
│    - Persiste foto em localStorage                                   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. updateVendor() no Supabase [vendors.js]                          │
│    ✅ UPDATE vendors table                                           │
│    ✅ SELECT dados atualizados                                       │
│    ✅ SYNC profile_photo_url para users table                        │
│    ✅ RETORNA { ...data, admin_user_id }                             │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. onSaved?.(result) chamado em VendorProfilePage                   │
│    → Chama reload() do contexto                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. reload() (= loadAll) executa em useCampaigns                     │
│    ✅ FETCH de vendors (fetchVendors)                                │
│    ✅ FETCH do vendor próprio (SELECT * FROM vendors WHERE id)      │
│    ✅ setVendors(rawVendors)                                         │
│    ✅ setOwnVendor({ ...vFull, admin_user_id: vFull.user_id })      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. Estados no useCampaigns atualizam                                │
│    - vendors[] array muda                                           │
│    - ownVendor passa de null → { id, name, phone, city, notes }    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. AppProvider percebe mudança em useCampaigns                      │
│    - ownVendor muda na dependência do useMemo                       │
│    - contextValue é recalculado                                     │
│    - Novo valor de ownVendor propagado                              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 8. App.jsx recebe novo contexto                                     │
│    const vendor = ownVendor ?? null  // AGORA NÃO É NULL!           │
│    - vendor passa de null → { id, name, phone, city, notes }        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 9. VendorProfilePage recebe novo vendor como prop                   │
│    - useEffect([vendor?.id]) dispara                                │
│    - Inputs sincronizam com novos dados:                            │
│      setName(vendor.name)                                           │
│      setPhone(vendor.phone)                                         │
│      setCity(vendor.city)                                          │
│      setNotes(vendor.notes)                                         │
│      setPhotoUrl(vendor.photo_url)                                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ ✅ SUCESSO! Vendor não é mais null                                   │
│    Tela mostra os dados salvos                                      │
│    Toast: "Perfil atualizado!"                                      │
│    Vendor pode agora enviar propostas em VendorDashboardPage        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8️⃣ CÓDIGO COMPLETO DE CADA ARQUIVO

### A. VendorProfilePage.jsx - handleSave Completo

```jsx
const handleSave = async () => {
  if (!canSave) return;
  setSaving(true);
  try {
    const payload = {
      name: name.trim(),
      phone: unmaskPhone(phone),
      city: city.trim() || null,
      notes: notes.trim() || null,
      photo_url: photoUrl || null,
    };
    let result;
    if (vendor?.id) {
      result = await updateVendor(vendor.id, payload);
    } else {
      result = await createVendor({ ...payload, user_id: user?.id });
    }
    // Persiste photo_url na sessão local do vendor e do user
    try {
      const current = JSON.parse(localStorage.getItem("agro_auth") || "{}");
      localStorage.setItem(
        "agro_auth",
        JSON.stringify({
          ...current,
          vendor_photo_url: photoUrl || null,
          profile_photo_url: photoUrl || null,
        }),
      );
    } catch {}
    showToast("Perfil atualizado!");
    onSaved?.(result); // ← CHAMA reload() aqui
  } catch (e) {
    showToast(e?.message || "Erro ao salvar perfil.", "error");
  } finally {
    setSaving(false);
  }
};
```

### B. App.jsx - Renderização e Props

```jsx
case "vendor-profile":
  return (
    <VendorProfilePage
      user={user}
      vendor={vendor}  // ← vendor = ownVendor ?? null
      onSaved={(result) => {
        reload();  // ← DISPARA reload do contexto
      }}
      onDeleteAccount={() => setShowDeleteModal(true)}
    />
  );
```

### C. updateVendor - Banco de Dados

```javascript
export async function updateVendor(id, patch) {
  // UPDATE
  const { error: updateError } = await supabase
    .from("vendors")
    .update({
      name: patch.name?.trim(),
      phone: (patch.phone ?? "").replace(/\D/g, ""),
      city: patch.city?.trim() || null,
      notes: patch.notes?.trim() || null,
      photo_url: patch.photo_url,
    })
    .eq("id", id);

  if (updateError) throw new Error(updateError?.message);

  // SELECT dos dados atualizados
  const { data, error: selectError } = await supabase
    .from("vendors")
    .select("id, name, phone, city, notes, user_id, photo_url")
    .eq("id", id)
    .single();

  if (selectError) throw new Error(selectError?.message);

  // SYNC com users.profile_photo_url
  if (patch.photo_url !== undefined && data.user_id) {
    await supabase
      .from("users")
      .update({ profile_photo_url: patch.photo_url || null })
      .eq("id", data.user_id);
  }

  return { ...data, admin_user_id: data.user_id };
}
```

### D. useCampaigns - Função reload

```javascript
const loadAll = useCallback(async () => {
  if (!user) {
    setCampaigns([]);
    setVendors([]);
    setLoading(false);
    return;
  }

  setLoading(true);

  try {
    let userWithVendorId = user;

    // Resolve vendorId
    if (user.role === ROLES.VENDOR && !user.vendorId) {
      let { data: vRow } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (vRow) userWithVendorId = { ...user, vendorId: vRow.id };
    }

    const isVendor = user.role === ROLES.VENDOR;
    const vendorId = userWithVendorId?.vendorId ?? null;

    // FETCH vendors
    const [rawCampaigns, rawVendors] = await Promise.all([
      fetchCampaigns(userWithVendorId),
      fetchVendors(user.id, user.role),
    ]);

    // FETCH vendor próprio (SE for VENDOR)
    if (isVendor && vendorId) {
      supabase
        .from("vendors")
        .select("*")
        .eq("id", vendorId)
        .maybeSingle()
        .then(({ data: vFull }) => {
          if (vFull) setOwnVendor({ ...vFull, admin_user_id: vFull.user_id });
        });
    }

    // Process campanhas...
    setCampaigns(withOrders);
    setVendors(rawVendors);
  } catch (err) {
    setError(err?.message);
  } finally {
    setLoading(false);
  }
}, [user]);
```

---

## ✅ RESUMO FINAL

| Passo | O que acontece                      | Arquivo               |
| ----- | ----------------------------------- | --------------------- |
| 1     | Usuário clica "Salvar"              | VendorProfilePage.jsx |
| 2     | handleSave() valida e envia dados   | VendorProfilePage.jsx |
| 3     | updateVendor() atualiza banco       | vendors.js            |
| 4     | onSaved?.(result) dispara           | VendorProfilePage.jsx |
| 5     | reload() recarrega tudo             | useCampaigns.js       |
| 6     | setOwnVendor() recebe dados         | useCampaigns.js       |
| 7     | AppProvider atualiza contexto       | AppProvider.jsx       |
| 8     | App.jsx recebe novo vendor          | App.jsx               |
| 9     | VendorProfilePage sincroniza inputs | VendorProfilePage.jsx |
| ✅    | vendor passa de null → dados        | 🎉 SUCESSO            |

**O vendor deixa de ser null e fica acessível em toda a aplicação!**
