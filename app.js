"use strict";

/* ---------- Data structures ---------- */

// Linked list: stores every task
class Node { constructor(value) { this.value = value; this.next = null; } }
class TaskList {
  constructor() { this.head = null; this.size = 0; }
  append(value) {
    const node = new Node(value);
    if (!this.head) this.head = node;
    else { let c = this.head; while (c.next) c = c.next; c.next = node; }
    this.size++;
  }
  remove(id) {
    let c = this.head, prev = null;
    while (c) {
      if (c.value.id === id) {
        if (prev) prev.next = c.next; else this.head = c.next;
        this.size--; return true;
      }
      prev = c; c = c.next;
    }
    return false;
  }
  find(id) {
    let c = this.head;
    while (c) { if (c.value.id === id) return c.value; c = c.next; }
    return null;
  }
  toArray() { const a = []; let c = this.head; while (c) { a.push(c.value); c = c.next; } return a; }
  static from(arr) { const l = new TaskList(); arr.forEach(t => l.append(t)); return l; }
}

// Stack: undo history (snapshots of the task list)
class Stack {
  constructor() { this.items = []; }
  push(x) { this.items.push(x); }
  pop() { return this.items.pop(); }
  get length() { return this.items.length; }
}

// Linear search by title or subject
function search(arr, term) {
  term = term.trim().toLowerCase();
  if (!term) return arr;
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].title.toLowerCase().includes(term) || arr[i].subject.toLowerCase().includes(term)) out.push(arr[i]);
  }
  return out;
}

// Insertion sort with a comparator
function insertionSort(arr, cmp) {
  const a = arr.slice();
  for (let i = 1; i < a.length; i++) {
    const key = a[i]; let j = i - 1;
    while (j >= 0 && cmp(a[j], key) > 0) { a[j + 1] = a[j]; j--; }
    a[j + 1] = key;
  }
  return a;
}

const RANK = { High: 0, Medium: 1, Low: 2 };
const byDate = (a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999");
const comparators = {
  deadline: (a, b) => byDate(a, b) || RANK[a.priority] - RANK[b.priority],
  priority: (a, b) => RANK[a.priority] - RANK[b.priority] || byDate(a, b),
  added: (a, b) => a.id - b.id
};

/* ---------- State ---------- */
const $ = id => document.getElementById(id);
let list = new TaskList(), undoStack = new Stack(), editingId = null, nextId = 1;
let showDone = true, lastOverdue = -1;

function load() {
  try {
    const raw = localStorage.getItem("tasks-v1");
    if (raw) {
      const arr = JSON.parse(raw);
      // older saves stored only a date; give them an end-of-day time
      arr.forEach(t => { if (t.deadline && t.deadline.length === 10) t.deadline += "T23:59"; });
      list = TaskList.from(arr);
      nextId = arr.reduce((m, t) => Math.max(m, t.id), 0) + 1;
    }
    const n = localStorage.getItem("name-v1");
    if (n) $("nameBtn").textContent = n;
  } catch (e) { /* storage unavailable */ }
}
function persist() { try { localStorage.setItem("tasks-v1", JSON.stringify(list.toArray())); } catch (e) {} }
function snapshot() { undoStack.push(JSON.stringify(list.toArray())); }
function undo() {
  const s = undoStack.pop();
  if (s === undefined) return;
  list = TaskList.from(JSON.parse(s));
  persist(); render();
}

/* ---------- Dates and countdown ---------- */
const pad = n => String(n).padStart(2, "0");
const msLeft = deadline => new Date(deadline).getTime() - Date.now();

function span(ms) {
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400), h = Math.floor(total % 86400 / 3600);
  const m = Math.floor(total % 3600 / 60), s = total % 60;
  return (d ? d + "d " : "") + pad(h) + "h " + pad(m) + "m " + pad(s) + "s";
}
function countdown(deadline) {
  const ms = msLeft(deadline);
  if (ms < 0) return { text: "Overdue " + span(-ms), cls: "late" };
  const cls = ms < 36e5 ? "hot" : ms < 864e5 ? "soon" : "ok";
  return { text: span(ms) + " left", cls };
}
function niceDate(deadline) {
  return new Date(deadline).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/* ---------- Rendering ---------- */
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function dueChips(t) {
  if (!t.deadline) return '<span class="chip">No deadline</span>';
  if (t.done) return `<span class="chip">Was due ${niceDate(t.deadline)}</span>`;
  const c = countdown(t.deadline);
  return `<span class="chip">${niceDate(t.deadline)}</span><span class="chip count ${c.cls}" data-due="${esc(t.deadline)}">${c.text}</span>`;
}
function row(t) {
  return `<li class="task ${t.done ? "done" : ""}">
    <input type="checkbox" ${t.done ? "checked" : ""} data-toggle="${t.id}" aria-label="${t.done ? "Mark pending" : "Mark done"}: ${esc(t.title)}">
    <div>
      <div class="t">${esc(t.title)}</div>
      <div class="chips">
        <span class="chip ${t.priority}">${t.priority}</span>
        ${t.subject ? `<span class="chip">${esc(t.subject)}</span>` : ""}
        ${dueChips(t)}
      </div>
      ${t.details ? `<p class="note">${esc(t.details)}</p>` : ""}
    </div>
    <div class="acts">
      <button class="mini" data-edit="${t.id}">Edit</button>
      <button class="mini del" data-del="${t.id}">Delete</button>
    </div>
  </li>`;
}
function countOverdue(all) {
  let n = 0;
  for (const t of all) if (!t.done && t.deadline && msLeft(t.deadline) < 0) n++;
  return n;
}

function render() {
  const all = list.toArray();
  const total = all.length;
  const doneCount = all.filter(t => t.done).length;
  const overdue = countOverdue(all);
  lastOverdue = overdue;
  const pct = total ? Math.round(doneCount / total * 100) : 0;

  const shown = insertionSort(search(all, $("q").value), comparators[$("sort").value]);
  const pend = [], comp = [];
  for (const t of shown) (t.done ? comp : pend).push(t);

  $("pending").innerHTML = pend.length ? pend.map(row).join("") : '<li class="empty">Nothing pending. Tap + to add a task.</li>';
  $("completed").innerHTML = comp.length ? comp.map(row).join("") : '<li class="empty">Finished tasks will show up here.</li>';
  $("doneWrap").hidden = !showDone;

  $("np").textContent = total - doneCount;
  $("nc").textContent = doneCount;
  $("nl").textContent = overdue;
  $("progressText").textContent = total ? `${doneCount} of ${total} done (${pct}%)` : "No tasks yet";
  $("meterFill").style.width = pct + "%";
  $("meter").setAttribute("aria-valuenow", pct);
  $("undo").disabled = undoStack.length === 0;
}

// runs every second: updates the live countdowns without rebuilding the list
function tick() {
  if (countOverdue(list.toArray()) !== lastOverdue) { render(); return; }
  document.querySelectorAll(".count").forEach(el => {
    const c = countdown(el.dataset.due);
    el.textContent = c.text;
    el.className = "chip count " + c.cls;
  });
}

/* ---------- Add / edit window ---------- */
function openForm(id) {
  $("err").textContent = "";
  editingId = id || null;
  const t = id ? list.find(id) : null;
  $("title").value = t ? t.title : "";
  $("subject").value = t ? t.subject : "";
  $("deadline").value = t && t.deadline ? t.deadline.slice(0, 10) : "";
  $("dtime").value = t && t.deadline ? t.deadline.slice(11, 16) : "23:59";
  $("priority").value = t ? t.priority : "Medium";
  $("details").value = t ? t.details : "";
  $("save").textContent = t ? "Save changes" : "Add task";
  $("formTitle").textContent = t ? "Edit task" : "New task";
  $("dlg").showModal();
  $("title").focus();
}

$("save").onclick = () => {
  const title = $("title").value.trim();
  if (!title) { $("err").textContent = "Enter a title before saving."; $("title").focus(); return; }
  snapshot();
  const date = $("deadline").value;
  const data = {
    title,
    subject: $("subject").value.trim(),
    deadline: date ? date + "T" + ($("dtime").value || "23:59") : "",
    priority: $("priority").value,
    details: $("details").value.trim()
  };
  if (editingId) Object.assign(list.find(editingId), data);
  else list.append({ id: nextId++, done: false, ...data });
  persist(); $("dlg").close(); render();
};
$("cancel").onclick = () => $("dlg").close();
$("fabAdd").onclick = () => openForm();
$("undo").onclick = undo;
$("fabDone").onclick = () => {
  showDone = !showDone;
  $("fabDone").setAttribute("aria-pressed", showDone);
  render();
};
/* ---------- Name: asked first, before the app is used ---------- */
let nameRequired = false;
function openNameDialog(first) {
  nameRequired = first;
  $("nameErr").textContent = "";
  $("nameInput").value = first ? "" : $("nameBtn").textContent;
  $("nameTitle").textContent = first ? "Welcome!" : "Change your name";
  $("nameSub").hidden = !first;
  $("nameCancel").hidden = first;
  $("nameSave").textContent = first ? "Continue" : "Save";
  $("nameDlg").showModal();
  $("nameInput").focus();
}
$("nameForm").addEventListener("submit", e => {
  e.preventDefault();
  const n = $("nameInput").value.trim().slice(0, 30);
  if (!n) { $("nameErr").textContent = "Please enter your name to continue."; $("nameInput").focus(); return; }
  $("nameBtn").textContent = n;
  try { localStorage.setItem("name-v1", n); } catch (err) {}
  nameRequired = false;
  $("nameDlg").close();
});
$("nameCancel").onclick = () => $("nameDlg").close();
// the first-time window can't be skipped with Esc
$("nameDlg").addEventListener("cancel", e => { if (nameRequired) e.preventDefault(); });
$("nameBtn").onclick = () => openNameDialog(false);

/* ---------- Theme: one button switches light and night ---------- */
const THEME_COLORS = { light: "#6c4cff", night: "#000000" };
function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem("theme-v1", t); } catch (e) {}
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLORS[t]);
  const next = t === "night" ? "light" : "night";
  $("fabTheme").innerHTML = t === "night" ? "&#9728;" : "&#9790;";
  $("fabTheme").title = $("fabTheme").ariaLabel = "Switch to " + next + " theme";
}
$("fabTheme").onclick = () => applyTheme(document.documentElement.getAttribute("data-theme") === "night" ? "light" : "night");

$("q").oninput = render;
$("sort").onchange = render;

document.addEventListener("click", e => {
  const d = e.target.dataset;
  if (d.del) { snapshot(); list.remove(+d.del); persist(); render(); }
  if (d.edit && list.find(+d.edit)) openForm(+d.edit);
});
document.addEventListener("change", e => {
  if (e.target.dataset.toggle) {
    snapshot();
    const t = list.find(+e.target.dataset.toggle);
    t.done = !t.done;
    persist(); render();
  }
});

load(); applyTheme(document.documentElement.getAttribute("data-theme") === "night" ? "night" : "light"); render();
let savedName = null;
try { savedName = localStorage.getItem("name-v1"); } catch (e) {}
if (!savedName) openNameDialog(true);
setInterval(tick, 1000);
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
