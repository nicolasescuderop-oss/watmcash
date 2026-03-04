import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { getMonster } from "../storage";
import { clp } from "../helpers";

export default function MyPending() {
  const nav = useNavigate();
  const monsterCode = getMonster();
  const [me, setMe] = useState(null);
  const [pending, setPending] = useState([]);
  const [paid, setPaid] = useState([]);
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
        id, amount, status, paid_at,
        expense_id,
        expenses:expense_id ( description, expense_date, amount ),
        to_monster:to_monster_id ( display_name ),
        marked_by:marked_paid_by_monster_id ( display_name )
      `)
      .eq("from_monster_id", meData.id)
      .order("created_at", { ascending: false });

    if (error) return setErr(error.message);
    const rows = data || [];
    setPending(rows.filter(r => r.status === "pending"));
    setPaid(rows.filter(r => r.status === "paid"));
  }

  useEffect(() => { load(); }, []);

  async function markPaid(id) {
    if (!me) return;
    const { error } = await supabase.from("payments").update({
      status: "paid",
      paid_at: new Date().toISOString(),
      marked_paid_by_monster_id: me.id,
    }).eq("id", id);
    if (error) setErr(error.message);
    else load();
  }

  async function revert(id) {
    const { error } = await supabase.from("payments").update({
      status: "pending", paid_at: null, marked_paid_by_monster_id: null,
    }).eq("id", id);
    if (error) setErr(error.message);
    else load();
  }

  return (
    <div className="container" style={{ paddingTop: 32 }}>

      {/* Header */}
      <div className="pageHeader">
        <div>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "var(--cyan)", opacity: 0.7, marginBottom: 4 }}>
            Mis deudas
          </div>
          <h1 className="h1" style={{ margin: 0 }}>Pagos pendientes</h1>
        </div>
        <button className="btn btnSecondary" onClick={() => nav("/dashboard")}>← Volver</button>
      </div>

      {err && <p style={{ color: "salmon" }}>{err}</p>}

      {/* Pendientes */}
      {pending.length === 0 ? (
        <div className="card" style={{ marginBottom: 20, borderColor: "var(--border)", textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
          <div style={{ fontWeight: 700, color: "var(--cyan)" }}>Sin deudas pendientes</div>
          <div className="muted" style={{ marginTop: 4 }}>Estás al día con todos</div>
        </div>
      ) : (
        <div style={{ marginBottom: 28 }}>
          <div className="sectionLabel" style={{ color: "#ff9800" }}>
            ⏳ Por pagar ({pending.length})
          </div>
          <div className="grid">
            {pending.map(r => (
              <div key={r.id} className="card" style={{ borderLeftWidth: 3, borderLeftColor: "#ff9800" }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{r.expenses?.description}</div>
                <div className="muted" style={{ marginBottom: 8 }}>
                  {r.expenses?.expense_date} · Total gasto: ${clp(r.expenses?.amount || 0)}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <span className="muted">Debés </span>
                    <span style={{ fontWeight: 900, fontSize: 18, color: "#ff9800" }}>${clp(r.amount)}</span>
                    <span className="muted"> a </span>
                    <span style={{ fontWeight: 700 }}>{r.to_monster?.display_name}</span>
                  </div>
                  <button className="btn" onClick={() => markPaid(r.id)}
                    style={{ borderColor: "#00a0a0", color: "var(--cyan)" }}>
                    ✓ Marcar pagado
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial pagados */}
      {paid.length > 0 && (
        <div>
          <div className="sectionLabel" style={{ color: "#4caf50" }}>
            ✅ Historial pagados ({paid.length})
          </div>
          <div className="grid">
            {paid.map(r => (
              <div key={r.id} className="card" style={{
                borderLeftWidth: 3, borderLeftColor: "#2d5a2d",
                background: "#080f08", opacity: 0.85
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>✅ {r.expenses?.description}</div>
                    <div className="muted" style={{ marginTop: 2 }}>
                      {r.expenses?.expense_date} ·{" "}
                      <span style={{ color: "#4caf50", fontWeight: 700 }}>${clp(r.amount)}</span>
                      {" "}a <span style={{ fontWeight: 600 }}>{r.to_monster?.display_name}</span>
                    </div>
                    {r.paid_at && (
                      <div className="muted" style={{ marginTop: 2 }}>
                        Pagado el {new Date(r.paid_at).toLocaleString("es-CL")}
                        {r.marked_by?.display_name ? ` · por ${r.marked_by.display_name}` : ""}
                      </div>
                    )}
                  </div>
                  <button className="btn btnSecondary"
                    style={{ fontSize: 11, padding: "4px 10px", whiteSpace: "nowrap" }}
                    onClick={() => revert(r.id)}>
                    Revertir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}