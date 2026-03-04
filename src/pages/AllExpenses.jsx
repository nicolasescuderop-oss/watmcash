import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { getMonster } from "../storage";
import { clp } from "../helpers";
import { logAction } from "../audit";

const DELETED_KEY = "watm_deleted_expenses";

function getDeleted() {
  try { return JSON.parse(localStorage.getItem(DELETED_KEY) || "[]"); }
  catch { return []; }
}
function saveDeleted(arr) {
  localStorage.setItem(DELETED_KEY, JSON.stringify(arr));
}

export default function AllExpenses() {
  const nav = useNavigate();
  const monsterCode = getMonster();
  const [me, setMe] = useState(null);
  const [rows, setRows] = useState([]);
  const [deleted, setDeleted] = useState(getDeleted());
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
      .from("expenses")
      .select(`
        id, description, expense_date, amount,
        created_by_monster_id,
        paid_by:paid_by_monster_id ( display_name ),
        payments ( id, status, from_monster:from_monster_id ( display_name ) )
      `)
      .order("expense_date", { ascending: false })
      .limit(200);

    if (error) setErr(error.message);
    else setRows(data || []);
  }

  useEffect(() => { load(); }, []);

  async function deleteExpense(row) {
    const ok = window.confirm(`¿Eliminar "${row.description}"? Esta acción no se puede deshacer.`);
    if (!ok) return;
    const { error } = await supabase.from("expenses").delete().eq("id", row.id);
    if (error) return setErr(error.message);
    await logAction({
      action: "DELETE_EXPENSE",
      entity: "expense",
      entityId: row.id,
      monsterCode: monsterCode,
      monsterName: me.display_name,
      detail: {
        description: row.description,
        amount: row.amount,
        expense_date: row.expense_date,
        paid_by: row.paid_by?.display_name,
      }
    });
    const newDeleted = [
      { id: row.id, description: row.description, expense_date: row.expense_date, amount: row.amount, paid_by: row.paid_by, deleted_at: new Date().toISOString() },
      ...getDeleted(),
    ];
    saveDeleted(newDeleted);
    setDeleted(newDeleted);
    load();
  }

  const pending = rows.filter(r => r.payments?.some(p => p.status === "pending"));
  const closed = rows.filter(r => r.payments?.length > 0 && r.payments.every(p => p.status === "paid"));
  const noPayments = rows.filter(r => !r.payments || r.payments.length === 0);

  function PaymentChecklist({ payments }) {
    if (!payments || payments.length === 0) return <div className="muted">Sin deudas asociadas</div>;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
        {payments.map(p => (
          <span key={p.id} style={{
            fontSize: 12,
            padding: "3px 8px",
            borderRadius: 999,
            background: p.status === "paid" ? "#1a3a1a" : "#2a1a0a",
            color: p.status === "paid" ? "#4caf50" : "#ff9800",
            border: `1px solid ${p.status === "paid" ? "#2d5a2d" : "#5a3a0a"}`,
          }}>
            {p.status === "paid" ? "✅" : "⏳"} {p.from_monster?.display_name}
          </span>
        ))}
      </div>
    );
  }

  function ExpenseCard({ r, accentColor, showDelete }) {
    return (
      <div key={r.id} className="card" style={{ borderColor: accentColor, borderLeftWidth: 3 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div style={{ fontWeight: 900 }}>{r.description}</div>
          {showDelete && me && r.created_by_monster_id === me.id && (
            <button
              className="btn btnSecondary"
              style={{ fontSize: 12, padding: "4px 10px", borderColor: "#5a1a1a", color: "salmon" }}
              onClick={() => deleteExpense(r)}
            >
              Eliminar
            </button>
          )}
        </div>
        <div className="muted">
          {r.expense_date} · ${clp(r.amount)} · Pagó: {r.paid_by?.display_name}
        </div>
        <PaymentChecklist payments={r.payments} />
      </div>
    );
  }

  function Section({ title, color, items, showDelete }) {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: 2,
          textTransform: "uppercase", color, marginBottom: 8, opacity: 0.85
        }}>
          {title} ({items.length})
        </div>
        <div className="grid">
          {items.map(r => (
            <ExpenseCard key={r.id} r={r} accentColor={color} showDelete={showDelete} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 className="h1">Todos los gastos</h1>
        <button className="btn btnSecondary" onClick={() => nav("/dashboard")}>Volver</button>
      </div>
      {err && <p style={{ color: "salmon" }}>{err}</p>}

      <Section title="⏳ Pendientes" color="#ff9800" items={pending} showDelete={true} />
      <Section title="✅ Cerrados" color="#4caf50" items={closed} showDelete={true} />
      <Section title="— Sin deudas" color="#666" items={noPayments} showDelete={true} />

      {/* Historial eliminados */}
      {deleted.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 2,
            textTransform: "uppercase", color: "salmon", marginBottom: 8, opacity: 0.7
          }}>
            🗑 Eliminados ({deleted.length})
          </div>
          <div className="grid">
            {deleted.map((r, i) => (
              <div key={i} className="card" style={{ borderColor: "#5a1a1a", borderLeftWidth: 3, opacity: 0.6 }}>
                <div style={{ fontWeight: 700 }}>{r.description}</div>
                <div className="muted">
                  {r.expense_date} · ${clp(r.amount)} · Pagó: {r.paid_by?.display_name}
                </div>
                <div className="muted">
                  Eliminado el {new Date(r.deleted_at).toLocaleString("es-CL")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}