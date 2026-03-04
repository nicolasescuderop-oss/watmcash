export function clp(n) {
  try {
    return new Intl.NumberFormat("es-CL").format(n);
  } catch {
    return String(n);
  }
}

export function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
