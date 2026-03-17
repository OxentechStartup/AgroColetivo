import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { runTests } from "../test-system-validation";
import styles from "./TestPage.module.css";

export function TestPage() {
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (idx) => {
    setExpandedSections((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleRunTests = async () => {
    setRunning(true);
    setResults(null);
    const testResults = await runTests();
    setResults(testResults);
    setRunning(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🧪 Validação do Sistema AgroColetivo</h1>
        <p>Teste abrangente de todas as ações e funcionalidades</p>
      </div>

      <div className={styles.box}>
        <button
          onClick={handleRunTests}
          disabled={running}
          className={styles.button}
        >
          {running ? "Executando testes..." : "▶ Executar Validação Completa"}
        </button>

        {results && (
          <div className={styles.results}>
            <div className={styles.summary}>
              <div className={styles.stat}>
                <div className={styles.label}>Total</div>
                <div className={styles.value}>{results.total}</div>
              </div>
              <div className={`${styles.stat} ${styles.passed}`}>
                <div className={styles.label}>Passou</div>
                <div className={styles.value}>{results.passed}</div>
              </div>
              <div className={`${styles.stat} ${results.failed > 0 ? styles.failed : ""}`}>
                <div className={styles.label}>Falhou</div>
                <div className={styles.value}>{results.failed}</div>
              </div>
            </div>

            {results.failed === 0 && (
              <div className={styles.success}>
                ✨ <strong>Todos os testes passaram!</strong>
              </div>
            )}

            <div className={styles.logs}>
              <h3>Detalhes dos Testes:</h3>
              <pre>{results.results.join("\n")}</pre>
            </div>
          </div>
        )}
      </div>

      <div className={styles.info}>
        <h2>ℹ️ O que é testado:</h2>
        <ul>
          <li>✅ Conexão com Supabase</li>
          <li>✅ Existência de todas as tabelas obrigatórias</li>
          <li>✅ Estrutura correta de colunas</li>
          <li>✅ Operações: buscar vendors, campanhas, produtos</li>
          <li>✅ Validação de upload de imagens</li>
          <li>✅ Integridade de chaves estrangeiras</li>
          <li>✅ Políticas RLS ativas</li>
          <li>✅ Funcionalidade Data URI para fotos</li>
        </ul>
      </div>
    </div>
  );
}
