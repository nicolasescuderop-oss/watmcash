const KEY = "watm_current_monster_code";

export function setMonster(code) {
  localStorage.setItem(KEY, code);
}

export function getMonster() {
  return localStorage.getItem(KEY);
}

export function clearMonster() {
  localStorage.removeItem(KEY);
}