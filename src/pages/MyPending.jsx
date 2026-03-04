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
      .from("monsters")
      .select("id, display_name")
      .eq("code", monsterCode)
      .single();
    if (meErr) return setErr(meErr.message);
    setMe(meData);

    const { data, error } = await supabase
      .from("payments")
      .select(`
        id, amount, status, paid_at,
        marked_paid_by_monster_id,
        expense_id,
        expenses:expense_id ( description, expense_date, amount ),
        to_monster:to_monster_id ( display_name ),
        marked_by:marked_paid_by_monster_id ( display_name )
      `)
      .eq("from_monster_id", meData.id)
      .order("created_at", { ascending: false });

    if (error) return setErr(error.message);
    const rows = data || [];
    setPending(rows.filter((r) => r.status === "pending"));
    setPaid(rows.filter((r) => r.status === "paid"));
  }

  useEffect(() => { load(); }, []);

  async function markPaid(paymentId) {
    if (!me) return;
    const { error } = await supabase
      .from("payments")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        marked_paid_by_monster_id: me.id,
      })
      .eq("id", paymentId);
    if (error) setErr(error.message);
    else load();
  }

  async function revert(paymentId) {
    const { error } = await supabase
      .from("payments")
      .update({
        status: "pending",
        paid_at: null,
        marked_paid_by_monster_id: null,
      })
      .eq("id", paymentId);
    if (error) setErr(error.message);
    else load();
  }

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 className="h1">Pagos pendientes</h1>
        <button className="btn btnSecondary" onClick={() => nav("/dashboard")}>Volver</button>
      </div>
      {err && <p style={{ color: "salmon" }}>{err}</p>}

      {/* PENDIENTES */}
      {pending.length === 0 ? (
        <div className="card" style={{ marginBottom: 12 }}>No tienes pagos pendientes 🎉</div>
      ) : (
        <div className="grid" style={{ marginBottom: 20 }}>
          {pending.map((r) => (
            <div key={r.id} className="card">
              <div style={{ fontWeight: 800 }}>{r.expenses?.description}</div>
              <div className="muted">
                {r.expenses?.expense_date} · Total gasto: ${clp(r.expenses?.amount || 0)}
              </div>
              <div className="muted">
                Debes pagar <b>${clp(r.amount)}</b> a <b>{r.to_monster?.display_name}</b>
              </div>
              <div className="row" style={{ marginTop: 10, justifyContent: "flex-end" }}>
                <button className="btn" onClick={() => markPaid(r.id)}>Marcar como pagado</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* HISTORIAL PAGADOS */}
      {paid.length > 0 && (
        <>
          <div style={{ fontSize: 13, opacity: 0.5, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
            Historial pagados
          </div>
          <div className="grid">
            {paid.map((r) => (
              <div key={r.id} className="card" style={{ borderColor: "#1a3a1a", background: "#0f1f0f" }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div style={{ fontWeight: 800 }}>✅ {r.expenses?.description}</div>
                  <span style={{ color: "#4caf50", fontWeight: 700, fontSize: 13 }}>PAGADO</span>
                </div>
                <div className="muted">
                  {r.expenses?.expense_date} · <b>${clp(r.amount)}</b> a <b>{r.to_monster?.display_name}</b>
                </div>
                {r.paid_at && (
                  <div className="muted">
                    Marcado el {new Date(r.paid_at).toLocaleString("es-CL")}
                    {r.marked_by?.display_name ? ` por ${r.marked_by.display_name}` : ""}
                  </div>
                )}
                <div className="row" style={{ marginTop: 8, justifyContent: "flex-end" }}>
                  <button
                    className="btn btnSecondary"
                    style={{ fontSize: 12, padding: "6px 10px" }}
                    onClick={() => revert(r.id)}
                  >
                    Revertir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}