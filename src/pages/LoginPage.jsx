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
  Phone,
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

  const isValidEmail = (emailStr) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setLocalErr("");
    if (!email || !isValidEmail(email))
      return setLocalErr("Informe um email válido.");
    if (!password) return setLocalErr("Informe a senha.");
    onLogin(email, password);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setLocalErr("");
    if (!email || !isValidEmail(email))
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
      phone: unmaskPhone(phone),
    });
  };

  const displayError = localErr || error;
  const isValidEmailCheck = email && isValidEmail(email);

  return (
    <div className={styles.page}>
      <div className={styles.splitLayout}>
        {/* Lado Esquerdo: Visual/Branding */}
        <div className={styles.visualSide}>
          <div className={styles.overlay} />
          <img 
            src={`/agro_login_bg_1774615846296.png`} 
            alt="Agro Technology" 
            className={styles.bgImage} 
          />
          <div className={styles.visualContent}>
            <div className={styles.visualLogo}>
              <LogoMark />
              <span className={styles.visualBrand}>AgroColetivo</span>
            </div>
            <h2 className={styles.visualTitle}>
              A tecnologia que aproxima o campo do mercado.
            </h2>
            <p className={styles.visualSub}>
              Economia colaborativa e inteligência comercial para produtores e fornecedores.
            </p>
          </div>
        </div>

        {/* Lado Direito: Formulário */}
        <div className={styles.formSide}>
          <div className={styles.formContainer}>
            {screen === "login" ? (
              <div className={styles.contentAnim}>
                <div className={styles.formHeader}>
                  <h1 className={styles.title}>Bem-vindo de volta</h1>
                  <p className={styles.sub}>Entre com suas credenciais para acessar o painel</p>
                </div>

                <form onSubmit={handleLogin} className={styles.form}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="login-email">Email</label>
                    <div className={styles.inputIconWrapper}>
                      <Mail size={18} className={styles.inputIcon} />
                      <input
                        id="login-email"
                        className="form-input"
                        type="email"
                        placeholder="exemplo@agro.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                        autoFocus
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <div className={styles.labelRow}>
                      <label className="form-label" htmlFor="login-password">Senha</label>
                      <button
                        type="button"
                        className={styles.forgotBtn}
                        onClick={() => (window.location.href = "/auth/recuperar-senha")}
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
                        onClick={() => setShowPwd((s) => !s)}
                      >
                        {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {displayError && (
                    <div className={styles.errorAlert} role="alert">
                      {displayError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className={styles.mainActionBtn}
                    disabled={loading || !isValidEmailCheck || !password}
                  >
                    {loading ? <Loader size={18} className="spin" /> : "Acessar Plataforma"}
                  </button>
                </form>

                <div className={styles.footer}>
                  <p>Ainda não faz parte?</p>
                  <button
                    type="button"
                    className={styles.secondaryActionBtn}
                    onClick={() => reset("register")}
                  >
                    Criar conta gratuita
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.contentAnim}>
                <div className={styles.formHeader}>
                  <h1 className={styles.title}>Comece agora</h1>
                  <p className={styles.sub}>Escolha seu perfil e junte-se ao coletivo</p>
                </div>

                <form onSubmit={handleRegister} className={styles.form}>
                  <div className={styles.roleSelection}>
                    <button
                      type="button"
                      className={`${styles.roleOption} ${role === ROLES.VENDOR ? styles.roleActive : ""}`}
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
                      className={`${styles.roleOption} ${role === ROLES.GESTOR ? styles.roleActive : ""}`}
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
                    <label className="form-label">Email de trabalho</label>
                    <input
                      className="form-input"
                      type="email"
                      placeholder="seu@trabalho.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                    />
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">WhatsApp</label>
                      <input
                        className="form-input"
                        placeholder="(00) 00000-0000"
                        value={phone}
                        onChange={(e) => setPhone(maskPhone(e.target.value))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{role === ROLES.VENDOR ? "Empresa" : "Associação"}</label>
                      <input
                        className="form-input"
                        placeholder="Nome fantasia"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Senha de acesso</label>
                    <input
                      className="form-input"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  {displayError && (
                    <div className={styles.errorAlert} role="alert">
                      {displayError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className={styles.mainActionBtn}
                    disabled={loading || !isValidEmailCheck || password.length < 6}
                  >
                    {loading ? <Loader size={18} className="spin" /> : "Finalizar Cadastro"}
                  </button>
                </form>

                <div className={styles.footer}>
                  <p>Já possui cadastro?</p>
                  <button
                    type="button"
                    className={styles.secondaryActionBtn}
                    onClick={() => reset("login")}
                  >
                    Fazer login
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
