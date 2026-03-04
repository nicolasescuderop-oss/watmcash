import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { getMonster } from "../storage";
import { clp } from "../helpers";
import { logAction } from "../audit";

export default function MyReceivables() {
  const nav = useNavigate();
  const monsterCode = getMonster();
  const [me, setMe] = useState(null);
  const [payments, setPayments] = useState([]);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    const { data: meData, error: meErr } = await supabase
      .from("monsters").select("id, display_name")
      .eq("code", monsterCode).single();
    if (meErr) return setErr(meErr.message);
    setMe(meData);

    const { data, error } = await supabase
      .from("payments")
      .select(`
        id, amount, status, paid_at, marked_paid_by_monster_id,
        expense_id,
        expenses:expense_id ( description, expense_date, amount ),
        from_monster:from_monster_id ( id, display_name )
      `)
      .eq("to_monster_id", meData.id)
      .order("created_at", { ascending: false });

    if (error) return setErr(error.message);
    setPayments(data || []);
  }

  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const p of payments) {
      if (!map.has(p.expense_id)) map.set(p.expense_id, { expense: p.expenses, items: [] });
      map.get(p.expense_id).items.push(p);
    }
    return Array.from(map.values());
  }, [payments]);

  async function markPaid(id) {
    if (!me) return;
    const row = payments.find(r => r.id === id);
    const { error } = await supabase.from("payments").update({
      status: "paid",
      paid_at: new Date().toISOString(),
      marked_paid_by_monster_id: me.id,
    }).eq("id", id);
    if (error) { setErr(error.message); return; }
    await logAction({
      action: "MARK_PAID_BY_CREDITOR",
      entity: "payment",
      entityId: id,
      monsterCode: monsterCode,
      monsterName: me.display_name,
      detail: {
        expense_description: row?.expenses?.description,
        amount: row?.amount,
        from_monster: row?.from_monster?.display_name,
      }
    });
    load();
  }

  const totalPending = payments.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="container" style={{ paddingTop: 32 }}>

      {/* Header */}
      <div className="pageHeader">
        <div>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "var(--cyan)", opacity: 0.7, marginBottom: 4 }}>
            Lo que te deben
          </div>
          <h1 className="h1" style={{ margin: 0 }}>Cobros</h1>
        </div>
        <button className="btn btnSecondary" onClick={() => nav("/dashboard")}>← Volver</button>
      </div>

      {err && <p style={{ color: "salmon" }}>{err}</p>}

      {/* Total pendiente */}
      {totalPending > 0 && (
        <div className="card" style={{ marginBottom: 20, borderColor: "#005a30", background: "#001a0a" }}>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>
            Total pendiente por cobrar
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#00d4a0" }}>${clp(totalPending)}</div>
        </div>
      )}

      {grouped.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 32 }}>
          <div className="muted">Aún no hay registros</div>
        </div>
      ) : (
        <div className="grid">
          {grouped.map((g, idx) => {
            const pendingItems = g.items.filter(x => x.status === "pending");
            const isClosed = pendingItems.length === 0;
            return (
              <div key={idx} className="card" style={{
                borderLeftWidth: 3,
                borderLeftColor: isClosed ? "#2d5a2d" : "#5a3a00",
                background: isClosed ? "#080f08" : "var(--bg2)",
              }}>
                {/* Gasto header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 15 }}>{g.expense?.description}</div>
                    <div className="muted">{g.expense?.expense_date} · Total: ${clp(g.expense?.amount || 0)}</div>
                  </div>
                  <span className={`badge ${isClosed ? "badge-closed" : "badge-pending"}`}>
                    {isClosed ? "✅ Cerrado" : "⏳ Abierto"}
                  </span>
                </div>

                <div className="hr" style={{ margin: "8px 0" }} />

                {/* Lista de pagos */}
                <div className="grid" style={{ gap: 8 }}>
                  {g.items.map(p => (
                    <div key={p.id} style={{
                      display: "flex", justifyContent: "space-between",
                      alignItems: "center", gap: 10, flexWrap: "wrap"
                    }}>
                      <div>
                        <span style={{ fontWeight: 700 }}>{p.from_monster?.display_name}</span>
                        <span style={{
                          marginLeft: 8, fontWeight: 900,
                          color: p.status === "paid" ? "#4caf50" : "#ff9800"
                        }}>
                          ${clp(p.amount)}
                        </span>
                        {p.status === "paid" && p.paid_at && (
                          <div className="muted" style={{ fontSize: 11 }}>
                            {new Date(p.paid_at).toLocaleDateString("es-CL")}
                          </div>
                        )}
                      </div>
                      {p.status === "pending" ? (
                        <button className="btn" onClick={() => markPaid(p.id)}
                          style={{ fontSize: 12, padding: "5px 12px", borderColor: "#00a0a0", color: "var(--cyan)" }}>
                          ✓ Marcar pagado
                        </button>
                      ) : (
                        <span className="badge badge-paid">✅ Pagado</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}