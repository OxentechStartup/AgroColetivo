import {
  TrendingUp,
  Package,
  Users,
  CheckCircle,
  Clock,
  DollarSign,
  BarChart2,
  Zap,
  Target,
  ArrowRight,
  Leaf,
  Activity,
  Send,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ProgressBar } from "../components/ui/ProgressBar";
import {
  totalOrdered,
  STATUS_LABEL,
  campaignRealValue,
  calcPlatformFee,
} from "../utils/data";
import { formatCurrency } from "../utils/masks";
import styles from "./DashboardPage.module.css";

// ── Gráfico de barras SVG nativo ──────────────────────────────
function CampaignBarChart({ campaigns }) {
  if (!campaigns || !Array.isArray(campaigns) || campaigns.length === 0) {
    return (
      <div className={styles.chartWrap}>
        <p style={{ textAlign: "center", color: "#999", padding: "20px" }}>
          Nenhuma campanha aberta
        </p>
      </div>
    );
  }

  campaigns = campaigns.filter((c) => c.status !== "finished");
  if (campaigns.length === 0) {
    return (
      <div className={styles.chartWrap}>
        <p style={{ textAlign: "center", color: "#999", padding: "20px" }}>
          Nenhuma campanha aberta
        </p>
      </div>
    );
  }

  const STATUS_COLOR = {
    open: "#16a34a",
    negotiating: "#f59e0b",
    closed: "#f59e0b",
    finished: "#94a3b8",
  };
  const max = Math.max(...campaigns.map((c) => c.orders?.length || 0), 1);
  const W = 100 / campaigns.length;
  const BAR_H = 120;

  return (
    <div className={styles.chartWrap}>
      <svg width="100%" height={BAR_H + 32} style={{ overflow: "visible" }}>
        {campaigns.map((c, i) => {
          const barH = Math.max(4, ((c.orders?.length || 0) / max) * BAR_H);
          const x = i * W + W * 0.2;
          const barW = W * 0.6;
          const y = BAR_H - barH;
          const color = STATUS_COLOR[c.status] ?? STATUS_COLOR.open;
          const label =
            (c.name || c.product || "Sem nome").length > 10
              ? (c.name || c.product || "Sem nome").slice(0, 9) + "…"
              : c.name || c.product || "Sem nome";
          return (
            <g key={c.id}>
              <rect
                x={`${x}%`}
                y={y}
                width={`${barW}%`}
                height={barH}
                rx={3}
                fill={color}
                opacity={0.85}
              />
              {(c.orders?.length || 0) > 0 && (
                <text
                  x={`${x + barW / 2}%`}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#64748b"
                  fontWeight={600}
                >
                  {c.orders.length}
                </text>
              )}
              <text
                x={`${x + barW / 2}%`}
                y={BAR_H + 18}
                textAnchor="middle"
                fontSize={9}
                fill="#94a3b8"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Card de stat ──────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent, onClick }) {
  return (
    <div
      className={`${styles.stat} ${accent ? styles["stat_" + accent] : ""} ${onClick ? styles.statClickable : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <div className={styles.statTop}>
        <div className={styles.statIcon}>
          <Icon size={17} />
        </div>
        <div className={styles.statValue}>{value}</div>
      </div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

// ── Linha de cotação em andamento ─────────────────────────────
function CampaignRow({ c, isLast }) {
  const ord = totalOrdered(c);
  const pct =
    c.goalQty > 0 ? Math.min(100, Math.round((ord / c.goalQty) * 100)) : 0;
  return (
    <div className={`${styles.campaignRow} ${!isLast ? styles.rowBorder : ""}`}>
      <div className={styles.rowTop}>
        <span className={styles.rowName}>{c.product}</span>
        <Badge status={c.status}>{STATUS_LABEL[c.status]}</Badge>
      </div>
      <ProgressBar value={ord} goal={c.goalQty} unit={c.unit} compact />
      <div className={styles.rowMeta}>
        <span>
          {c.orders.length} comprador{c.orders.length !== 1 ? "es" : ""}
        </span>
        {c.pricePerUnit && (
          <span>
            {formatCurrency(c.pricePerUnit)}/{c.unit?.replace(/s$/, "")}
          </span>
        )}
        <span style={{ color: pct >= 100 ? "#16a34a" : "#94a3b8" }}>
          {pct}% da meta
        </span>
        {(c.pendingOrders?.length ?? 0) > 0 && (
          <span style={{ color: "#ef4444", fontWeight: 600 }}>
            {c.pendingOrders.length} pendente
            {c.pendingOrders.length > 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Alerta ────────────────────────────────────────────────────
function AlertRow({ icon: Icon, text, color, cta, onCta }) {
  return (
    <div className={styles.alertRow} style={{ borderLeftColor: color }}>
      <Icon size={14} style={{ color, flexShrink: 0 }} />
      <span className={styles.alertText}>{text}</span>
      {cta && (
        <button className={styles.alertCta} onClick={onCta}>
          {cta} <ArrowRight size={11} />
        </button>
      )}
    </div>
  );
}

// ── Saudação ──────────────────────────────────────────────────
function greeting(name) {
  const h = new Date().getHours();
  const part = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  return part + ", " + (name?.split(" ")[0] ?? "bem-vindo") + " 👋";
}

// ── Página principal ──────────────────────────────────────────
export function DashboardPage({ campaigns, setPage, user }) {
  const active_campaigns = campaigns.filter((c) => c.status !== "finished");
  const open = campaigns.filter((c) => c.status === "open");
  const closed = campaigns.filter((c) => c.status === "finished");
  const negot = campaigns.filter((c) => c.status === "negotiating");
  const pending = campaigns.reduce(
    (s, c) => s + (c.pendingOrders?.length ?? 0),
    0,
  );

  const allBuyers = new Set(
    active_campaigns.flatMap((c) => c.orders.map((o) => o.producerName)),
  );
  const totalBuyers = allBuyers.size;
  const totalOrders = active_campaigns.reduce((s, c) => s + c.orders.length, 0);
  const totalTons = active_campaigns.reduce(
    (s, c) =>
      s +
      c.orders.reduce((ss, o) => ss + (o.qty * (c.unitWeight ?? 25)) / 1000, 0),
    0,
  );

  const totalTransacted = campaigns
    .filter((c) => c.status === "finished" || c.status === "negotiating")
    .reduce((s, c) => s + campaignRealValue(c), 0);
  const { feeValue } = calcPlatformFee(totalTransacted, 1.5);

  const alerts = [];
  if (pending > 0)
    alerts.push({
      icon: Clock,
      text: pending + " pedido(s) aguardando aprovação",
      color: "#f59e0b",
      cta: "Aprovar",
      page: "campaigns",
    });
  const nearGoal = open.filter((c) => {
    const o = totalOrdered(c);
    return c.goalQty > 0 && o / c.goalQty >= 0.8 && o < c.goalQty;
  });
  if (nearGoal.length > 0)
    alerts.push({
      icon: Target,
      text: nearGoal.length + " cotação(ões) acima de 80% da meta",
      color: "#16a34a",
    });
  const expiring = open.filter((c) => {
    if (!c.deadline) return false;
    const days = (new Date(c.deadline) - new Date()) / 86400000;
    return days >= 0 && days <= 3;
  });
  if (expiring.length > 0)
    alerts.push({
      icon: Activity,
      text: expiring.length + " cotação(ões) vencem em ≤ 3 dias",
      color: "#ef4444",
      cta: "Ver",
      page: "campaigns",
    });
  if (negot.length > 0)
    alerts.push({
      icon: Send,
      text: negot.length + " cotação(ões) aguardando proposta de fornecedor",
      color: "#3b82f6",
      cta: "Ver propostas",
      page: "campaigns",
    });

  const buyerMap = {};
  active_campaigns.forEach((c) => {
    c.orders.forEach((o) => {
      if (!buyerMap[o.producerName])
        buyerMap[o.producerName] = {
          name: o.producerName,
          cotacoes: 0,
          total: 0,
        };
      buyerMap[o.producerName].cotacoes++;
      buyerMap[o.producerName].total += o.qty;
    });
  });
  const topBuyers = Object.values(buyerMap)
    .sort((a, b) => b.cotacoes - a.cotacoes)
    .slice(0, 5);
  const recentClosed = [...closed].reverse().slice(0, 5);
  const isEmpty = active_campaigns.length === 0;

  return (
    <div className={styles.page + " page-enter"}>
      <div className={styles.heading}>
        <h1>{greeting(user?.name)}</h1>
        <p className={styles.headingSub}>
          {isEmpty
            ? "Crie sua primeira cotação coletiva para começar."
            : open.length +
              negot.length +
              " cotaç" +
              (open.length + negot.length !== 1 ? "ões" : "ão") +
              " ativa" +
              (open.length + negot.length !== 1 ? "s" : "") +
              " · " +
              campaigns.length +
              " no total"}
        </p>
      </div>

      {user?.blocked && (
        <div className={styles.blockedBanner}>
          <span className={styles.blockedIcon}>🔒</span>
          <div>
            <strong>Conta bloqueada</strong>
            <p>
              Seu acesso está restrito ao Dashboard. Contate o administrador
              para reativar sua conta.
            </p>
            <p className={styles.blockedPendencia}>
              ⚠️ Você pode ter alguma pendência.
            </p>
          </div>
        </div>
      )}

      <div className={styles.statsGrid}>
        <StatCard
          icon={Package}
          label="Cotações Abertas"
          value={open.length}
          sub={negot.length + " negociando · " + campaigns.length + " total"}
          accent="amber"
          onClick={() => setPage("campaigns")}
        />
        <StatCard
          icon={CheckCircle}
          label="Finalizadas"
          value={closed.length}
          sub={
            closed.length > 0
              ? formatCurrency(
                  closed.reduce((s, c) => s + campaignRealValue(c), 0),
                ) + " negociado"
              : "—"
          }
          accent="green"
        />
        <StatCard
          icon={Users}
          label="Compradores"
          value={totalBuyers}
          sub={totalOrders + " pedidos · " + totalTons.toFixed(1) + " t"}
          accent="blue"
          onClick={() => setPage("producers")}
        />
        <StatCard
          icon={Clock}
          label="Pendentes"
          value={pending}
          sub="aguardando aprovação"
          accent={pending > 0 ? "red" : ""}
          onClick={pending > 0 ? () => setPage("campaigns") : undefined}
        />
        <StatCard
          icon={DollarSign}
          label="Valor Total"
          value={formatCurrency(totalTransacted + feeValue)}
          sub={`inclui taxa de ${formatCurrency(feeValue)}`}
          accent="teal"
        />
      </div>

      {alerts.length > 0 && (
        <div className={styles.alertsBox}>
          <div className={styles.alertsTitle}>
            <Zap size={13} /> Atenção necessária
          </div>
          {alerts.map((a, i) => (
            <AlertRow
              key={i}
              icon={a.icon}
              text={a.text}
              color={a.color}
              cta={a.cta}
              onCta={a.page ? () => setPage(a.page) : undefined}
            />
          ))}
        </div>
      )}

      {isEmpty && (
        <div className={styles.emptyState}>
          <Leaf size={36} style={{ color: "#16a34a", opacity: 0.5 }} />
          <h3>Bem-vindo ao AgroColetivo</h3>
          <p>Crie sua primeira cotação coletiva para começar.</p>
          <Button variant="primary" onClick={() => setPage("campaigns")}>
            Criar cotação <ArrowRight size={14} />
          </Button>
        </div>
      )}

      {!isEmpty && (
        <div className={styles.row}>
          <Card>
            <CardHeader>
              <CardTitle>Compradores por Cotação</CardTitle>
              <div className={styles.legend}>
                {[
                  ["#16a34a", "Aberta"],
                  ["#f59e0b", "Negociando/Pausada"],
                  ["#94a3b8", "Encerrada"],
                ].map(([color, label]) => (
                  <span key={label} className={styles.legendDot}>
                    <span
                      style={{
                        background: color,
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        display: "inline-block",
                      }}
                    />
                    {label}
                  </span>
                ))}
              </div>
            </CardHeader>
            <CardBody>
              <CampaignBarChart campaigns={active_campaigns} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Em Andamento</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage("campaigns")}
              >
                Ver todas <TrendingUp size={13} />
              </Button>
            </CardHeader>
            <CardBody noPad>
              {open.length === 0 ? (
                <div className={styles.empty}>
                  <Package size={28} />
                  <p>Nenhuma cotação aberta.</p>
                </div>
              ) : (
                open.map((c, i) => (
                  <CampaignRow
                    key={c.id}
                    c={c}
                    isLast={i === open.length - 1}
                  />
                ))
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {!isEmpty && (topBuyers.length > 0 || recentClosed.length > 0) && (
        <div className={styles.row}>
          {topBuyers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <Users size={13} /> Top Compradores
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage("producers")}
                >
                  Ver todos <ArrowRight size={13} />
                </Button>
              </CardHeader>
              <CardBody noPad>
                {topBuyers.map((p, i) => (
                  <div
                    key={p.name}
                    className={
                      styles.topRow +
                      (i < topBuyers.length - 1 ? " " + styles.rowBorder : "")
                    }
                  >
                    <div className={styles.topRank}>{i + 1}</div>
                    <div className={styles.topName}>{p.name}</div>
                    <div className={styles.topMeta}>
                      <span>
                        {p.cotacoes} cotação{p.cotacoes !== 1 ? "ões" : ""}
                      </span>
                      <span className={styles.topQty}>{p.total} un.</span>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          {recentClosed.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <BarChart2 size={13} /> Histórico Recente
                </CardTitle>
                <span style={{ fontSize: ".78rem", color: "#94a3b8" }}>
                  {closed.length} encerrada{closed.length !== 1 ? "s" : ""}
                </span>
              </CardHeader>
              <CardBody noPad>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Compradores</th>
                      <th>Valor total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentClosed.map((c, i) => {
                      const val = campaignRealValue(c);
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{c.product}</td>
                          <td style={{ color: "#64748b" }}>
                            {c.orders.length}
                          </td>
                          <td>
                            {val > 0 ? (
                              <strong style={{ color: "#16a34a" }}>
                                {formatCurrency(val)}
                              </strong>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
