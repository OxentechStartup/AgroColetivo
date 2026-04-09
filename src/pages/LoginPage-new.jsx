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
import { BRAND_NAME, BRAND_LOGO_URL } from "../constants/branding";
import styles from "./LoginPage.module.css";

function LogoMark() {
  return (
    <img
      src={BRAND_LOGO_URL}
      alt={BRAND_NAME}
      className={styles.visualLogoMark}
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
  onClearError,
  onForgotPassword,
}) {
  const [screen, setScreen] = useState("login"); // login | register
  const [registerStep, setRegisterStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState(ROLES.VENDOR);
  const [showPwd, setShowPwd] = useState(false);
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [localErr, setLocalErr] = useState("");
  const [lastSubmitScreen, setLastSubmitScreen] = useState(null);
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
  const loginReady = isValidEmail(email) && password.length >= 6;
  const remoteError = lastSubmitScreen === screen ? error : "";

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
    setLastSubmitScreen(null);
    setShowPwd(false);
    setRegisterStep(1);
    if (typeof onClearError === "function") {
      onClearError();
    }
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
    if (missingRule)
      return "Sua senha ainda não atende aos requisitos mínimos.";
    if (password !== confirm) return "As senhas não coincidem.";
    if (!acceptTerms) return "Você precisa aceitar os termos para continuar.";
    return "";
  };

  const registerStepOneError = validateRegisterStepOne();
  const registerStepTwoError = validateRegisterStepTwo();

  const handleLogin = (e) => {
    e.preventDefault();
    setLastSubmitScreen("login");
    setLocalErr("");
    if (typeof onClearError === "function") {
      onClearError();
    }

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
    setLastSubmitScreen("register");
    setLocalErr("");
    if (typeof onClearError === "function") {
      onClearError();
    }

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
    setLastSubmitScreen("register");
    setLocalErr("");
    if (typeof onClearError === "function") {
      onClearError();
    }
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
      <div className={`${styles.page} ${styles.pageLogin}`}>
        <div className={styles.splitLayout}>
          <div className={styles.visualSide}>
            <div className={styles.bgImage} aria-hidden="true" />
            <div className={styles.overlay} />
            <div className={styles.visualGlowA} aria-hidden="true" />
            <div className={styles.visualGlowB} aria-hidden="true" />
            <div className={styles.visualContent}>
              <div className={styles.visualShell}>
                <div className={styles.visualLogo}>
                  <LogoMark />
                  <span className={styles.visualBrand}>{BRAND_NAME}</span>
                </div>

                <span className={styles.visualKicker}>
                  Acesso da Plataforma
                </span>
                <h2 className={styles.visualTitle}>Bem-vindo de volta!</h2>
                <p className={styles.visualSub}>
                  Entre para acessar seu painel no {BRAND_NAME} e acompanhar suas
                  cotações em tempo real.
                </p>

                <div className={styles.visualBullets}>
                  <div className={styles.visualBullet}>
                    <Check size={15} /> Fluxo seguro para gestores e
                    fornecedores
                  </div>
                  <div className={styles.visualBullet}>
                    <Check size={15} /> Atualização automática sem precisar
                    recarregar
                  </div>
                  <div className={styles.visualBullet}>
                    <Check size={15} /> Pedidos, propostas e monitoramento em um
                    só lugar
                  </div>
                </div>

                <div className={styles.visualStats}>
                  <div className={styles.statCard}>
                    <strong>+ controle</strong>
                    <span>de ponta a ponta</span>
                  </div>
                  <div className={styles.statCard}>
                    <strong>tempo real</strong>
                    <span>para toda operação</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.authSide}>
            <div className={styles.authContainer}>
              <div className={styles.authBrandRow}>
                <div className={styles.authBrandMain}>
                  <LogoMark />
                  <div className={styles.authBrandText}>
                    <strong>{BRAND_NAME}</strong>
                    <span>Plataforma B2B rural</span>
                  </div>
                </div>
                <span className={styles.authBrandBadge}>Acesso Seguro</span>
              </div>

              <div className={`${styles.contentAnim} ${styles.authCard}`}>
                <div className={styles.formHeader}>
                  <h1 className={styles.title}>Entrar</h1>
                  <p className={styles.sub}>
                    Acesse sua plataforma de gestão rural.
                  </p>
                  <div className={styles.metaRow}>
                    <span className={styles.metaChip}>
                      <ShieldCheck size={13} /> Login protegido
                    </span>
                    <span className={styles.metaChip}>
                      <Check size={13} /> Fluxo rápido
                    </span>
                  </div>
                </div>

                <form
                  onSubmit={handleLogin}
                  className={styles.form}
                  autoComplete="off"
                >
                  <div className="form-group">
                    <label className="form-label" htmlFor="login-email">
                      E-mail
                    </label>
                    <div className={styles.inputIconWrapper}>
                      <Mail size={18} className={styles.inputIcon} />
                      <input
                        id="login-email"
                        name="email"
                        className="form-input"
                        type="email"
                        placeholder="nome@fazenda.com.br"
                        value={email}
                        onChange={(e) =>
                          setEmail(e.target.value.toLowerCase().trim())
                        }
                        autoComplete="username"
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
                        Esqueceu a senha?
                      </button>
                    </div>
                    <div className={styles.inputIconWrapper}>
                      <Lock size={18} className={styles.inputIcon} />
                      <input
                        id="login-password"
                        name="password"
                        className="form-input"
                        type={showPwd ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className={styles.eyeBtn}
                        onClick={() => setShowPwd(!showPwd)}
                        aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {(localErr || remoteError) && (
                    <div
                      className={styles.errorAlert}
                      role="alert"
                      aria-live="polite"
                    >
                      {localErr || remoteError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className={styles.mainActionBtn}
                    disabled={loading || !loginReady}
                  >
                    {loading ? (
                      <>
                        <Loader size={18} className="spin" /> Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </button>
                </form>

                <div className={styles.footer}>
                  <p>Não tem uma conta?</p>
                  <button
                    type="button"
                    className={styles.secondaryActionBtn}
                    onClick={() => resetForm("register")}
                  >
                    Crie uma conta <ArrowRight size={14} />
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
      <div className={`${styles.page} ${styles.pageLogin}`}>
        <div className={styles.splitLayout}>
          <div className={styles.visualSide}>
            <div className={styles.bgImage} aria-hidden="true" />
            <div className={styles.overlay} />
            <div className={styles.visualGlowA} aria-hidden="true" />
            <div className={styles.visualGlowB} aria-hidden="true" />
            <div className={styles.visualContent}>
              <div className={styles.visualShell}>
                <div className={styles.visualLogo}>
                  <LogoMark />
                  <span className={styles.visualBrand}>HubCompras</span>
                </div>

                <span className={styles.visualKicker}>
                  Cadastro inteligente
                </span>
                <h2 className={styles.visualTitle}>
                  Crie sua conta em dois passos.
                </h2>
                <p className={styles.visualSub}>
                  Coletamos somente o necessario para liberar seu acesso com
                  seguranca.
                </p>
              </div>
            </div>
          </div>

          <div className={styles.authSide}>
            <div className={styles.authContainer}>
              <div className={styles.authBrandRow}>
                <div className={styles.authBrandMain}>
                  <LogoMark />
                  <div className={styles.authBrandText}>
                    <strong>{BRAND_NAME}</strong>
                    <span>Plataforma B2B rural</span>
                  </div>
                </div>
                <span className={styles.authBrandBadge}>Novo Cadastro</span>
              </div>

              <div className={`${styles.contentAnim} ${styles.authCard}`}>
                <div className={styles.formHeader}>
                  <h1 className={styles.title}>Comece agora</h1>
                  <p className={styles.sub}>
                    Perfil, contato e senha segura para ativar sua conta
                  </p>
                  <div className={styles.metaRow}>
                    <span className={styles.metaChip}>
                      <ShieldCheck size={13} /> Dados verificados por email
                    </span>
                    <span className={styles.metaChip}>
                      <Check size={13} /> Cadastro em 2 etapas
                    </span>
                  </div>
                </div>

                <div className={styles.stepper}>
                  <div
                    className={`${styles.stepItem} ${registerStep >= 1 ? styles.stepActive : ""}`}
                  >
                    <span>1</span>
                    <p>Dados do negocio</p>
                  </div>
                  <div className={styles.stepLine} />
                  <div
                    className={`${styles.stepItem} ${registerStep >= 2 ? styles.stepActive : ""}`}
                  >
                    <span>2</span>
                    <p>Senha e seguranca</p>
                  </div>
                </div>
                <p className={styles.stepSummary}>Etapa {registerStep} de 2</p>

                {(localErr || remoteError) && (
                  <div
                    className={styles.errorAlert}
                    role="alert"
                    aria-live="polite"
                  >
                    {localErr || remoteError}
                  </div>
                )}

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
                            <span className={styles.roleDesc}>
                              Vender produtos
                            </span>
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
                            <span className={styles.roleDesc}>
                              Coordenar compras
                            </span>
                          </div>
                        </button>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="register-email">
                          Email de trabalho
                        </label>
                        <div className={styles.inputIconWrapper}>
                          <Mail size={18} className={styles.inputIcon} />
                          <input
                            id="register-email"
                            name="email"
                            className="form-input"
                            type="email"
                            placeholder="seu@trabalho.com"
                            value={email}
                            onChange={(e) =>
                              setEmail(e.target.value.toLowerCase().trim())
                            }
                            autoComplete="email"
                          />
                        </div>
                      </div>

                      <div className="grid-2">
                        <div className="form-group">
                          <label
                            className="form-label"
                            htmlFor="register-phone"
                          >
                            WhatsApp
                          </label>
                          <div className={styles.inputIconWrapper}>
                            <Phone size={18} className={styles.inputIcon} />
                            <input
                              id="register-phone"
                              className="form-input"
                              placeholder="(00) 00000-0000"
                              value={phone}
                              onChange={(e) =>
                                setPhone(maskPhone(e.target.value))
                              }
                              autoComplete="tel"
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label
                            className="form-label"
                            htmlFor="register-company"
                          >
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
                          <label
                            className="form-label"
                            htmlFor="register-address"
                          >
                            Endereco (opcional)
                          </label>
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
                          <label className="form-label" htmlFor="register-city">
                            Cidade
                          </label>
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
                          <label
                            className="form-label"
                            htmlFor="register-notes"
                          >
                            Observacoes (opcional)
                          </label>
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
                      {registerStepOneError && !localErr && (
                        <p className={styles.stepSummary}>
                          Para continuar: {registerStepOneError}
                        </p>
                      )}
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
                            <label
                              className="form-label"
                              htmlFor="register-password"
                            >
                              Senha de acesso
                            </label>
                            <div className={styles.inputIconWrapper}>
                              <Lock size={18} className={styles.inputIcon} />
                              <input
                                id="register-password"
                                name="new-password"
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
                                aria-label={
                                  showPwd ? "Ocultar senha" : "Mostrar senha"
                                }
                              >
                                {showPwd ? (
                                  <EyeOff size={18} />
                                ) : (
                                  <Eye size={18} />
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="form-group">
                            <label
                              className="form-label"
                              htmlFor="register-confirm"
                            >
                              Confirmar senha
                            </label>
                            <div className={styles.inputIconWrapper}>
                              <Lock size={18} className={styles.inputIcon} />
                              <input
                                id="register-confirm"
                                name="confirm-password"
                                className="form-input"
                                type="password"
                                placeholder="Repita a senha"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                autoComplete="new-password"
                              />
                            </div>
                          </div>
                        </div>

                        <div className={styles.passwordMeterWrap}>
                          <div className={styles.passwordMeterTrack}>
                            <div
                              className={`${styles.passwordMeterFill} ${styles[`strength_${passwordStrength}`]} ${styles[`strengthWidth${passwordScore}`]}`}
                            />
                          </div>
                          <span className={styles.passwordStrengthLabel}>
                            Forca:{" "}
                            {passwordStrength === "weak"
                              ? "fraca"
                              : passwordStrength === "medium"
                                ? "media"
                                : "forte"}
                          </span>
                        </div>

                        <ul className={styles.passwordRules}>
                          {passwordRules.map((rule) => (
                            <li
                              key={rule.label}
                              className={rule.ok ? styles.ruleOk : ""}
                            >
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
                          Eu confirmo que os dados informados sao verdadeiros e
                          autorizo o contato da plataforma.
                        </span>
                      </label>

                      <div className={styles.stepActions}>
                        <button
                          type="button"
                          className={styles.backBtn}
                          onClick={() => {
                            setLocalErr("");
                            setLastSubmitScreen("register");
                            setRegisterStep(1);
                            if (typeof onClearError === "function") {
                              onClearError();
                            }
                          }}
                          disabled={loading}
                        >
                          <ArrowLeft size={15} /> Voltar
                        </button>

                        <button
                          type="submit"
                          className={styles.mainActionBtn}
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Loader size={18} className="spin" /> Criando
                              conta...
                            </>
                          ) : (
                            "Finalizar cadastro"
                          )}
                        </button>
                      </div>
                      {registerStepTwoError && !localErr && (
                        <p className={styles.stepSummary}>
                          Para finalizar: {registerStepTwoError}
                        </p>
                      )}
                    </>
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
