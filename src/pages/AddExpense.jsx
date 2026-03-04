import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { getMonster } from "../storage";
import { clp, todayISO } from "../helpers";
import { logAction } from "../audit";

export default function AddExpense() {
  const nav = useNavigate();
  const monsterCode = getMonster();

  const [me, setMe] = useState(null);
  const [monsters, setMonsters] = useState([]);
  const [desc, setDesc] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const { data: meData, error: meErr } = await supabase
        .from("monsters")
        .select("id, code, display_name")
        .eq("code", monsterCode)
        .single();
      if (meErr) return setErr(meErr.message);
      setMe(meData);

      const { data: ms, error: msErr } = await supabase
        .from("monsters")
        .select("id, code, display_name")
        .order("display_name", { ascending: true });
      if (msErr) return setErr(msErr.message);
      setMonsters(ms || []);
      setSelected(new Set((ms || []).map((x) => x.id))); // default: todos
    })();
  }, [monsterCode]);

  const participantsCount = selected.size || 0;
  const amountInt = Number(amount || 0);
  const share = useMemo(() => {
    if (!participantsCount || !amountInt) return 0;
    return Math.floor(amountInt / participantsCount);
  }, [participantsCount, amountInt]);

  async function onSave() {
    setErr("");
    if (!me) return;
    if (!desc.trim()) return setErr("Falta descripción.");
    if (!date) return setErr("Falta fecha.");
    if (!amountInt || amountInt <= 0) return setErr("Monto inválido.");
    if (selected.size === 0) return setErr("Selecciona participantes.");

    // Para MVP: reparto igual con ajuste de residuo al pagador
    const participantIds = Array.from(selected);
    const baseShare = Math.floor(amountInt / participantIds.length);
    const remainder = amountInt - baseShare * participantIds.length;

    setSaving(true);
    try {
      // 1) expenses
      const { data: expense, error: e1 } = await supabase
        .from("expenses")
        .insert({
          description: desc.trim(),
          notes: notes.trim() || null,
          expense_date: date,
          amount: amountInt,
          paid_by_monster_id: me.id,
          created_by_monster_id: me.id,
        })
        .select("id")
        .single();
      if (e1) throw e1;

      // 2) participants + computed shares
      const rowsParticipants = participantIds.map((mid) => ({
        expense_id: expense.id,
        monster_id: mid,
        share_amount: baseShare + (mid === me.id ? remainder : 0), // residuo al pagador
      }));

      const { error: e2 } = await supabase.from("expense_participants").insert(rowsParticipants);
      if (e2) throw e2;

      // 3) payments for everyone except payer
      const rowsPayments = rowsParticipants
        .filter((r) => r.monster_id !== me.id)
        .map((r) => ({
          expense_id: expense.id,
          from_monster_id: r.monster_id,
          to_monster_id: me.id,
          amount: r.share_amount,
          status: "pending",
        }));

      if (rowsPayments.length) {
        const { error: e3 } = await supabase.from("payments").insert(rowsPayments);
        if (e3) throw e3;
      }
      await logAction({
        action: "ADD_EXPENSE",
        entity: "expense",
        entityId: expense.id,
        monsterCode: monsterCode,
        monsterName: me.display_name,
        detail: {
          description: desc.trim(),
          amount: amountInt,
          expense_date: date,
          participants: participantIds.length,
        }
      });
      nav("/dashboard");
    } catch (e) {
      setErr(e.message || "Error guardando.");
    } finally {
      setSaving(false);
    }
  }

  function toggle(mid) {
    const next = new Set(selected);
    if (next.has(mid)) next.delete(mid);
    else next.add(mid);
    setSelected(next);
  }

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 className="h1">Agregar gasto</h1>
        <button className="btn btnSecondary" onClick={() => nav("/dashboard")}>Volver</button>
      </div>

      <div className="card">
        {err && <p style={{ color: "salmon" }}>{err}</p>}

        <label className="muted">Descripción</label>
        <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ensayo, cuerdas, sala, Uber..." />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10, marginTop: 10 }}>
          <div>
            <label className="muted">Fecha</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="muted">Monto (CLP)</label>
            <input className="input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} />
          </div>
        </div>

        <div className="hr" />

        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="h2">Participantes</div>
            <div className="muted">Por defecto: todos. Reparto igualitario.</div>
          </div>
          <div className="row">
            <button className="btn btnSecondary" onClick={() => setSelected(new Set(monsters.map((m) => m.id)))}>Todos</button>
            <button className="btn btnSecondary" onClick={() => setSelected(new Set())}>Nadie</button>
          </div>
        </div>

        <div className="row" style={{ marginTop: 10 }}>
          {monsters.map((m) => (
            <button
              key={m.id}
              className={`pill ${selected.has(m.id) ? "pillOn" : ""}`}
              onClick={() => toggle(m.id)}
              type="button"
              style={{
                fontSize: 14,
                fontWeight: selected.has(m.id) ? 700 : 400,
                padding: "8px 14px",
                borderColor: selected.has(m.id) ? "#7c7cff" : "#34346a",
                color: selected.has(m.id) ? "#fff" : "rgba(255,255,255,0.6)",
                background: selected.has(m.id) ? "#24244a" : "transparent",
              }}
            >
              {m.display_name}
            </button>
          ))}
        </div>

        <div className="hr" />

        <label className="muted">Notas</label>
        <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />

        <div className="hr" />

        <div className="muted">
          Preview: {participantsCount ? `${participantsCount} participantes` : "sin participantes"}
          {amountInt > 0 && participantsCount > 0 ? ` · Base por persona: $${clp(Math.floor(amountInt / participantsCount))}` : ""}
        </div>

        <div className="row" style={{ marginTop: 10, justifyContent: "flex-end" }}>
          <button className="btn" disabled={saving} onClick={onSave}>
            {saving ? "Guardando..." : "Guardar gasto"}
          </button>
        </div>
      </div>
    </div>
  );
}