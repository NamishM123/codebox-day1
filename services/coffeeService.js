// Coffee-chat slots: members offer times, others book them.
const db = require("../db");

const SELECT = `
  SELECT cs.*, h.username AS host, h.name AS host_name, h.role AS host_role,
         b.username AS booker, b.name AS booker_name
  FROM coffee_slots cs
  JOIN members h ON h.id = cs.host_id
  LEFT JOIN members b ON b.id = cs.booked_by`;

async function list() {
  return db.query(`${SELECT} ORDER BY cs.id DESC`);
}
async function create(hostId, slot_time, topic) {
  if (!slot_time || !slot_time.trim()) return { ok: false, reason: "bad_time" };
  await db.query(
    "INSERT INTO coffee_slots (host_id, slot_time, topic) VALUES ($1,$2,$3)",
    [hostId, slot_time.trim(), (topic || "").trim()]
  );
  return { ok: true };
}
async function book(id, userId) {
  const s = await db.get("SELECT * FROM coffee_slots WHERE id=$1", [Number(id)]);
  if (!s) return { ok: false, reason: "not_found" };
  if (s.status !== "open") return { ok: false, reason: "taken" };
  if (s.host_id === Number(userId)) return { ok: false, reason: "own" };
  await db.query("UPDATE coffee_slots SET status='booked', booked_by=$1 WHERE id=$2", [Number(userId), Number(id)]);
  return { ok: true };
}
async function remove(id, userId) {
  const s = await db.get("SELECT * FROM coffee_slots WHERE id=$1", [Number(id)]);
  if (!s) return { ok: false, reason: "not_found" };
  if (s.host_id !== Number(userId)) return { ok: false, reason: "forbidden" };
  await db.query("DELETE FROM coffee_slots WHERE id=$1", [Number(id)]);
  return { ok: true };
}
module.exports = { list, create, book, remove };
