import { useState } from 'react'
import { Eye, EyeOff, Loader } from 'lucide-react'
import styles from './LoginPage.module.css'

export function LoginPage({ onLogin, loading, error }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show,     setShow]     = useState(false)

  const handleSubmit = e => {
    e.preventDefault()
    if (username && password) onLogin(username, password)
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg}>
        <div className={styles.glow1} />
        <div className={styles.glow2} />
      </div>

      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <div className={styles.logoMark}>
            <img src="https://i.imgur.com/uPDoDdf.jpeg" alt="AgroColetivo" />
          </div>
          <h1 className={styles.brand}>AgroColetivo</h1>
          <p className={styles.sub}>Painel Administrativo</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Usuário</label>
            <input
              className="form-input"
              placeholder="admin"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <div className={styles.passWrap}>
              <input
                className={`form-input ${styles.passInput}`}
                type={show ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShow(s => !s)}>
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading || !username || !password}
          >
            {loading ? <Loader size={16} className={styles.spin} /> : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
