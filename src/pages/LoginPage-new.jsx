import { useState } from "react";
import {
  Eye,
  EyeOff,
  Loader,
  Building2,
  Wheat,
  Mail,
  MapPin,
  Lock,
  Phone,
  Home,
  FileText,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Check,
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

/**
 * LoginPage REFATORADA
 * - Sem localStorage poluído
 * - Sem preenchimento automático
 * - Formulário simples e limpo
 */
export function LoginPage({
  onLogin,
  onRegister,
  loading,
  error,
  onForgotPassword,
}) {
  const [screen, setScreen] = useState("login"); // login | register
  const [registerStep, setRegisterStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState(ROLES.VENDOR);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [localErr, setLocalErr] = useState("");
  const [notes, setNotes] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // ─────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────

  const isValidEmail = (str) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
  const cleanPhone = unmaskPhone(phone);

  const passwordRules = [
    {
      ok: password.length >= 8,
      label: "Mínimo de 8 caracteres",
    },
    {
      ok: /[a-z]/.test(password),
      label: "Pelo menos 1 letra minúscula",
    },
    {
      ok: /[A-Z]/.test(password),
      label: "Pelo menos 1 letra maiúscula",
    },
    {
      ok: /\d/.test(password),
      label: "Pelo menos 1 número",
    },
  ];

  const passwordScore = passwordRules.filter((rule) => rule.ok).length;
  const passwordStrength =
    passwordScore <= 1 ? "weak" : passwordScore <= 3 ? "medium" : "strong";

  const resetForm = (newScreen) => {
    setScreen(newScreen);
    setEmail("");
    setPassword("");
    setConfirm("");
    setRole(ROLES.VENDOR);
    setCompany("");
    setCity("");
    setPhone("");
    setAddress("");
    setNotes("");
    setAcceptTerms(false);
    setLocalErr("");
    setShowPwd(false);
    setShowConfirmPwd(false);
    setRegisterStep(1);
  };

  const validateRegisterStepOne = () => {
    if (!isValidEmail(email)) return "Informe um email válido.";
    if (!company.trim()) {
      return role === ROLES.VENDOR
        ? "Informe o nome da empresa."
        : "Informe o nome da associação.";
    }
    if (company.trim().length < 3) {
      return "Nome da empresa/associação deve ter ao menos 3 caracteres.";
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      return "Informe um WhatsApp válido com DDD.";
    }
    if (city.trim().length < 2) {
      return "Informe a cidade com pelo menos 2 caracteres.";
    }
    if (role === ROLES.VENDOR && address.trim() && address.trim().length < 6) {
      return "Se preencher endereço, informe ao menos rua e número.";
    }
    return "";
  };

  const validateRegisterStepTwo = () => {
    const missingRule = passwordRules.find((rule) => !rule.ok);
    if (missingRule) return "Sua senha ainda não atende aos requisitos mínimos.";
    if (password !== confirm) return "As senhas não coincidem.";
    if (!acceptTerms) return "Você precisa aceitar os termos para continuar.";
    return "";
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setLocalErr("");

    if (!isValidEmail(email)) {
      setLocalErr("Email inválido.");
      return;
    }
    if (!password || password.length < 6) {
      setLocalErr("Senha deve ter no mínimo 6 caracteres.");
      return;
    }

    onLogin(email, password);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setLocalErr("");

    const stepOneError = validateRegisterStepOne();
    if (stepOneError) {
      setRegisterStep(1);
      setLocalErr(stepOneError);
      return;
    }

    const stepTwoError = validateRegisterStepTwo();
    if (stepTwoError) {
      setRegisterStep(2);
      setLocalErr(stepTwoError);
      return;
    }

    onRegister(email, password, role, {
      company_name: company.trim(),
      phone: cleanPhone,
      city: city.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
    });
  };

  const handleGoToRegisterStepTwo = () => {
    setLocalErr("");
    const stepOneError = validateRegisterStepOne();
    if (stepOneError) {
      setLocalErr(stepOneError);
      return;
    }
    setRegisterStep(2);
  };

  // ─────────────────────────────────────────────────────────
  // UI: LOGIN
  // ─────────────────────────────────────────────────────────

  if (screen === "login") {
    return (
      <div className={styles.page}>
        <div className={styles.splitLayout}>
          <div className={styles.visualSide}>
            <div className={styles.overlay} />
            <img
              src="/agro_login_bg_1774615846296.png"
              alt="Agro Technology"
              className={styles.bgImage}
            />
            <div className={styles.visualContent}>
              <div className={styles.visualLogo}>
                <LogoMark />
                <span className={styles.visualBrand}>AgroColetivo</span>
              </div>

              <span className={styles.visualKicker}>Plataforma de compras coletivas</span>
              <h2 className={styles.visualTitle}>Conecte produtores, gestores e fornecedores em um so fluxo.</h2>
              <p className={styles.visualSub}>
                Organize cotacoes, receba propostas e acompanhe pedidos com seguranca e agilidade.
              </p>

              <div className={styles.visualBullets}>
                <div className={styles.visualBullet}>
                  <Check size={15} /> Cadastro com verificacao por email
                </div>
                <div className={styles.visualBullet}>
                  <Check size={15} /> Fluxo otimizado para campo e escritorio
                </div>
                <div className={styles.visualBullet}>
                  <Check size={15} /> Alertas de login e trilha de seguranca
                </div>
              </div>

              <div className={styles.visualStats}>
                <div className={styles.statCard}>
                  <strong>100%</strong>
                  <span>foco em compras coletivas</span>
                </div>
                <div className={styles.statCard}>
                  <strong>2 perfis</strong>
                  <span>Gestor e Fornecedor</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.authSide}>
            <div className={styles.authContainer}>
              <div className={styles.contentAnim}>
                <div className={styles.formHeader}>
                  <h1 className={styles.title}>Bem-vindo de volta</h1>
                  <p className={styles.sub}>
                    Entre com seu email e senha para acessar seu painel
                  </p>
                </div>

                <form
                  onSubmit={handleLogin}
                  className={styles.form}
                  autoComplete="off"
                >
                  <div className="form-group">
                    <label className="form-label" htmlFor="login-email">
                      Email
                    </label>
                    <div className={styles.inputIconWrapper}>
                      <Mail size={18} className={styles.inputIcon} />
                      <input
                        id="login-email"
                        className="form-input"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) =>
                          setEmail(e.target.value.toLowerCase().trim())
                        }
                        autoComplete="email"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <div className={styles.labelRow}>
                      <label className="form-label" htmlFor="login-password">
                        Senha
                      </label>
                      <button
                        type="button"
                        className={styles.forgotBtn}
                        onClick={() => {
                          if (typeof onForgotPassword === "function") {
                            onForgotPassword();
                          }
                        }}
                      >
                        Esqueceu?
                      </button>
                    </div>
                    <div className={styles.inputIconWrapper}>
                      <Lock size={18} className={styles.inputIcon} />
                      <input
                        id="login-password"
                        className="form-input"
                        type={showPwd ? "text" : "password"}
                        placeholder="Sua senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className={styles.eyeBtn}
                        onClick={() => setShowPwd(!showPwd)}
                      >
                        {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {(localErr || error) && (
                    <div className={styles.errorAlert} role="alert">
                      {localErr || error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className={styles.mainActionBtn}
                    disabled={loading || !isValidEmail(email) || !password}
                  >
                    {loading ? (
                      <>
                        <Loader size={18} className="spin" /> Entrando...
                      </>
                    ) : (
                      "Acessar Plataforma"
                    )}
                  </button>
                </form>

                <div className={styles.footer}>
                  <p>Novo por aqui?</p>
                  <button
                    type="button"
                    className={styles.secondaryActionBtn}
                    onClick={() => resetForm("register")}
                  >
                    Criar conta gratuita <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // UI: REGISTER
  // ─────────────────────────────────────────────────────────

  if (screen === "register") {
    return (
      <div className={styles.page}>
        <div className={styles.splitLayout}>
          <div className={styles.visualSide}>
            <div className={styles.overlay} />
            <img
              src="/agro_login_bg_1774615846296.png"
              alt="Agro Technology"
              className={styles.bgImage}
            />
            <div className={styles.visualContent}>
              <div className={styles.visualLogo}>
                <LogoMark />
                <span className={styles.visualBrand}>AgroColetivo</span>
              </div>

              <span className={styles.visualKicker}>Cadastro inteligente</span>
              <h2 className={styles.visualTitle}>Crie sua conta em dois passos.</h2>
              <p className={styles.visualSub}>
                Coletamos somente o necessario para liberar seu acesso com seguranca.
              </p>
            </div>
          </div>

          <div className={styles.authSide}>
            <div className={styles.authContainer}>
              <div className={styles.contentAnim}>
                <div className={styles.formHeader}>
                  <h1 className={styles.title}>Comece agora</h1>
                  <p className={styles.sub}>Perfil, contato e senha segura para ativar sua conta</p>
                </div>

                <div className={styles.stepper}>
                  <div className={`${styles.stepItem} ${registerStep >= 1 ? styles.stepActive : ""}`}>
                    <span>1</span>
                    <p>Dados do negocio</p>
                  </div>
                  <div className={styles.stepLine} />
                  <div className={`${styles.stepItem} ${registerStep >= 2 ? styles.stepActive : ""}`}>
                    <span>2</span>
                    <p>Senha e seguranca</p>
                  </div>
                </div>

                <form
                  onSubmit={handleRegister}
                  className={styles.form}
                  autoComplete="off"
                >
                  {registerStep === 1 && (
                    <>
                      <div className={styles.roleSelection}>
                        <button
                          type="button"
                          className={`${styles.roleOption} ${
                            role === ROLES.VENDOR ? styles.roleActive : ""
                          }`}
                          onClick={() => setRole(ROLES.VENDOR)}
                        >
                          <Wheat size={20} />
                          <div className={styles.roleTexts}>
                            <span className={styles.roleName}>Fornecedor</span>
                            <span className={styles.roleDesc}>Vender produtos</span>
                          </div>
                        </button>
                        <button
                          type="button"
                          className={`${styles.roleOption} ${
                            role === ROLES.GESTOR ? styles.roleActive : ""
                          }`}
                          onClick={() => setRole(ROLES.GESTOR)}
                        >
                          <Building2 size={20} />
                          <div className={styles.roleTexts}>
                            <span className={styles.roleName}>Gestor</span>
                            <span className={styles.roleDesc}>Coordenar compras</span>
                          </div>
                        </button>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="register-email">Email de trabalho</label>
                        <div className={styles.inputIconWrapper}>
                          <Mail size={18} className={styles.inputIcon} />
                          <input
                            id="register-email"
                            className="form-input"
                            type="email"
                            placeholder="seu@trabalho.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                            autoComplete="email"
                          />
                        </div>
                      </div>

                      <div className="grid-2">
                        <div className="form-group">
                          <label className="form-label" htmlFor="register-phone">WhatsApp</label>
                          <div className={styles.inputIconWrapper}>
                            <Phone size={18} className={styles.inputIcon} />
                            <input
                              id="register-phone"
                              className="form-input"
                              placeholder="(00) 00000-0000"
                              value={phone}
                              onChange={(e) => setPhone(maskPhone(e.target.value))}
                              autoComplete="tel"
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="register-company">
                            {role === ROLES.VENDOR ? "Empresa" : "Associacao"}
                          </label>
                          <div className={styles.inputIconWrapper}>
                            <Building2 size={18} className={styles.inputIcon} />
                            <input
                              id="register-company"
                              className="form-input"
                              placeholder={
                                role === ROLES.VENDOR
                                  ? "Nome da sua empresa"
                                  : "Nome da associacao"
                              }
                              value={company}
                              onChange={(e) => setCompany(e.target.value)}
                              autoComplete="organization"
                            />
                          </div>
                        </div>
                      </div>

                      {role === ROLES.VENDOR && (
                        <div className="form-group">
                          <label className="form-label" htmlFor="register-address">Endereco (opcional)</label>
                          <div className={styles.inputIconWrapper}>
                            <Home size={18} className={styles.inputIcon} />
                            <input
                              id="register-address"
                              className="form-input"
                              placeholder="Rua, numero e bairro"
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                              autoComplete="street-address"
                            />
                          </div>
                        </div>
                      )}

                      <div className="grid-2">
                        <div className="form-group">
                          <label className="form-label" htmlFor="register-city">Cidade</label>
                          <div className={styles.inputIconWrapper}>
                            <MapPin size={18} className={styles.inputIcon} />
                            <input
                              id="register-city"
                              className="form-input"
                              placeholder="Ex: Tabuleiro do Norte"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              autoComplete="address-level2"
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="register-notes">Observacoes (opcional)</label>
                          <div className={styles.inputIconWrapper}>
                            <FileText size={18} className={styles.inputIcon} />
                            <input
                              id="register-notes"
                              className="form-input"
                              placeholder="Ex: Atende atacado"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              maxLength={120}
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={styles.mainActionBtn}
                        onClick={handleGoToRegisterStepTwo}
                        disabled={loading}
                      >
                        Avancar para senha <ArrowRight size={16} />
                      </button>
                    </>
                  )}

                  {registerStep === 2 && (
                    <>
                      <div className={styles.passwordCard}>
                        <div className={styles.passwordHead}>
                          <ShieldCheck size={17} />
                          <p>Configure uma senha segura</p>
                        </div>

                        <div className="grid-2">
                          <div className="form-group">
                            <label className="form-label" htmlFor="register-password">Senha de acesso</label>
                            <div className={styles.inputIconWrapper}>
                              <Lock size={18} className={styles.inputIcon} />
                              <input
                                id="register-password"
                                className="form-input"
                                type={showPwd ? "text" : "password"}
                                placeholder="Digite sua senha"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
                              />
                              <button
                                type="button"
                                className={styles.eyeBtn}
                                onClick={() => setShowPwd(!showPwd)}
                              >
                                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                          </div>
                          <div className="form-group">
                            <label className="form-label" htmlFor="register-confirm">Confirmar senha</label>
                            <div className={styles.inputIconWrapper}>
                              <Lock size={18} className={styles.inputIcon} />
                              <input
                                id="register-confirm"
                                className="form-input"
                                type={showConfirmPwd ? "text" : "password"}
                                placeholder="Repita a senha"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                autoComplete="new-password"
                              />
                              <button
                                type="button"
                                className={styles.eyeBtn}
                                onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                              >
                                {showConfirmPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className={styles.passwordMeterWrap}>
                          <div className={styles.passwordMeterTrack}>
                            <div
                              className={`${styles.passwordMeterFill} ${styles[`strength_${passwordStrength}`]}`}
                              style={{ width: `${(passwordScore / 4) * 100}%` }}
                            />
                          </div>
                          <span className={styles.passwordStrengthLabel}>
                            Forca: {passwordStrength === "weak" ? "fraca" : passwordStrength === "medium" ? "media" : "forte"}
                          </span>
                        </div>

                        <ul className={styles.passwordRules}>
                          {passwordRules.map((rule) => (
                            <li key={rule.label} className={rule.ok ? styles.ruleOk : ""}>
                              <Check size={13} /> {rule.label}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <label className={styles.termsCheck}>
                        <input
                          type="checkbox"
                          checked={acceptTerms}
                          onChange={(e) => setAcceptTerms(e.target.checked)}
                        />
                        <span>
                          Eu confirmo que os dados informados sao verdadeiros e autorizo o contato da plataforma.
                        </span>
                      </label>

                      <div className={styles.stepActions}>
                        <button
                          type="button"
                          className={styles.backBtn}
                          onClick={() => {
                            setLocalErr("");
                            setRegisterStep(1);
                          }}
                          disabled={loading}
                        >
                          <ArrowLeft size={15} /> Voltar
                        </button>

                        <button
                          type="submit"
                          className={styles.mainActionBtn}
                          disabled={loading || passwordRules.some((rule) => !rule.ok) || password !== confirm || !acceptTerms}
                        >
                          {loading ? (
                            <>
                              <Loader size={18} className="spin" /> Criando conta...
                            </>
                          ) : (
                            "Finalizar cadastro"
                          )}
                        </button>
                      </div>
                    </>
                  )}

                  {(localErr || error) && (
                    <div className={styles.errorAlert} role="alert">
                      {localErr || error}
                    </div>
                  )}
                </form>

                <div className={styles.footer}>
                  <p>Já possui cadastro?</p>
                  <button
                    type="button"
                    className={styles.secondaryActionBtn}
                    onClick={() => resetForm("login")}
                  >
                    Fazer login <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
