import { useState } from "react";
import {
  Eye,
  EyeOff,
  Loader,
  Building2,
  Wheat,
  Mail,
  MapPin,
  FileText,
  Lock,
  ArrowLeft,
} from "lucide-react";
import { ROLES } from "../constants/roles";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState(ROLES.VENDOR);
  const [showPwd, setShowPwd] = useState(false);
  const [localErr, setLocalErr] = useState("");
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [phone, setPhone] = useState("");

  const reset = (s) => {
    setScreen(s);
    setEmail("");
    setPassword("");
    setConfirm("");
    setLocalErr("");
    setCompany("");
    setCity("");
    setNotes("");
    setPhone("");
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setLocalErr("");
    if (!email || !email.includes("@"))
      return setLocalErr("Informe um email válido.");
    if (!password) return setLocalErr("Informe a senha.");
    onLogin(email, password);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setLocalErr("");
    if (!email || !email.includes("@"))
      return setLocalErr("Informe um email válido.");
    if (password.length < 6)
      return setLocalErr("Senha deve ter ao menos 6 caracteres.");
    if (password !== confirm) return setLocalErr("As senhas não coincidem.");
    if (role === ROLES.VENDOR && !company.trim())
      return setLocalErr("Informe o nome da empresa.");
    onRegister(email, password, role, {
      company_name: company,
      city,
      notes,
      phone,
    });
  };

  const displayError = localErr || error;
  const isValidEmail = email && email.includes("@");

  if (screen === "login") {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.logoWrap}>
            <LogoMark />
            <h1 className={styles.brand}>AgroColetivo</h1>
            <p className={styles.sub}>Compras coletivas para o campo</p>
          </div>

          <form onSubmit={handleLogin} aria-label="Formulário de login">
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">
                <Mail
                  size={12}
                  style={{ marginRight: 4, verticalAlign: "middle" }}
                />{" "}
                Email
              </label>
              <input
                id="login-email"
                className="form-input"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                autoFocus
                inputMode="email"
                autoComplete="email"
                aria-required="true"
                aria-invalid={displayError ? "true" : "false"}
                aria-describedby={displayError ? "login-error" : undefined}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                <Lock
                  size={12}
                  style={{ marginRight: 4, verticalAlign: "middle" }}
                />{" "}
                Senha
              </label>
              <div className={styles.passWrap}>
                <input
                  id="login-password"
                  className={`form-input ${styles.passInput}`}
                  type={showPwd ? "text" : "password"}
                  placeholder="........"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  aria-required="true"
                  aria-invalid={displayError ? "true" : "false"}
                  aria-describedby={displayError ? "login-error" : undefined}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPwd((s) => !s)}
                  aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPwd}
                >
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            {displayError && (
              <div id="login-error" className={styles.error} role="alert">
                {displayError}
              </div>
            )}
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || !isValidEmail || !password}
              aria-busy={loading}
            >
              {loading ? (
                <Loader size={15} className={styles.spin} />
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          <p className={styles.hint}>
            <button
              type="button"
              className={styles.hintLink}
              onClick={() => (window.location.href = "/auth/recuperar-senha")}
            >
              Esqueceu a senha?
            </button>
          </p>

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

        <form
          onSubmit={handleRegister}
          aria-label="Formulário de criação de conta"
        >
          <div className={styles.roleGroup}>
            <span className={styles.roleLabel} id="role-group-label">
              Tipo de conta
            </span>
            <div
              className={styles.roleCards}
              role="group"
              aria-labelledby="role-group-label"
            >
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
                  aria-pressed={role === r.value}
                  aria-label={`Selecionar tipo: ${r.title}. ${r.sub}`}
                >
                  {r.icon}
                  <span className={styles.roleCardTitle}>{r.title}</span>
                  <span className={styles.roleCardSub}>{r.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-email">
              <Mail
                size={12}
                style={{ marginRight: 4, verticalAlign: "middle" }}
              />{" "}
              Email *
            </label>
            <input
              id="register-email"
              className="form-input"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
              autoFocus
              inputMode="email"
              aria-required="true"
              aria-invalid={displayError ? "true" : "false"}
              aria-describedby={
                displayError ? "register-error" : "register-email-hint"
              }
            />
            <span className="form-hint" id="register-email-hint">
              Será seu login. Deve ser único.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-phone">
              <Building2
                size={12}
                style={{ marginRight: 4, verticalAlign: "middle" }}
              />{" "}
              WhatsApp / Telefone
            </label>
            <input
              id="register-phone"
              className="form-input"
              type="tel"
              placeholder="(88) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {role === ROLES.VENDOR && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="register-company">
                  <Building2
                    size={12}
                    style={{ marginRight: 4, verticalAlign: "middle" }}
                  />{" "}
                  Nome da empresa *
                </label>
                <input
                  id="register-company"
                  className="form-input"
                  placeholder="Ex: Agropecuária Central"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  aria-required="true"
                  aria-invalid={
                    displayError && company === "" ? "true" : "false"
                  }
                />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="register-vendor-city">
                    <MapPin
                      size={12}
                      style={{ marginRight: 4, verticalAlign: "middle" }}
                    />{" "}
                    Cidade
                  </label>
                  <input
                    id="register-vendor-city"
                    className="form-input"
                    placeholder="Ex: Tabuleiro"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="register-products">
                    <FileText
                      size={12}
                      style={{ marginRight: 4, verticalAlign: "middle" }}
                    />{" "}
                    Produtos que fornece
                  </label>
                  <input
                    id="register-products"
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
                <label className="form-label" htmlFor="register-gestor-name">
                  <Building2
                    size={12}
                    style={{ marginRight: 4, verticalAlign: "middle" }}
                  />{" "}
                  Nome / Associação
                </label>
                <input
                  id="register-gestor-name"
                  className="form-input"
                  placeholder="Ex: Assentamento São José"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="register-gestor-city">
                  <MapPin
                    size={12}
                    style={{ marginRight: 4, verticalAlign: "middle" }}
                  />{" "}
                  Cidade
                </label>
                <input
                  id="register-gestor-city"
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
              <label className="form-label" htmlFor="register-password">
                <Lock
                  size={12}
                  style={{ marginRight: 4, verticalAlign: "middle" }}
                />{" "}
                Senha *
              </label>
              <div className={styles.passWrap}>
                <input
                  id="register-password"
                  className={`form-input ${styles.passInput}`}
                  type={showPwd ? "text" : "password"}
                  placeholder="min. 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-required="true"
                  aria-invalid={displayError ? "true" : "false"}
                  aria-describedby={displayError ? "register-error" : undefined}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPwd((s) => !s)}
                  aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPwd}
                >
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="register-confirm">
                Confirmar senha *
              </label>
              <input
                id="register-confirm"
                className="form-input"
                type="password"
                placeholder="repita a senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                aria-required="true"
                aria-invalid={displayError ? "true" : "false"}
                aria-describedby={displayError ? "register-error" : undefined}
              />
            </div>
          </div>

          {displayError && (
            <div id="register-error" className={styles.error} role="alert">
              {displayError}
            </div>
          )}
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading || !isValidEmail || !password || !confirm}
            aria-busy={loading}
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
            aria-label="Ir para página de login"
          >
            Fazer login aqui.
          </button>
        </p>
      </div>
    </div>
  );

  if (screen === "login") {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.logoWrap}>
            <LogoMark />
            <h1 className={styles.brand}>AgroColetivo</h1>
            <p className={styles.sub}>Compras coletivas para o campo</p>
          </div>

          <form onSubmit={handleLogin} aria-label="Formulário de login">
            <div className="form-group">
              <label className="form-label" htmlFor="login-phone">
                <Phone
                  size={12}
                  style={{ marginRight: 4, verticalAlign: "middle" }}
                />{" "}
                WhatsApp / Telefone
              </label>
              <input
                id="login-phone"
                className="form-input"
                type="tel"
                placeholder="(38) 99111-0001"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                autoFocus
                inputMode="tel"
                autoComplete="tel"
                aria-required="true"
                aria-invalid={displayError ? "true" : "false"}
                aria-describedby={displayError ? "login-error" : undefined}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                <Lock
                  size={12}
                  style={{ marginRight: 4, verticalAlign: "middle" }}
                />{" "}
                Senha
              </label>
              <div className={styles.passWrap}>
                <input
                  id="login-password"
                  className={`form-input ${styles.passInput}`}
                  type={showPwd ? "text" : "password"}
                  placeholder="........"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  aria-required="true"
                  aria-invalid={displayError ? "true" : "false"}
                  aria-describedby={displayError ? "login-error" : undefined}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPwd((s) => !s)}
                  aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPwd}
                >
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            {displayError && (
              <div id="login-error" className={styles.error} role="alert">
                {displayError}
              </div>
            )}
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || unmaskPhone(phone).length < 10 || !password}
              aria-busy={loading}
            >
              {loading ? (
                <Loader size={15} className={styles.spin} />
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          <p className={styles.hint}>
            <button
              type="button"
              className={styles.hintLink}
              onClick={() => (window.location.href = "/auth/recuperar-senha")}
            >
              Esqueceu a senha?
            </button>
          </p>

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

        <form
          onSubmit={handleRegister}
          aria-label="Formulário de criação de conta"
        >
          <div className={styles.roleGroup}>
            <span className={styles.roleLabel} id="role-group-label">
              Tipo de conta
            </span>
            <div
              className={styles.roleCards}
              role="group"
              aria-labelledby="role-group-label"
            >
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
                  aria-pressed={role === r.value}
                  aria-label={`Selecionar tipo: ${r.title}. ${r.sub}`}
                >
                  {r.icon}
                  <span className={styles.roleCardTitle}>{r.title}</span>
                  <span className={styles.roleCardSub}>{r.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-phone">
              <Phone
                size={12}
                style={{ marginRight: 4, verticalAlign: "middle" }}
              />{" "}
              WhatsApp com DDD *
            </label>
            <input
              id="register-phone"
              className="form-input"
              type="tel"
              placeholder="(38) 99111-0001"
              value={phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
              autoFocus
              inputMode="tel"
              aria-required="true"
              aria-invalid={displayError ? "true" : "false"}
              aria-describedby={
                displayError ? "register-error" : "register-phone-hint"
              }
            />
            <span className="form-hint" id="register-phone-hint">
              Será seu login. Deve ser único.
            </span>
          </div>

          {role === ROLES.VENDOR && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="register-company">
                  <Building2
                    size={12}
                    style={{ marginRight: 4, verticalAlign: "middle" }}
                  />{" "}
                  Nome da empresa *
                </label>
                <input
                  id="register-company"
                  className="form-input"
                  placeholder="Ex: Agropecuária Central"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  aria-required="true"
                  aria-invalid={
                    displayError && company === "" ? "true" : "false"
                  }
                />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="register-vendor-city">
                    <MapPin
                      size={12}
                      style={{ marginRight: 4, verticalAlign: "middle" }}
                    />{" "}
                    Cidade
                  </label>
                  <input
                    id="register-vendor-city"
                    className="form-input"
                    placeholder="Ex: Tabuleiro"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="register-products">
                    <FileText
                      size={12}
                      style={{ marginRight: 4, verticalAlign: "middle" }}
                    />{" "}
                    Produtos que fornece
                  </label>
                  <input
                    id="register-products"
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
                <label className="form-label" htmlFor="register-gestor-name">
                  <Building2
                    size={12}
                    style={{ marginRight: 4, verticalAlign: "middle" }}
                  />{" "}
                  Nome / Associação
                </label>
                <input
                  id="register-gestor-name"
                  className="form-input"
                  placeholder="Ex: Assentamento São José"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="register-gestor-city">
                  <MapPin
                    size={12}
                    style={{ marginRight: 4, verticalAlign: "middle" }}
                  />{" "}
                  Cidade
                </label>
                <input
                  id="register-gestor-city"
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
              <label className="form-label" htmlFor="register-password">
                <Lock
                  size={12}
                  style={{ marginRight: 4, verticalAlign: "middle" }}
                />{" "}
                Senha *
              </label>
              <div className={styles.passWrap}>
                <input
                  id="register-password"
                  className={`form-input ${styles.passInput}`}
                  type={showPwd ? "text" : "password"}
                  placeholder="min. 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-required="true"
                  aria-invalid={displayError ? "true" : "false"}
                  aria-describedby={displayError ? "register-error" : undefined}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPwd((s) => !s)}
                  aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPwd}
                >
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="register-confirm">
                Confirmar senha *
              </label>
              <input
                id="register-confirm"
                className="form-input"
                type="password"
                placeholder="repita a senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                aria-required="true"
                aria-invalid={displayError ? "true" : "false"}
                aria-describedby={displayError ? "register-error" : undefined}
              />
            </div>
          </div>

          {displayError && (
            <div id="register-error" className={styles.error} role="alert">
              {displayError}
            </div>
          )}
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={
              loading || unmaskPhone(phone).length < 10 || !password || !confirm
            }
            aria-busy={loading}
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
            aria-label="Ir para página de login"
          >
            Fazer login aqui.
          </button>
        </p>
      </div>
    </div>
  );
}
