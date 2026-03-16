import { useState } from "react";
import {
  Eye,
  EyeOff,
  Loader,
  Building2,
  Wheat,
  Phone,
  MapPin,
  FileText,
  Lock,
  ArrowLeft,
} from "lucide-react";
import { ROLES } from "../constants/roles";
import { maskPhone, unmaskPhone } from "../utils/masks";
import styles from "./LoginPage.module.css";

function LogoMark() {
  return (
    <img
      src="https://i.imgur.com/clDJyAh.png"
      alt="AgroColetivo"
      width="44"
      height="44"
      style={{ borderRadius: 12, objectFit: "cover" }}
    />
  );
}

export function LoginPage({ onLogin, onRegister, loading, error }) {
  const [screen, setScreen] = useState("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState(ROLES.VENDOR);
  const [showPwd, setShowPwd] = useState(false);
  const [localErr, setLocalErr] = useState("");
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");

  const reset = (s) => {
    setScreen(s);
    setPhone("");
    setPassword("");
    setConfirm("");
    setLocalErr("");
    setCompany("");
    setCity("");
    setNotes("");
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setLocalErr("");
    const clean = unmaskPhone(phone);
    if (clean.length < 10) return setLocalErr("Informe um telefone válido.");
    if (!password) return setLocalErr("Informe a senha.");
    onLogin(clean, password);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setLocalErr("");
    const clean = unmaskPhone(phone);
    if (clean.length < 10)
      return setLocalErr("Informe um telefone válido com DDD.");
    if (password.length < 6)
      return setLocalErr("Senha deve ter ao menos 6 caracteres.");
    if (password !== confirm) return setLocalErr("As senhas não coincidem.");
    if (role === ROLES.VENDOR && !company.trim())
      return setLocalErr("Informe o nome da empresa.");
    onRegister(clean, password, role, { company_name: company, city, notes });
  };

  const displayError = localErr || error;

  if (screen === "login") {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.logoWrap}>
            <LogoMark />
            <h1 className={styles.brand}>AgroColetivo</h1>
            <p className={styles.sub}>Compras coletivas para o campo</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">
                <Phone
                  size={12}
                  style={{ marginRight: 4, verticalAlign: "middle" }}
                />{" "}
                WhatsApp / Telefone
              </label>
              <input
                className="form-input"
                type="tel"
                placeholder="(38) 99111-0001"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                autoFocus
                inputMode="tel"
                autoComplete="tel"
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                <Lock
                  size={12}
                  style={{ marginRight: 4, verticalAlign: "middle" }}
                />{" "}
                Senha
              </label>
              <div className={styles.passWrap}>
                <input
                  className={`form-input ${styles.passInput}`}
                  type={showPwd ? "text" : "password"}
                  placeholder="........"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPwd((s) => !s)}
                >
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            {displayError && <div className={styles.error}>{displayError}</div>}
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || unmaskPhone(phone).length < 10 || !password}
            >
              {loading ? (
                <Loader size={15} className={styles.spin} />
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          <p className={styles.hint}>
            Novo aqui?{" "}
            <button
              type="button"
              className={styles.hintLink}
              onClick={() => reset("register")}
            >
              Crie sua conta gratuitamente.
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <LogoMark />
          <h1 className={styles.brand}>Criar conta</h1>
          <p className={styles.sub}>
            AgroColetivo — Compras coletivas para o campo
          </p>
        </div>

        <form onSubmit={handleRegister}>
          <div className={styles.roleGroup}>
            <span className={styles.roleLabel}>Tipo de conta</span>
            <div className={styles.roleCards}>
              {[
                {
                  value: ROLES.VENDOR,
                  icon: <Wheat size={18} />,
                  title: "Fornecedor",
                  sub: "Empresa que fornece produtos",
                },
                {
                  value: ROLES.GESTOR,
                  icon: <Building2 size={18} />,
                  title: "Gestor",
                  sub: "Coordena compras coletivas",
                },
              ].map((r) => (
                <button
                  key={r.value}
                  type="button"
                  className={`${styles.roleCard} ${role === r.value ? styles.roleCardActive : ""}`}
                  onClick={() => setRole(r.value)}
                >
                  {r.icon}
                  <span className={styles.roleCardTitle}>{r.title}</span>
                  <span className={styles.roleCardSub}>{r.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <Phone
                size={12}
                style={{ marginRight: 4, verticalAlign: "middle" }}
              />{" "}
              WhatsApp com DDD *
            </label>
            <input
              className="form-input"
              type="tel"
              placeholder="(38) 99111-0001"
              value={phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
              autoFocus
              inputMode="tel"
            />
            <span className="form-hint">Será seu login. Deve ser único.</span>
          </div>

          {role === ROLES.VENDOR && (
            <>
              <div className="form-group">
                <label className="form-label">
                  <Building2
                    size={12}
                    style={{ marginRight: 4, verticalAlign: "middle" }}
                  />{" "}
                  Nome da empresa *
                </label>
                <input
                  className="form-input"
                  placeholder="Ex: Agropecuária Central"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">
                    <MapPin
                      size={12}
                      style={{ marginRight: 4, verticalAlign: "middle" }}
                    />{" "}
                    Cidade
                  </label>
                  <input
                    className="form-input"
                    placeholder="Ex: Tabuleiro"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <FileText
                      size={12}
                      style={{ marginRight: 4, verticalAlign: "middle" }}
                    />{" "}
                    Produtos que fornece
                  </label>
                  <input
                    className="form-input"
                    placeholder="Ração, adubo..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {role === ROLES.GESTOR && (
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">
                  <Building2
                    size={12}
                    style={{ marginRight: 4, verticalAlign: "middle" }}
                  />{" "}
                  Nome / Associação
                </label>
                <input
                  className="form-input"
                  placeholder="Ex: Assentamento São José"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  <MapPin
                    size={12}
                    style={{ marginRight: 4, verticalAlign: "middle" }}
                  />{" "}
                  Cidade
                </label>
                <input
                  className="form-input"
                  placeholder="Ex: Tabuleiro"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">
                <Lock
                  size={12}
                  style={{ marginRight: 4, verticalAlign: "middle" }}
                />{" "}
                Senha
              </label>
              <div className={styles.passWrap}>
                <input
                  className={`form-input ${styles.passInput}`}
                  type={showPwd ? "text" : "password"}
                  placeholder="min. 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPwd((s) => !s)}
                >
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirmar senha</label>
              <input
                className="form-input"
                type="password"
                placeholder="repita a senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          </div>

          {displayError && <div className={styles.error}>{displayError}</div>}
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={
              loading || unmaskPhone(phone).length < 10 || !password || !confirm
            }
          >
            {loading ? (
              <Loader size={15} className={styles.spin} />
            ) : (
              "Criar conta"
            )}
          </button>
        </form>

        <p className={styles.hint}>
          Já tem conta?{" "}
          <button
            type="button"
            className={styles.hintLink}
            onClick={() => reset("login")}
          >
            Fazer login aqui.
          </button>
        </p>
      </div>
    </div>
  );
}
