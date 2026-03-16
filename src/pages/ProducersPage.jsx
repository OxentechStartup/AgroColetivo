import { useState } from "react";
import { Phone, ChevronDown, ChevronUp, Users } from "lucide-react";
import { calcSupplyStats } from "../utils/data";
import { formatCurrency, displayPhone } from "../utils/masks";
import styles from "./ProducersPage.module.css";

// Agrupa todas as participações de um comprador em cotações
function buildBuyerRows(campaigns, role) {
  const map = {};

  // Admin vê todos, gestor exclui finished
  const filter = role === "admin" ? () => true : (c) => c.status !== "finished";

  campaigns.filter(filter).forEach((c) => {
    const stats = calcSupplyStats(
      c.lots ?? [],
      c.orders ?? [],
      c.freightTotal,
      c.markupTotal,
      c.goalQty,
    );
    (c.orders ?? []).forEach((o) => {
      const key = o.producerName;
      if (!map[key]) {
        map[key] = {
          name: o.producerName,
          phone: o.phone,
          entries: [],
          totalQty: 0,
          totalValue: 0,
          hasPrice: false,
        };
      }
      const produto = stats.avgPrice * o.qty;
      const extras = stats.freightEach + stats.markupEach + stats.feeEach;
      const total = produto + extras;
      const hasPrice = stats.avgPrice > 0;

      map[key].entries.push({
        campaign: c.product,
        campaignStatus: c.status,
        qty: o.qty,
        unit: c.unit,
        produto,
        extras,
        total,
        hasPrice,
      });
      map[key].totalQty += o.qty;
      if (hasPrice) {
        map[key].totalValue += total;
        map[key].hasPrice = true;
      }
    });
  });

  return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
}

// Card mobile expandível por comprador
function BuyerCard({ buyer }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.card}>
      <button className={styles.cardBtn} onClick={() => setOpen((o) => !o)}>
        <div className={styles.cardLeft}>
          <div className={styles.pName}>{buyer.name}</div>
          {buyer.phone && (
            <div className={styles.pPhone}>
              <Phone size={10} /> {displayPhone(buyer.phone)}
            </div>
          )}
        </div>
        <div className={styles.cardRight}>
          <div className={styles.totalVal}>
            {buyer.hasPrice ? formatCurrency(buyer.totalValue) : "—"}
          </div>
          <div className={styles.cardMeta2}>
            {buyer.entries.length} cotação
            {buyer.entries.length !== 1 ? "ões" : ""}
          </div>
        </div>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className={styles.cardBody}>
          {buyer.entries.map((e, i) => (
            <div key={i} className={styles.entryBlock}>
              <div className={styles.detailRow}>
                <span>Produto</span>
                <span style={{ fontWeight: 600 }}>{e.campaign}</span>
              </div>
              <div className={styles.detailRow}>
                <span>Quantidade</span>
                <span>
                  {e.qty} {e.unit}
                </span>
              </div>
              {e.hasPrice && (
                <>
                  <div className={styles.detailRow}>
                    <span>Valor produto</span>
                    <span>{formatCurrency(e.produto)}</span>
                  </div>
                  {e.extras > 0 && (
                    <div className={styles.detailRow}>
                      <span>Frete + Taxas</span>
                      <span>{formatCurrency(e.extras)}</span>
                    </div>
                  )}
                  <div className={`${styles.detailRow} ${styles.detailTotal}`}>
                    <span>Total</span>
                    <span>{formatCurrency(e.total)}</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProducersPage({ campaigns, user }) {
  const [search, setSearch] = useState("");

  // Garante que campaigns tem orders mesmo que undefined
  const campaignsWithOrders = (campaigns ?? []).map((c) => ({
    ...c,
    orders: c.orders ?? [],
    lots: c.lots ?? [],
  }));

  const buyers = buildBuyerRows(campaignsWithOrders, user?.role).filter(
    (b) => !search || b.name.toLowerCase().includes(search.toLowerCase()),
  );

  const unique = buyers.length;

  return (
    <div className={`${styles.page} page-enter`}>
      <div className={styles.heading}>
        <div>
          <h1 className={styles.pageTitle}>Compradores</h1>
          <p className="text-muted">
            {unique} comprador{unique !== 1 ? "es" : ""} com pedidos aprovados
          </p>
        </div>
      </div>

      {buyers.length > 0 && (
        <div className={styles.filters}>
          <input
            className={styles.searchInput}
            placeholder="Buscar comprador…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {buyers.length === 0 ? (
        <div className={styles.empty}>
          {buildBuyerRows(campaignsWithOrders, user?.role).length === 0
            ? "Nenhum comprador registrou pedidos ainda."
            : "Nenhum resultado para este filtro."}
        </div>
      ) : (
        <>
          {/* Desktop: tabela */}
          <div className={styles.tableCard}>
            <div className={styles.tableWrap}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Comprador</th>
                    <th>Cotações</th>
                    <th>Qtd Total</th>
                    <th>Frete + Taxas</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {buyers.map((b, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{b.name}</div>
                        {b.phone && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 3,
                              color: "var(--text3)",
                              fontSize: ".7rem",
                              marginTop: 2,
                            }}
                          >
                            <Phone size={10} /> {displayPhone(b.phone)}
                          </div>
                        )}
                      </td>
                      <td style={{ color: "var(--text2)", fontSize: ".82rem" }}>
                        {b.entries.map((e) => e.campaign).join(", ")}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {b.entries.map((e) => e.qty + " " + e.unit).join(" + ")}
                      </td>
                      <td style={{ color: "var(--text2)" }}>
                        {b.entries.reduce((s, e) => s + e.extras, 0) > 0 ? (
                          formatCurrency(
                            b.entries.reduce((s, e) => s + e.extras, 0),
                          )
                        ) : (
                          <span style={{ color: "var(--text3)" }}>—</span>
                        )}
                      </td>
                      <td>
                        {b.hasPrice ? (
                          <strong style={{ color: "var(--primary)" }}>
                            {formatCurrency(b.totalValue)}
                          </strong>
                        ) : (
                          <span style={{ color: "var(--text3)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile */}
          <div className={styles.cards}>
            {buyers.map((b, i) => (
              <BuyerCard key={i} buyer={b} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
