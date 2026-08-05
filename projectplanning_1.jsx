import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Building2, MapPin, Plus, CheckCircle2, Circle, Image as ImageIcon,
  MessageSquare, TrendingUp, TrendingDown, Euro, ClipboardList, Trash2, Users,
  Lock, Globe, Ruler, Loader2, ChevronDown, Key, Copy, LogOut, RefreshCw,
  ShieldCheck, CalendarRange, Navigation, Bell, X, Camera, ClipboardCheck,
  Palette, MessageCircle, Receipt, LayoutDashboard, Send, Upload, FileText, Clock, Archive, Search
} from "lucide-react";

const STORAGE_KEY = "aannemer-planning-v4";

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const genCode = (base) => {
  const clean = (base || "XXXX").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4).padEnd(4, "X");
  return clean + Math.floor(100 + Math.random() * 900);
};

const STATUSES = ["gepland", "lopend", "afgerond"];
const STATUS_LABEL = { gepland: "Gepland", lopend: "Lopend", afgerond: "Afgerond" };
const VIS_LABEL = { prive: "Alleen ik", team: "Team", klant: "Team + klant" };
const TRADES = ["Timmerman", "Metselaar", "Stucadoor", "Schilder", "Loodgieter", "Elektricien", "Dakdekker", "Grondwerker", "Overig"];
const TAB_ORDER = ["planning", "bouwplanning", "tekeningen", "fotos", "notities", "chat", "opleverpunten", "klantkeuzes", "meerwerk", "financieel", "uren", "veiligheid", "dossier"];
const TAB_META = {
  planning: { icon: <ClipboardList size={14} />, label: "Planning" },
  bouwplanning: { icon: <CalendarRange size={14} />, label: "Bouwplanning" },
  tekeningen: { icon: <ImageIcon size={14} />, label: "Tekeningen" },
  fotos: { icon: <Camera size={14} />, label: "Foto's" },
  notities: { icon: <MessageSquare size={14} />, label: "Notities" },
  chat: { icon: <MessageCircle size={14} />, label: "Chat" },
  opleverpunten: { icon: <ClipboardCheck size={14} />, label: "Opleverpunten" },
  klantkeuzes: { icon: <Palette size={14} />, label: "Klantkeuzes" },
  meerwerk: { icon: <Euro size={14} />, label: "Meer-/minderwerk" },
  financieel: { icon: <Receipt size={14} />, label: "Financieel" },
  uren: { icon: <Clock size={14} />, label: "Uren" },
  veiligheid: { icon: <ShieldCheck size={14} />, label: "Veiligheid" },
  dossier: { icon: <Archive size={14} />, label: "Opleverdossier" },
};
const defaultClientPermissions = () => Object.fromEntries(TAB_ORDER.map((k) => [k, true]));
const defaultTeamPermissions = () => ({ ...defaultClientPermissions(), financieel: false });
const defaultPermissions = defaultClientPermissions;

const DEFAULT_SAFETY_ITEMS = [
  "Werkplek vrij van obstakels en rommel",
  "Persoonlijke beschermingsmiddelen gedragen (helm, schoenen, evt. gehoorbescherming)",
  "Vluchtroutes en nooduitgangen vrij",
  "Gereedschap en machines gecontroleerd voor gebruik",
  "Steigers en ladders stabiel en veilig opgesteld",
];

function defaultSafetyChecklist() {
  return DEFAULT_SAFETY_ITEMS.map((text) => ({ id: uid(), text }));
}

function defaultTemplates() {
  return [
    { id: uid(), name: "Dakkapel", phases: [
      { title: "Fundering", days: 4 },
      { title: "Kozijnen plaatsen", days: 4 },
      { title: "Dakbedekking", days: 3 },
      { title: "Afwerking & oplevering", days: 5 },
    ] },
    { id: uid(), name: "Badkamerrenovatie", phases: [
      { title: "Sloop oude badkamer", days: 2 },
      { title: "Leiding- en tegelwerk", days: 5 },
      { title: "Sanitair plaatsen", days: 2 },
      { title: "Afwerking & oplevering", days: 2 },
    ] },
  ];
}

function seedData() {
  const clientId = uid();
  const teamJan = uid(), teamPiet = uid(), teamDak = uid();
  const phaseFund = uid(), phaseKoz = uid(), phaseDak = uid(), phaseAfw = uid();
  return {
    ownerCode: "EIGENAAR1",
    templates: defaultTemplates(),
    teamMembers: [
      { id: teamJan, name: "Jan Bakker", trade: "Metselaar", code: genCode("JAN"), permissions: defaultTeamPermissions(), canEditSchedule: false },
      { id: teamPiet, name: "Piet Molenaar (Timmerwerk BV)", trade: "Timmerman", code: genCode("PIET"), permissions: defaultTeamPermissions(), canEditSchedule: false },
      { id: teamDak, name: "Dakwerken Pol", trade: "Dakdekker", code: genCode("POL"), permissions: defaultTeamPermissions(), canEditSchedule: false },
    ],
    clients: [
      { id: clientId, name: "Fam. de Groot", code: genCode("GROOT"), permissions: defaultClientPermissions(), canEditSchedule: false },
    ],
    notifications: [],
    projects: [
      {
        id: uid(),
        name: "Verbouwing Dakkapel",
        clientId,
        address: "Molenweg 14, Hilversum",
        status: "lopend",
        tasks: [
          { id: uid(), title: "Fundering dakkapel storten", assignee: "Jan Bakker", dueDate: "2026-08-08", done: true, phaseId: phaseFund },
          { id: uid(), title: "Kozijnen plaatsen", assignee: "Piet Molenaar (Timmerwerk BV)", dueDate: "2026-08-12", done: false, phaseId: phaseKoz },
          { id: uid(), title: "Dakbedekking aanbrengen", assignee: "Dakwerken Pol", dueDate: "2026-08-15", done: false, phaseId: phaseDak },
        ],
        schedule: [
          { id: phaseFund, title: "Fundering", assignee: "Jan Bakker", start: "2026-08-05", end: "2026-08-08" },
          { id: phaseKoz, title: "Kozijnen plaatsen", assignee: "Piet Molenaar (Timmerwerk BV)", start: "2026-08-09", end: "2026-08-12" },
          { id: phaseDak, title: "Dakbedekking", assignee: "Dakwerken Pol", start: "2026-08-13", end: "2026-08-15" },
          { id: phaseAfw, title: "Afwerking & oplevering", assignee: "Jan Bakker", start: "2026-08-16", end: "2026-08-20" },
        ],
        drawings: [
          { id: uid(), title: "Constructietekening dakkapel v2", note: "Definitieve versie, goedgekeurd door constructeur", uploadedBy: "Eigenaar", uploaderRole: "eigenaar", teamVisible: true, clientVisible: true, reviewed: true },
        ],
        photos: [
          { id: uid(), title: "Situatie vóór start", category: "voor", note: "Bestaande dakrand", uploadedBy: "Jan Bakker", uploaderRole: "team", date: "2026-08-04", teamVisible: true, clientVisible: true, reviewed: true },
          { id: uid(), title: "Fundering gestort", category: "tijdens", note: "", uploadedBy: "Jan Bakker", uploaderRole: "team", date: "2026-08-08", teamVisible: true, clientVisible: true, reviewed: true },
        ],
        chatMessages: [
          { id: uid(), author: "Eigenaar", text: "Kozijnen zijn besteld, verwachte levering 11 augustus.", date: "2026-08-02" },
          { id: uid(), author: "Fam. de Groot", text: "Top, bedankt voor de update!", date: "2026-08-02" },
        ],
        ownerChat: [],
        completionPoints: [
          { id: uid(), description: "Kit-naad rondom dakkapel afwerken", responsible: "Jan Bakker", deadline: "2026-08-21", status: "open" },
        ],
        clientChoices: [
          { id: uid(), category: "Kozijnkleur", description: "RAL 7016 antraciet of RAL 9016 wit", deadline: "2026-08-06", status: "open" },
        ],
        invoices: [
          { id: uid(), title: "Termijn 1 - Start werkzaamheden", amount: 7500, status: "betaald" },
          { id: uid(), title: "Termijn 2 - Ruwbouw gereed", amount: 6500, status: "open" },
        ],
        notes: [
          { id: uid(), text: "Klant wil graag extra ventilatierooster aan de achterzijde.", author: "Eigenaar", visibility: "klant", date: "2026-08-01" },
          { id: uid(), text: "Marge is krap door prijsstijging hout, goed in de gaten houden.", author: "Eigenaar", visibility: "prive", date: "2026-08-02" },
        ],
        extraWork: [
          { id: uid(), type: "meerwerk", description: "Extra ventilatierooster achterzijde", amount: 340, status: "akkoord" },
          { id: uid(), type: "minderwerk", description: "Geen dakraam aan de zijkant, komt te vervallen", amount: 180, status: "akkoord" },
          { id: uid(), type: "meerwerk", description: "Extra isolatie dakschild", amount: 275, status: "open" },
        ],
        hours: [
          { id: uid(), teamMember: "Jan Bakker", date: "2026-08-05", hours: 8, note: "Fundering storten" },
          { id: uid(), teamMember: "Jan Bakker", date: "2026-08-06", hours: 7.5, note: "" },
        ],
        safetyChecklist: defaultSafetyChecklist(),
        safetyLogs: [
          { id: uid(), date: "2026-08-05", teamMember: "Jan Bakker", time: "07:45" },
        ],
        warranty: { text: "Op het uitgevoerde metsel- en dakwerk geldt 10 jaar garantie conform de garantieregeling van Van Essen Bouw & Onderhoud.", months: 120 },
        warrantyItems: [
          { id: uid(), item: "Dakbedekking", amount: 10, unit: "jaren" },
          { id: uid(), item: "Kozijnen en beglazing", amount: 5, unit: "jaren" },
          { id: uid(), item: "Afwerking en stucwerk", amount: 24, unit: "maanden" },
        ],
        calc: { begroot: 18500, werkelijk: 9200 },
      },
    ],
  };
}

function useAppData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, true);
        if (res && res.value) {
          setData(JSON.parse(res.value));
        } else {
          const seed = seedData();
          setData(seed);
          await window.storage.set(STORAGE_KEY, JSON.stringify(seed), true);
        }
      } catch (e) {
        const seed = seedData();
        setData(seed);
        try { await window.storage.set(STORAGE_KEY, JSON.stringify(seed), true); } catch (_) {}
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback((next) => {
    setData((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      setStatus("saving");
      window.storage.set(STORAGE_KEY, JSON.stringify(resolved), true)
        .then((res) => setStatus(res ? "saved" : "error"))
        .catch(() => setStatus("error"));
      return resolved;
    });
  }, []);

  return { data, setData: persist, loading, status };
}

const fmtEuro = (n) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(n) || 0);
const fmtDate = (iso) => (iso ? new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(new Date(iso)) : "");
const latestPhotoOf = (p) => (p.photos || []).filter((ph) => ph.fileData).slice(-1)[0];

function readImageCompressed(file, maxDim = 900, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Kon het bestand niet lezen."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Kon de afbeelding niet openen."));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function processUploadedFile(file) {
  if (file.type === "application/pdf") {
    if (file.size > 3 * 1024 * 1024) throw new Error("Dit PDF-bestand is te groot voor deze demo-opslag (max ~3MB).");
    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(new Error("Kon het PDF-bestand niet lezen."));
      r.onload = () => resolve(r.result);
      r.readAsDataURL(file);
    });
    return { fileData: dataUrl, fileType: "pdf", fileName: file.name };
  }
  const dataUrl = await readImageCompressed(file);
  return { fileData: dataUrl, fileType: "image", fileName: file.name };
}

function FileCaptureButtons({ accept, onPicked, busy }) {
  const cameraRef = useRef(null);
  const uploadRef = useRef(null);
  const handleChange = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (file) onPicked(file);
  };
  return (
    <div className="file-capture-row">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleChange} />
      <input ref={uploadRef} type="file" accept={accept} style={{ display: "none" }} onChange={handleChange} />
      <button type="button" className="btn-ghost" onClick={() => cameraRef.current.click()} disabled={busy}><Camera size={14} /> Foto maken</button>
      <button type="button" className="btn-ghost" onClick={() => uploadRef.current.click()} disabled={busy}><Upload size={14} /> Bestand uploaden</button>
      {busy && <span className="mono file-busy"><Loader2 className="spin" size={12} /> verwerken…</span>}
    </div>
  );
}

function defaultItemVisibility(role) {
  if (role === "eigenaar") return { teamVisible: true, clientVisible: false, reviewed: true };
  if (role === "team") return { teamVisible: false, clientVisible: false, reviewed: false };
  return { teamVisible: false, clientVisible: true, reviewed: false }; // klant
}

function VisibilityReview({ item, role, onSet }) {
  if (role !== "eigenaar") return null;
  return (
    <div className="review-controls">
      {!item.reviewed && <span className="vis-pill vis-review">nieuw · nog controleren</span>}
      <label className="checkbox-label small">
        <input type="checkbox" checked={!!item.teamVisible} onChange={(e) => onSet({ teamVisible: e.target.checked, reviewed: true })} />
        Team
      </label>
      <label className="checkbox-label small">
        <input type="checkbox" checked={!!item.clientVisible} onChange={(e) => onSet({ clientVisible: e.target.checked, reviewed: true })} />
        Klant
      </label>
    </div>
  );
}

function FilePreview({ fileData, fileType, fileName, onClear }) {
  if (!fileData) return null;
  return (
    <div className="file-preview">
      {fileType === "pdf" ? (
        <div className="file-preview-pdf"><FileText size={16} /> {fileName || "PDF-bestand"}</div>
      ) : (
        <img src={fileData} alt="" className="file-preview-img" />
      )}
      <button type="button" className="icon-btn danger ghost" onClick={onClear}><X size={13} /></button>
    </div>
  );
}

function Lightbox({ src, onClose }) {
  if (!src) return null;
  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <img src={src} alt="" className="lightbox-img" onClick={(e) => e.stopPropagation()} />
      <button className="lightbox-close" onClick={onClose}><X size={18} /></button>
    </div>
  );
}

function SignaturePad({ title, onSave, onCancel }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [hasDrawn, setHasDrawn] = useState(false);

  const fillWhite = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => { fillWhite(); }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };
  const start = (e) => { e.preventDefault(); drawingRef.current = true; lastPos.current = getPos(e); };
  const move = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.strokeStyle = "#111318";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    if (!hasDrawn) setHasDrawn(true);
  };
  const end = () => { drawingRef.current = false; };
  const clear = () => { fillWhite(); setHasDrawn(false); };
  const save = () => { if (hasDrawn) onSave(canvasRef.current.toDataURL("image/png")); };

  return (
    <div className="sig-overlay" onClick={onCancel}>
      <div className="sig-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sig-title">{title || "Onderteken om te bevestigen"}</div>
        <canvas
          ref={canvasRef}
          width={360}
          height={160}
          className="sig-canvas"
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        />
        <div className="sig-hint">Teken met muis of vinger</div>
        <div className="sig-actions">
          <button type="button" className="btn-ghost" onClick={clear}>Wissen</button>
          <button type="button" className="btn-ghost" onClick={onCancel}>Annuleren</button>
          <button type="button" className="btn-primary" onClick={save} disabled={!hasDrawn}>Bevestigen</button>
        </div>
      </div>
    </div>
  );
}

function Brandmark({ size = "normal" }) {
  return (
    <div className={"brandmark " + size}>
      <div className="brandmark-name">
        <span className="bm-van">VAN</span> <span className="bm-essen">ESSEN</span>
      </div>
      <div className="bm-sub">BOUW &amp; ONDERHOUD</div>
    </div>
  );
}

function AssigneeInput({ value, onChange, teamMembers }) {
  const names = teamMembers.map((m) => m.name);
  const [customMode, setCustomMode] = useState(!!value && !names.includes(value));
  if (customMode) {
    return (
      <div className="assignee-custom">
        <input placeholder="Naam / bedrijf" value={value} onChange={(e) => onChange(e.target.value)} />
        {teamMembers.length > 0 && (
          <button type="button" className="link-btn" onClick={() => { setCustomMode(false); onChange(""); }}>Kies uit team</button>
        )}
      </div>
    );
  }
  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === "__custom__") { setCustomMode(true); onChange(""); }
        else onChange(e.target.value);
      }}
    >
      <option value="">Niet toegewezen</option>
      {teamMembers.map((m) => (
        <option key={m.id} value={m.name}>{m.name}{m.trade ? ` — ${m.trade}` : ""}</option>
      ))}
      <option value="__custom__">Anders / extern…</option>
    </select>
  );
}

export default function App() {
  const { data, setData, loading, status } = useAppData();
  const [currentUser, setCurrentUser] = useState(null); // {role,name,clientId?}
  const [codeInput, setCodeInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState("planning");
  const [view, setView] = useState("dashboard"); // 'dashboard' | 'project' | 'toegang'
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({ afgerond: true });
  const toggleGroup = (status) => setCollapsedGroups((prev) => ({ ...prev, [status]: !prev[status] }));

  const role = currentUser?.role;
  const project = data?.projects.find((p) => p.id === selectedId) || null;
  const clientRecord = role === "klant" && data ? data.clients.find((c) => c.id === currentUser.clientId) : null;
  const clientPerm = clientRecord?.permissions || defaultPermissions();
  const teamRecord = role === "team" && data ? data.teamMembers.find((m) => m.id === currentUser.teamMemberId) : null;
  const teamPerm = teamRecord?.permissions || defaultPermissions();
  const canSeeTab = (key) => {
    if (key === "klantchat") return role !== "team";
    if (key === "calc") return role === "eigenaar";
    if (key === "uren" || key === "veiligheid") return role !== "klant";
    if (role === "klant") return !!clientPerm[key];
    if (role === "team") return !!teamPerm[key];
    return true;
  };
  const canEditSchedule = role === "eigenaar" || (role === "team" && !!teamRecord?.canEditSchedule) || (role === "klant" && !!clientRecord?.canEditSchedule);
  const myNotifications = (data?.notifications || []).filter((n) => n.teamMemberId === currentUser?.teamMemberId && !n.read);
  const hasProjectAccess = (p) => {
    if (role === "klant") return p.clientId === currentUser.clientId;
    if (role === "team") {
      const access = teamRecord?.projectAccess;
      if (!access || access === "all") return true;
      return Array.isArray(access) && access.includes(p.id);
    }
    return true;
  };
  const visibleProjects = data ? data.projects.filter(hasProjectAccess) : [];

  useEffect(() => {
    if (data && data.projects.length && !selectedId) {
      if (visibleProjects.length) setSelectedId(visibleProjects[0].id);
    }
  }, [data, selectedId, role, visibleProjects.length]);

  useEffect(() => {
    if ((role === "klant" || role === "team") && project && !canSeeTab(tab)) {
      const first = TAB_ORDER.find((k) => canSeeTab(k));
      setTab(first || "planning");
    }
  }, [role, project?.id, tab, clientPerm, teamPerm]);

  if (loading || !data) {
    return (
      <div className="app-shell app-loading">
        <style>{CSS}</style>
        <Loader2 className="spin" size={22} />
        <span>Wordt geladen…</span>
      </div>
    );
  }

  const handleLogin = () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    if (code === (data.ownerCode || "").toUpperCase()) {
      setCurrentUser({ role: "eigenaar", name: "Eigenaar" });
      setLoginError("");
      return;
    }
    const member = data.teamMembers.find((m) => m.code.toUpperCase() === code);
    if (member) {
      setCurrentUser({ role: "team", name: member.name, teamMemberId: member.id });
      setLoginError("");
      return;
    }
    const client = data.clients.find((c) => c.code.toUpperCase() === code);
    if (client) {
      setCurrentUser({ role: "klant", name: client.name, clientId: client.id });
      setLoginError("");
      return;
    }
    setLoginError("Onbekende toegangscode. Controleer en probeer opnieuw.");
  };

  if (!currentUser) {
    return (
      <div className="login-shell">
        <style>{CSS}</style>
        <div className="login-card">
          <Brandmark size="large" />
          <p className="login-copy">Voer je persoonlijke toegangscode in om verder te gaan.</p>
          <div className="login-form">
            <input
              autoFocus
              placeholder="TOEGANGSCODE"
              value={codeInput}
              onChange={(e) => { setCodeInput(e.target.value); setLoginError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <button className="btn-primary" onClick={handleLogin}>Inloggen</button>
          </div>
          {loginError && <div className="login-error">{loginError}</div>}
          <div className="login-hint">Geen code ontvangen? Vraag deze aan bij Van Essen Bouw &amp; Onderhoud.</div>
        </div>
      </div>
    );
  }

  const updateProject = (id, updater) => {
    setData((prev) => ({ ...prev, projects: prev.projects.map((p) => (p.id === id ? updater(p) : p)) }));
  };

  const addNotification = (memberName, text) => {
    setData((prev) => {
      const member = prev.teamMembers.find((m) => m.name === memberName);
      if (!member) return prev;
      const notif = { id: uid(), teamMemberId: member.id, text, date: new Date().toISOString().slice(0, 10), read: false };
      return { ...prev, notifications: [notif, ...(prev.notifications || [])] };
    });
  };

  const dismissNotification = (id) => {
    setData((prev) => ({ ...prev, notifications: (prev.notifications || []).map((n) => (n.id === id ? { ...n, read: true } : n)) }));
  };

  const addProject = ({ name, clientId, address, templateId, startDate }) => {
    if (!name.trim()) return;
    let schedule = [];
    let tasks = [];
    const tpl = templateId ? (data.templates || []).find((t) => t.id === templateId) : null;
    if (tpl) {
      let cursor = new Date(startDate || new Date().toISOString().slice(0, 10));
      tpl.phases.forEach((ph) => {
        const phId = uid();
        const start = new Date(cursor);
        const end = new Date(cursor.getTime() + Math.max(0, (ph.days || 1) - 1) * DAY_MS);
        schedule.push({ id: phId, title: ph.title, assignee: "", start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) });
        tasks.push({ id: uid(), title: `${ph.title} afronden`, assignee: "", dueDate: end.toISOString().slice(0, 10), done: false, phaseId: phId });
        cursor = new Date(end.getTime() + DAY_MS);
      });
    }
    const np = {
      id: uid(), name, clientId: clientId || null, address, status: "gepland",
      tasks, schedule, drawings: [], notes: [], extraWork: [], photos: [], chatMessages: [], ownerChat: [],
      completionPoints: [], clientChoices: [], invoices: [], hours: [], safetyChecklist: defaultSafetyChecklist(), safetyLogs: [],
      warranty: { text: "", months: 12 },
      calc: { begroot: 0, werkelijk: 0 },
    };
    setData({ ...data, projects: [np, ...data.projects] });
    setSelectedId(np.id);
    setSidebarOpen(false);
  };

  const deleteProject = (id) => {
    const next = { ...data, projects: data.projects.filter((p) => p.id !== id) };
    setData(next);
    if (selectedId === id) setSelectedId(next.projects[0]?.id || null);
  };

  const clientOf = (p) => data.clients.find((c) => c.id === p.clientId);
  const roleLabel = { eigenaar: "Eigenaar", team: "Team", klant: "Klant" }[role];

  return (
    <div className="app-shell">
      <style>{CSS}</style>

      <aside className={"sidebar" + (sidebarOpen ? " open" : "")}>
        <Brandmark />
        <button className={"toegang-toggle" + (view === "dashboard" ? " active" : "")} onClick={() => { setView("dashboard"); setSidebarOpen(false); }}>
          <LayoutDashboard size={14} /> Dashboard
        </button>
        {role === "eigenaar" && <NewProjectForm onAdd={addProject} clients={data.clients} templates={data.templates || []} />}

        <div className="project-list">
          {visibleProjects.length === 0 && <div className="empty-hint">Nog geen projecten.</div>}
          {STATUSES.map((status) => {
            const groupProjects = visibleProjects.filter((p) => p.status === status);
            if (visibleProjects.length > 0 && groupProjects.length === 0) return null;
            const collapsed = !!collapsedGroups[status];
            return (
              <div key={status} className="project-group">
                <button type="button" className="project-group-header" onClick={() => toggleGroup(status)}>
                  <ChevronDown size={13} className={"access-chevron" + (collapsed ? "" : " open")} />
                  <span>{STATUS_LABEL[status]}</span>
                  <span className="count-badge">{groupProjects.length}</span>
                </button>
                {!collapsed && (
                  groupProjects.length === 0 ? (
                    <div className="empty-hint project-group-empty">Geen projecten.</div>
                  ) : (
                    groupProjects.map((p) => {
                      const thumbPhoto = (p.photos || []).filter((ph) => ph.fileData).slice(-1)[0];
                      const pct = projectProgress(p);
                      return (
                        <button
                          key={p.id}
                          className={"project-item" + (p.id === selectedId && view === "project" ? " active" : "")}
                          onClick={() => { setSelectedId(p.id); setTab("planning"); setView("project"); setSidebarOpen(false); }}
                        >
                          <div className="project-item-thumb">
                            {thumbPhoto ? <img src={thumbPhoto.fileData} alt="" /> : <div className="project-item-thumb-placeholder"><Building2 size={14} /></div>}
                          </div>
                          <div className="project-item-info">
                            <span className="project-item-name">{p.name}</span>
                            <span className="project-item-sub">{clientOf(p)?.name || "geen klant gekoppeld"}</span>
                            <div className="project-item-progress"><div className="project-item-progress-fill" style={{ width: pct + "%" }} /></div>
                          </div>
                        </button>
                      );
                    })
                  )
                )}
              </div>
            );
          })}
        </div>

        {role === "eigenaar" && (
          <button className={"toegang-toggle" + (view === "toegang" ? " active" : "")} onClick={() => { setView("toegang"); setSidebarOpen(false); }}>
            <Key size={14} /> Team &amp; klanten
          </button>
        )}

        <div className="sidebar-user">
          <span className="access-avatar">{(currentUser.name || "?").slice(0, 1).toUpperCase()}</span>
          <div>
            <div className="sidebar-user-name">{currentUser.name}</div>
            <div className="sidebar-user-role">{roleLabel}{role === "team" && myNotifications.length > 0 ? ` · ${myNotifications.length} nieuw` : ""}</div>
          </div>
          <button className="logout-btn" onClick={() => { setCurrentUser(null); setCodeInput(""); }}><LogOut size={13} /></button>
        </div>
      </aside>

      <div className="mobile-bar">
        <button onClick={() => setSidebarOpen((v) => !v)}>
          <ClipboardList size={16} /> Menu <ChevronDown size={14} />
        </button>
        <button className="mobile-logout" onClick={() => { setCurrentUser(null); setCodeInput(""); }}><LogOut size={14} /></button>
      </div>

      <main className="main">
        {role === "team" && myNotifications.length > 0 && (
          <div className="notif-bar">
            {myNotifications.map((n) => (
              <div key={n.id} className="notif-item">
                <Bell size={14} />
                <div className="notif-text">
                  <div>{n.text}</div>
                  <div className="notif-date mono">{n.date}</div>
                </div>
                <button className="icon-btn ghost" onClick={() => dismissNotification(n.id)}><X size={13} /></button>
              </div>
            ))}
          </div>
        )}
        {view === "toegang" && role === "eigenaar" ? (
          <AccessPanel data={data} setData={setData} />
        ) : view === "dashboard" ? (
          <Dashboard data={data} projects={visibleProjects} currentUser={currentUser} role={role} onOpenProject={(id, targetTab) => { setSelectedId(id); setTab(targetTab || "planning"); setView("project"); }} />
        ) : !project ? (
          <div className="no-project">
            <Ruler size={28} />
            <p>Selecteer of maak een project om de planning te bekijken.</p>
          </div>
        ) : (
          <>
            <header className="project-header">
              <div className="header-grid-texture" />
              <div className="header-top">
                <div>
                  <div className="header-eyebrow">Project</div>
                  <h1>{project.name}</h1>
                  <div className="header-meta">
                    <span><Building2 size={13} /> {clientOf(project)?.name || "Geen klant gekoppeld"}</span>
                  </div>
                </div>
                <div className="header-right">
                  {role === "eigenaar" ? (
                    <>
                      <select
                        className="status-select"
                        value={project.clientId || ""}
                        onChange={(e) => updateProject(project.id, (p) => ({ ...p, clientId: e.target.value || null }))}
                      >
                        <option value="">— Geen klant —</option>
                        {data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <select
                        className="status-select"
                        value={project.status}
                        onChange={(e) => updateProject(project.id, (p) => ({ ...p, status: e.target.value }))}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                      </select>
                      <button className="icon-btn danger" title="Project verwijderen" onClick={() => deleteProject(project.id)}>
                        <Trash2 size={15} />
                      </button>
                    </>
                  ) : (
                    <span className={"pill pill-" + project.status}>{STATUS_LABEL[project.status]}</span>
                  )}
                </div>
              </div>
            </header>

            <div className="address-card">
              <MapPin size={17} />
              <div className="address-body">
                <div className="address-label">Werkadres</div>
                <div className="address-value">{project.address || "Nog geen adres toegevoegd"}</div>
              </div>
              {project.address && (
                <>
                  <a
                    className="address-link"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`}
                    target="_blank" rel="noopener noreferrer"
                  >
                    <Navigation size={13} /> Google Maps
                  </a>
                  <a
                    className="address-link apple"
                    href={`https://maps.apple.com/?q=${encodeURIComponent(project.address)}`}
                    target="_blank" rel="noopener noreferrer"
                  >
                    <Navigation size={13} /> Apple Kaarten
                  </a>
                </>
              )}
              {role === "eigenaar" && (
                <button
                  className="address-edit"
                  onClick={() => {
                    const val = prompt("Werkadres", project.address || "");
                    if (val !== null) updateProject(project.id, (p) => ({ ...p, address: val }));
                  }}
                >
                  Wijzigen
                </button>
              )}
            </div>

            <nav className="tabs">
              {TAB_ORDER.filter(canSeeTab).map((key) => (
                <TabBtn key={key} active={tab === key} onClick={() => setTab(key)} icon={TAB_META[key].icon} label={TAB_META[key].label} />
              ))}
              {role === "eigenaar" && (
                <TabBtn active={tab === "calc"} onClick={() => setTab("calc")} icon={<TrendingUp size={14} />} label="Nacalculatie" />
              )}
              {role !== "team" && (
                <TabBtn active={tab === "klantchat"} onClick={() => setTab("klantchat")} icon={<Lock size={14} />} label="Klant & eigenaar" />
              )}
            </nav>

            <section className="tab-content">
              {tab === "planning" && canSeeTab("planning") && <PlanningTab project={project} updateProject={updateProject} role={role} teamMembers={data.teamMembers} addNotification={addNotification} />}
              {tab === "bouwplanning" && canSeeTab("bouwplanning") && <ScheduleTab project={project} updateProject={updateProject} role={role} teamMembers={data.teamMembers} canEdit={canEditSchedule} addNotification={addNotification} />}
              {tab === "tekeningen" && canSeeTab("tekeningen") && <DrawingsTab project={project} updateProject={updateProject} role={role} currentUser={currentUser} />}
              {tab === "fotos" && canSeeTab("fotos") && <PhotosTab project={project} updateProject={updateProject} role={role} currentUser={currentUser} />}
              {tab === "notities" && canSeeTab("notities") && <NotesTab project={project} updateProject={updateProject} role={role} currentUser={currentUser} />}
              {tab === "chat" && canSeeTab("chat") && <ChatTab project={project} updateProject={updateProject} currentUser={currentUser} />}
              {tab === "opleverpunten" && canSeeTab("opleverpunten") && <CompletionPointsTab project={project} updateProject={updateProject} role={role} teamMembers={data.teamMembers} currentUser={currentUser} addNotification={addNotification} />}
              {tab === "klantkeuzes" && canSeeTab("klantkeuzes") && <ClientChoicesTab project={project} updateProject={updateProject} role={role} />}
              {tab === "meerwerk" && canSeeTab("meerwerk") && <ExtraWorkTab project={project} updateProject={updateProject} role={role} currentUser={currentUser} />}
              {tab === "financieel" && canSeeTab("financieel") && <FinancialTab project={project} updateProject={updateProject} role={role} />}
              {tab === "uren" && canSeeTab("uren") && <HoursTab project={project} updateProject={updateProject} role={role} currentUser={currentUser} />}
              {tab === "veiligheid" && canSeeTab("veiligheid") && <SafetyTab project={project} updateProject={updateProject} role={role} currentUser={currentUser} />}
              {tab === "dossier" && canSeeTab("dossier") && <DossierTab project={project} updateProject={updateProject} role={role} currentUser={currentUser} />}
              {tab === "calc" && role === "eigenaar" && <CalcTab project={project} updateProject={updateProject} />}
              {tab === "klantchat" && role !== "team" && <OwnerClientChatTab project={project} updateProject={updateProject} currentUser={currentUser} />}
            </section>
          </>
        )}
      </main>

      <div className={"save-indicator " + status}>
        {status === "saving" && <><Loader2 className="spin" size={12} /> opslaan…</>}
        {status === "saved" && <>opgeslagen</>}
        {status === "error" && <>opslaan mislukt</>}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }) {
  return (
    <button className={"tab-btn" + (active ? " active" : "")} onClick={onClick}>
      {icon} <span>{label}</span>
    </button>
  );
}

function NewProjectForm({ onAdd, clients, templates }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", clientId: "", address: "", templateId: "", startDate: new Date().toISOString().slice(0, 10) });

  if (!open) {
    return <button className="new-project-toggle" onClick={() => setOpen(true)}><Plus size={14} /> Nieuw project</button>;
  }

  return (
    <div className="new-project-form">
      <input placeholder="Projectnaam" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
        <option value="">— Geen klant —</option>
        {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input placeholder="Werkadres" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      <select value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })}>
        <option value="">Geen sjabloon (leeg project)</option>
        {(templates || []).map((t) => <option key={t.id} value={t.id}>Sjabloon: {t.name}</option>)}
      </select>
      {form.templateId && (
        <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
      )}
      <div className="form-row-btns">
        <button className="btn-primary" onClick={() => { onAdd(form); setForm({ name: "", clientId: "", address: "", templateId: "", startDate: new Date().toISOString().slice(0, 10) }); setOpen(false); }}>Aanmaken</button>
        <button className="btn-ghost" onClick={() => setOpen(false)}>Annuleren</button>
      </div>
    </div>
  );
}

function PermGrid({ perm, onToggle }) {
  return (
    <div className="perm-grid">
      <div className="perm-group">
        {["planning", "bouwplanning"].map((key) => (
          <label key={key} className="perm-checkbox">
            <input type="checkbox" checked={!!perm[key]} onChange={() => onToggle(key)} />
            {TAB_META[key].label}
          </label>
        ))}
      </div>
      {["tekeningen", "fotos", "notities", "chat", "opleverpunten", "klantkeuzes", "meerwerk", "financieel", "dossier"].map((key) => (
        <label key={key} className="perm-checkbox">
          <input type="checkbox" checked={!!perm[key]} onChange={() => onToggle(key)} />
          {TAB_META[key].label}
        </label>
      ))}
    </div>
  );
}

function TeamMemberRow({ member, projects, onUpdate, onRegen, onRemove, copied, onCopy }) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(member.name);
  const isKnownTrade = TRADES.includes(member.trade);
  const [tradeSel, setTradeSel] = useState(isKnownTrade ? member.trade : "Overig");
  const [customTrade, setCustomTrade] = useState(isKnownTrade ? "" : member.trade || "");
  const perm = member.permissions || defaultPermissions();
  const access = member.projectAccess || "all";
  const projectCount = access === "all" ? projects.length : (Array.isArray(access) ? access.length : 0);

  const commitTrade = (sel, custom) => {
    const finalTrade = sel === "Overig" ? (custom || "Overig") : sel;
    onUpdate({ ...member, trade: finalTrade });
  };
  const togglePerm = (key) => onUpdate({ ...member, permissions: { ...perm, [key]: !perm[key] } });
  const toggleAllProjects = () => onUpdate({ ...member, projectAccess: access === "all" ? [] : "all" });
  const toggleProject = (id) => {
    const current = Array.isArray(access) ? access : [];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    onUpdate({ ...member, projectAccess: next });
  };

  return (
    <div className={"access-item team-row" + (expanded ? " expanded" : "")}>
      <button type="button" className="access-summary" onClick={() => setExpanded((v) => !v)}>
        <span className="access-avatar">{(member.name || "?").slice(0, 1).toUpperCase()}</span>
        <span className="access-summary-main">
          <span className="access-summary-name">{member.name}</span>
          <span className="access-summary-sub">{member.trade || "Overig"} · {access === "all" ? "alle projecten" : `${projectCount} project${projectCount === 1 ? "" : "en"}`}</span>
        </span>
        <span className="code-pill mono" onClick={(e) => { e.stopPropagation(); onCopy(member.code, member.id); }}>{member.code} <Copy size={11} /></span>
        {copied === member.id && <span className="copied-tag">gekopieerd</span>}
        <ChevronDown size={14} className={"access-chevron" + (expanded ? " open" : "")} />
      </button>
      {expanded && (
        <div className="access-details">
          <div className="client-row-top">
            <input className="access-name-input" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => onUpdate({ ...member, name })} />
            <select
              value={tradeSel}
              onChange={(e) => { setTradeSel(e.target.value); commitTrade(e.target.value, customTrade); }}
            >
              {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {tradeSel === "Overig" && (
              <input
                className="trade-custom-input"
                placeholder="Functie"
                value={customTrade}
                onChange={(e) => setCustomTrade(e.target.value)}
                onBlur={() => commitTrade("Overig", customTrade)}
              />
            )}
            <button className="icon-btn ghost" title="Nieuwe code genereren" onClick={() => onRegen(member.id)}><RefreshCw size={13} /></button>
            <button className="icon-btn danger ghost" onClick={() => onRemove(member.id)}><Trash2 size={13} /></button>
          </div>
          <PermGrid perm={perm} onToggle={togglePerm} />
          <label className="checkbox-label edit-right">
            <input type="checkbox" checked={!!member.canEditSchedule} onChange={() => onUpdate({ ...member, canEditSchedule: !member.canEditSchedule })} />
            Mag de bouwplanning zelf bewerken (i.p.v. alleen bekijken)
          </label>
          <div className="project-access">
            <label className="checkbox-label">
              <input type="checkbox" checked={access === "all"} onChange={toggleAllProjects} />
              Ziet alle projecten
            </label>
            {access !== "all" && (
              <div className="project-access-list">
                {projects.length === 0 && <span className="empty-hint">Nog geen projecten aangemaakt.</span>}
                {projects.map((p) => (
                  <label key={p.id} className="checkbox-label">
                    <input type="checkbox" checked={Array.isArray(access) && access.includes(p.id)} onChange={() => toggleProject(p.id)} />
                    {p.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ClientRow({ client, onUpdate, onRegen, onRemove, copied, onCopy }) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(client.name);
  const perm = client.permissions || defaultPermissions();
  const permCount = Object.values(perm).filter(Boolean).length;

  const togglePerm = (key) => onUpdate({ ...client, permissions: { ...perm, [key]: !perm[key] } });

  return (
    <div className={"access-item client-row" + (expanded ? " expanded" : "")}>
      <button type="button" className="access-summary" onClick={() => setExpanded((v) => !v)}>
        <span className="access-avatar">{(client.name || "?").slice(0, 1).toUpperCase()}</span>
        <span className="access-summary-main">
          <span className="access-summary-name">{client.name}</span>
          <span className="access-summary-sub">{permCount}/{TAB_ORDER.length} onderdelen zichtbaar</span>
        </span>
        <span className="code-pill mono" onClick={(e) => { e.stopPropagation(); onCopy(client.code, client.id); }}>{client.code} <Copy size={11} /></span>
        {copied === client.id && <span className="copied-tag">gekopieerd</span>}
        <ChevronDown size={14} className={"access-chevron" + (expanded ? " open" : "")} />
      </button>
      {expanded && (
        <div className="access-details">
          <div className="client-row-top">
            <input className="access-name-input" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => onUpdate({ ...client, name })} />
            <button className="icon-btn ghost" title="Nieuwe code genereren" onClick={() => onRegen(client.id)}><RefreshCw size={13} /></button>
            <button className="icon-btn danger ghost" onClick={() => onRemove(client.id)}><Trash2 size={13} /></button>
          </div>
          <PermGrid perm={perm} onToggle={togglePerm} />
          <label className="checkbox-label edit-right">
            <input type="checkbox" checked={!!client.canEditSchedule} onChange={() => onUpdate({ ...client, canEditSchedule: !client.canEditSchedule })} />
            Mag de bouwplanning zelf bewerken (i.p.v. alleen bekijken)
          </label>
        </div>
      )}
    </div>
  );
}

function AccessPanel({ data, setData }) {
  const [ownerCode, setOwnerCode] = useState(data.ownerCode);
  const [newMemberName, setNewMemberName] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [copied, setCopied] = useState("");
  const [subView, setSubView] = useState("team");
  const [teamSearch, setTeamSearch] = useState("");
  const [tradeFilter, setTradeFilter] = useState("");
  const [clientSearch, setClientSearch] = useState("");

  const copy = (text, id) => {
    try { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(""), 1200); } catch (_) {}
  };

  const saveOwnerCode = () => { if (ownerCode.trim()) setData({ ...data, ownerCode: ownerCode.trim().toUpperCase() }); };

  const addMember = () => {
    if (!newMemberName.trim()) return;
    setData({ ...data, teamMembers: [...data.teamMembers, { id: uid(), name: newMemberName.trim(), trade: "Overig", code: genCode(newMemberName), permissions: defaultTeamPermissions(), canEditSchedule: false, projectAccess: "all" }] });
    setNewMemberName("");
  };
  const updateMember = (updated) => setData({ ...data, teamMembers: data.teamMembers.map((m) => (m.id === updated.id ? updated : m)) });
  const regenMember = (id) => setData({ ...data, teamMembers: data.teamMembers.map((m) => (m.id === id ? { ...m, code: genCode(m.name) } : m)) });
  const removeMember = (id) => setData({ ...data, teamMembers: data.teamMembers.filter((m) => m.id !== id) });

  const addClient = () => {
    if (!newClientName.trim()) return;
    setData({ ...data, clients: [...data.clients, { id: uid(), name: newClientName.trim(), code: genCode(newClientName), permissions: defaultClientPermissions(), canEditSchedule: false }] });
    setNewClientName("");
  };
  const updateClient = (updated) => setData({ ...data, clients: data.clients.map((c) => (c.id === updated.id ? updated : c)) });
  const regenClient = (id) => setData({ ...data, clients: data.clients.map((c) => (c.id === id ? { ...c, code: genCode(c.name) } : c)) });
  const removeClient = (id) => setData({
    ...data,
    clients: data.clients.filter((c) => c.id !== id),
    projects: data.projects.map((p) => (p.clientId === id ? { ...p, clientId: null } : p)),
  });

  const trades = Array.from(new Set(data.teamMembers.map((m) => m.trade).filter(Boolean))).sort();
  const filteredTeam = data.teamMembers.filter((m) => {
    const q = teamSearch.trim().toLowerCase();
    const matchesSearch = !q || m.name.toLowerCase().includes(q) || (m.trade || "").toLowerCase().includes(q);
    const matchesTrade = !tradeFilter || m.trade === tradeFilter;
    return matchesSearch && matchesTrade;
  });
  const filteredClients = data.clients.filter((c) => !clientSearch.trim() || c.name.toLowerCase().includes(clientSearch.trim().toLowerCase()));

  return (
    <div className="panel access-panel">
      <div className="hint-bar">
        <ShieldCheck size={14} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
        Deze toegangscodes werken als een praktische sleutel voor je team en klanten, geen zware beveiliging.
        Deel codes alleen met wie ze nodig heeft. Voor echte accountbeveiliging is een productieversie via Claude Code nodig.
      </div>

      <div className="access-block">
        <div className="access-block-title"><Key size={14} /> Jouw eigenaarscode</div>
        <div className="access-row">
          <input className="code-input" value={ownerCode} onChange={(e) => setOwnerCode(e.target.value.toUpperCase())} />
          <button className="btn-primary" onClick={saveOwnerCode}>Opslaan</button>
        </div>
      </div>

      <div className="access-subtabs">
        <button className={"access-subtab" + (subView === "team" ? " active" : "")} onClick={() => setSubView("team")}>
          <Users size={14} /> Team &amp; onderaannemers <span className="count-badge">{data.teamMembers.length}</span>
        </button>
        <button className={"access-subtab" + (subView === "klanten" ? " active" : "")} onClick={() => setSubView("klanten")}>
          <Building2 size={14} /> Klanten <span className="count-badge">{data.clients.length}</span>
        </button>
        <button className={"access-subtab" + (subView === "sjablonen" ? " active" : "")} onClick={() => setSubView("sjablonen")}>
          <CalendarRange size={14} /> Sjablonen <span className="count-badge">{(data.templates || []).length}</span>
        </button>
      </div>

      {subView === "team" ? (
        <div className="access-block">
          <div className="access-search-row">
            <input placeholder="Zoek op naam of functie…" value={teamSearch} onChange={(e) => setTeamSearch(e.target.value)} />
            <select value={tradeFilter} onChange={(e) => setTradeFilter(e.target.value)}>
              <option value="">Alle functies</option>
              {trades.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {filteredTeam.length === 0 && <div className="empty-hint">{data.teamMembers.length === 0 ? "Nog geen teamleden toegevoegd." : "Geen teamleden gevonden."}</div>}
          <div className="access-list">
            {filteredTeam.map((m) => (
              <TeamMemberRow key={m.id} member={m} projects={data.projects} onUpdate={updateMember} onRegen={regenMember} onRemove={removeMember} copied={copied} onCopy={copy} />
            ))}
          </div>
          <div className="access-row">
            <input placeholder="Naam nieuw teamlid / onderaannemer" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} />
            <button className="btn-primary" onClick={addMember}><Plus size={14} /> Toevoegen</button>
          </div>
        </div>
      ) : subView === "klanten" ? (
        <div className="access-block">
          <div className="access-search-row">
            <input placeholder="Zoek op klantnaam…" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
          </div>
          {filteredClients.length === 0 && <div className="empty-hint">{data.clients.length === 0 ? "Nog geen klanten toegevoegd." : "Geen klanten gevonden."}</div>}
          <div className="access-list">
            {filteredClients.map((c) => (
              <ClientRow key={c.id} client={c} onUpdate={updateClient} onRegen={regenClient} onRemove={removeClient} copied={copied} onCopy={copy} />
            ))}
          </div>
          <div className="access-row">
            <input placeholder="Naam nieuwe klant" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} />
            <button className="btn-primary" onClick={addClient}><Plus size={14} /> Toevoegen</button>
          </div>
          <div className="hint-bar small">Koppel een klant aan een project via de dropdown bovenin het projectscherm.</div>
        </div>
      ) : (
        <TemplatesPanel data={data} setData={setData} />
      )}
    </div>
  );
}

function TemplatesPanel({ data, setData }) {
  const [name, setName] = useState("");
  const [phasesText, setPhasesText] = useState("");
  const templates = data.templates || [];

  const addTemplate = () => {
    if (!name.trim() || !phasesText.trim()) return;
    const phases = phasesText.split("\n").map((line) => {
      const [title, days] = line.split(",").map((s) => s.trim());
      return title ? { title, days: Number(days) || 1 } : null;
    }).filter(Boolean);
    if (!phases.length) return;
    setData({ ...data, templates: [...templates, { id: uid(), name: name.trim(), phases }] });
    setName("");
    setPhasesText("");
  };
  const removeTemplate = (id) => setData({ ...data, templates: templates.filter((t) => t.id !== id) });

  return (
    <div className="access-block">
      <div className="access-block-title"><CalendarRange size={14} /> Projectsjablonen</div>
      <div className="hint-bar small">Een sjabloon vult bij een nieuw project automatisch de bouwplanning (en bijbehorende taken) in, op basis van een startdatum die je kiest.</div>
      {templates.length === 0 && <div className="empty-hint">Nog geen sjablonen.</div>}
      <div className="access-list">
        {templates.map((t) => (
          <div key={t.id} className="access-item template-item">
            <span className="access-name">{t.name} <span className="access-name-sub">({t.phases.length} fases, {t.phases.reduce((s, p) => s + (p.days || 0), 0)} dagen totaal)</span></span>
            <button className="icon-btn danger ghost" onClick={() => removeTemplate(t.id)}><Trash2 size={13} /></button>
          </div>
        ))}
      </div>
      <div className="access-row template-form">
        <input placeholder="Naam sjabloon (bv. Dakkapel)" value={name} onChange={(e) => setName(e.target.value)} />
        <textarea
          rows={4}
          placeholder={"Eén fase per regel: Titel, aantal dagen\nbv.\nFundering, 4\nKozijnen plaatsen, 4"}
          value={phasesText}
          onChange={(e) => setPhasesText(e.target.value)}
        />
        <button className="btn-primary" onClick={addTemplate}><Plus size={14} /> Sjabloon opslaan</button>
      </div>
    </div>
  );
}

function PlanningTab({ project, updateProject, role, teamMembers, addNotification }) {
  const [form, setForm] = useState({ title: "", assignee: "", dueDate: "", phaseId: "" });
  const phases = project.schedule || [];

  const findPhaseForDate = (dateStr) => {
    if (!dateStr) return "";
    const t = new Date(dateStr).getTime();
    const hit = phases.find((ph) => t >= new Date(ph.start).getTime() && t <= new Date(ph.end).getTime());
    return hit ? hit.id : "";
  };

  const onPickPhase = (phaseId) => {
    const ph = phases.find((p) => p.id === phaseId);
    setForm((f) => ({
      ...f,
      phaseId,
      dueDate: ph ? (f.dueDate || ph.start) : f.dueDate,
      assignee: ph && !f.assignee ? ph.assignee : f.assignee,
    }));
  };

  const onPickDate = (dueDate) => {
    setForm((f) => ({ ...f, dueDate, phaseId: f.phaseId || findPhaseForDate(dueDate) }));
  };

  const addTask = () => {
    if (!form.title.trim()) return;
    updateProject(project.id, (p) => ({ ...p, tasks: [...p.tasks, { id: uid(), ...form, done: false }] }));
    if (form.assignee) addNotification(form.assignee, `Nieuwe taak toegewezen bij "${project.name}": ${form.title}`);
    setForm({ title: "", assignee: "", dueDate: "", phaseId: "" });
  };
  const toggleTask = (taskId) => updateProject(project.id, (p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) }));
  const removeTask = (taskId) => updateProject(project.id, (p) => ({ ...p, tasks: p.tasks.filter((t) => t.id !== taskId) }));

  const groups = [
    ...phases.map((ph) => ({ id: ph.id, title: ph.title, range: `${fmtDate(ph.start)} – ${fmtDate(ph.end)}` })),
    { id: "", title: "Overig / niet gekoppeld aan een fase", range: "" },
  ];

  return (
    <div className="panel">
      {phases.length > 0 && (
        <div className="hint-bar">Dagplanning is gekoppeld aan de bouwplanning: elke taak hoort bij een fase, zodat je hier het dagelijkse werk ziet en bij Bouwplanning het grote geheel.</div>
      )}
      {project.tasks.length === 0 && <div className="empty-hint">Nog geen taken.</div>}
      {groups.map((g) => {
        const groupTasks = project.tasks.filter((t) => (t.phaseId || "") === g.id).sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));
        if (groupTasks.length === 0) return null;
        return (
          <div key={g.id || "overig"} className="phase-group">
            <div className="phase-group-title">{g.title}{g.range && <span className="mono phase-group-range"> · {g.range}</span>}</div>
            <div className="task-list">
              {groupTasks.map((t) => (
                <div key={t.id} className={"task-row" + (t.done ? " done" : "")}>
                  <button className="task-check" onClick={() => role !== "klant" && toggleTask(t.id)} disabled={role === "klant"}>
                    {t.done ? <CheckCircle2 size={19} /> : <Circle size={19} />}
                  </button>
                  <div className="task-body">
                    <div className="task-title">{t.title}</div>
                    {role !== "klant" && (
                      <div className="task-meta">
                        {t.assignee && <span><Users size={11} /> {t.assignee}</span>}
                        {t.dueDate && <span className="mono">{t.dueDate}</span>}
                      </div>
                    )}
                  </div>
                  {role === "eigenaar" && <button className="icon-btn danger ghost" onClick={() => removeTask(t.id)}><Trash2 size={14} /></button>}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {role !== "klant" && (
        <div className="add-form">
          <div className="add-form-title">Nieuwe taak</div>
          <div className="add-form-grid">
            <input placeholder="Wat moet er gebeuren?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            {phases.length > 0 && (
              <select value={form.phaseId} onChange={(e) => onPickPhase(e.target.value)}>
                <option value="">Geen fase (overig)</option>
                {phases.map((ph) => <option key={ph.id} value={ph.id}>{ph.title}</option>)}
              </select>
            )}
            <AssigneeInput value={form.assignee} onChange={(v) => setForm({ ...form, assignee: v })} teamMembers={teamMembers} />
            <input type="date" value={form.dueDate} onChange={(e) => onPickDate(e.target.value)} />
            <button className="btn-primary" onClick={addTask}><Plus size={14} /> Toevoegen</button>
          </div>
          {phases.length > 0 && <div className="hint-bar small">Kies je eerst een fase of een datum, dan wordt de rest automatisch gekoppeld — je kunt het altijd aanpassen.</div>}
        </div>
      )}
    </div>
  );
}

const DAY_MS = 86400000;
const WEEKDAY_LETTERS = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];

function projectProgress(p) {
  if (p.deliverySignoff) return 100;
  const phases = p.schedule || [];
  if (!phases.length) {
    const total = (p.tasks || []).length;
    const done = (p.tasks || []).filter((t) => t.done).length;
    return total ? Math.round((done / total) * 100) : 0;
  }
  const now = Date.now();
  let weightedSum = 0;
  let totalWeight = 0;
  phases.forEach((ph) => {
    const start = new Date(ph.start).getTime();
    const end = new Date(ph.end).getTime();
    const weight = Math.max(1, Math.round((end - start) / DAY_MS) + 1);
    const linked = (p.tasks || []).filter((t) => t.phaseId === ph.id);
    let ratio;
    if (linked.length) {
      ratio = linked.filter((t) => t.done).length / linked.length;
    } else if (now >= end) {
      ratio = 1;
    } else if (now <= start) {
      ratio = 0;
    } else {
      ratio = (now - start) / Math.max(1, end - start);
    }
    weightedSum += ratio * weight;
    totalWeight += weight;
  });
  return totalWeight ? Math.round((weightedSum / totalWeight) * 100) : 0;
}

function ScheduleTab({ project, updateProject, role, teamMembers, canEdit, addNotification }) {
  const [form, setForm] = useState({ title: "", assignee: "", start: "", end: "" });
  const items = project.schedule || [];
  const tasks = project.tasks || [];

  const addItem = () => {
    if (!form.title.trim() || !form.start || !form.end) return;
    updateProject(project.id, (p) => ({ ...p, schedule: [...(p.schedule || []), { id: uid(), ...form }] }));
    if (form.assignee) addNotification(form.assignee, `Ingepland bij "${project.name}": ${form.title} (${form.start} – ${form.end})`);
    setForm({ title: "", assignee: "", start: "", end: "" });
  };
  const removeItem = (id) => updateProject(project.id, (p) => ({ ...p, schedule: p.schedule.filter((s) => s.id !== id) }));

  let days = [];
  if (items.length) {
    const min = Math.min(...items.map((i) => new Date(i.start).getTime()));
    const max = Math.max(...items.map((i) => new Date(i.end).getTime()));
    for (let t = min; t <= max; t += DAY_MS) days.push(new Date(t));
  }

  return (
    <div className="panel">
      <div className="hint-bar">Bouwplanning — het grote geheel per fase. De taken in "Planning" zijn hieraan gekoppeld en tellen automatisch mee als voortgang.</div>
      {items.length === 0 ? (
        <div className="empty-hint">Nog geen bouwplanning toegevoegd.</div>
      ) : (
        <div className="gantt-scroll">
          <div className="gantt-grid" style={{ gridTemplateColumns: `180px repeat(${days.length}, 30px)` }}>
            <div className="gantt-cell gantt-corner" />
            {days.map((d, idx) => {
              const wd = d.getUTCDay();
              return (
                <div key={idx} className={"gantt-cell gantt-head" + (wd === 0 || wd === 6 ? " weekend" : "")} title={d.toISOString().slice(0, 10)}>
                  <span className="gantt-head-day">{d.getUTCDate()}</span>
                  <span className="gantt-head-wd">{WEEKDAY_LETTERS[wd]}</span>
                </div>
              );
            })}

            {items.map((i) => {
              const start = new Date(i.start).getTime();
              const end = new Date(i.end).getTime();
              const linked = tasks.filter((t) => t.phaseId === i.id);
              const done = linked.filter((t) => t.done).length;
              return (
                <React.Fragment key={i.id}>
                  <div className="gantt-cell gantt-row-label">
                    <div className="gantt-row-title">{i.title}</div>
                    <div className="gantt-row-sub">
                      {i.assignee && <span>{i.assignee}</span>}
                      {linked.length > 0 && <span className="gantt-progress-tag">{done}/{linked.length} taken</span>}
                    </div>
                    {canEdit && <button className="icon-btn danger ghost gantt-row-del" onClick={() => removeItem(i.id)}><Trash2 size={12} /></button>}
                  </div>
                  {days.map((d, idx) => {
                    const t = d.getTime();
                    const filled = t >= start && t <= end;
                    const isFirst = filled && t === start;
                    const isLast = filled && t === end;
                    const wd = d.getUTCDay();
                    return (
                      <div
                        key={idx}
                        className={"gantt-cell gantt-daycell" + (filled ? " filled" : "") + (isFirst ? " first" : "") + (isLast ? " last" : "") + (!filled && (wd === 0 || wd === 6) ? " weekend" : "")}
                        title={filled ? `${i.title}: ${i.start} – ${i.end}` : ""}
                      />
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
      {!canEdit && items.length > 0 && (
        <div className="hint-bar small">Je kunt deze bouwplanning bekijken, maar niet wijzigen.</div>
      )}

      {canEdit && (
        <div className="add-form">
          <div className="add-form-title">Planningsonderdeel toevoegen</div>
          <div className="add-form-grid">
            <input placeholder="Onderdeel (bv. Ruwbouw, Dakbedekking)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <AssigneeInput value={form.assignee} onChange={(v) => setForm({ ...form, assignee: v })} teamMembers={teamMembers} />
            <input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            <input type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
            <button className="btn-primary" onClick={addItem}><Plus size={14} /> Toevoegen</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PhotosTab({ project, updateProject, role, currentUser }) {
  const [form, setForm] = useState({ title: "", category: "tijdens", note: "", fileData: null, fileType: null, fileName: null });
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const CATS = { voor: "Voor uitvoering", tijdens: "Tijdens uitvoering", na: "Na uitvoering", oplevering: "Oplevering" };

  const handlePicked = async (file) => {
    setBusy(true);
    try {
      const result = await processUploadedFile(file);
      setForm((f) => ({ ...f, ...result, title: f.title || file.name.replace(/\.[^.]+$/, "") }));
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  const addPhoto = () => {
    if (!form.title.trim()) return;
    const vis = defaultItemVisibility(role);
    if (role === "eigenaar" && form.shareWithClient) vis.clientVisible = true;
    updateProject(project.id, (p) => ({
      ...p,
      photos: [...(p.photos || []), {
        id: uid(), title: form.title, category: form.category, note: form.note,
        fileData: form.fileData, fileType: form.fileType, fileName: form.fileName,
        uploadedBy: currentUser?.name || "—", uploaderRole: role, date: new Date().toISOString().slice(0, 10),
        ...vis,
      }],
    }));
    setForm({ title: "", category: "tijdens", note: "", fileData: null, fileType: null, fileName: null, shareWithClient: false });
  };
  const removePhoto = (id) => updateProject(project.id, (p) => ({ ...p, photos: p.photos.filter((ph) => ph.id !== id) }));
  const setVisibility = (id, patch) => updateProject(project.id, (p) => ({ ...p, photos: p.photos.map((ph) => (ph.id === id ? { ...ph, ...patch } : ph)) }));

  const list = (project.photos || []).filter((ph) => {
    if (role === "eigenaar") return true;
    if (ph.uploadedBy === currentUser.name) return true;
    if (role === "team") return ph.reviewed && ph.teamVisible;
    return ph.reviewed && ph.clientVisible;
  });

  return (
    <div className="panel">
      <Lightbox src={preview} onClose={() => setPreview(null)} />
      {role !== "eigenaar" && <div className="hint-bar">Wat jij hier toevoegt, deelt de eigenaar pas verder nadat het is bekeken.</div>}
      {list.length === 0 && <div className="empty-hint">Nog geen foto's.</div>}
      <div className="drawing-grid">
        {list.map((ph) => (
          <div key={ph.id} className="drawing-card">
            {ph.fileData ? (
              <button type="button" className="thumb-btn" onClick={() => setPreview(ph.fileData)} title="Openen">
                <img src={ph.fileData} alt="" className="drawing-thumb" />
              </button>
            ) : <div className="drawing-icon"><Camera size={20} /></div>}
            <div className="drawing-body">
              <div className="drawing-title">{ph.title} <span className="vis-pill vis-public">{CATS[ph.category]}</span></div>
              {ph.note && <div className="drawing-note">{ph.note}</div>}
              <div className="drawing-note mono">{ph.uploadedBy} · {ph.date}</div>
              <VisibilityReview item={ph} role={role} onSet={(patch) => setVisibility(ph.id, patch)} />
            </div>
            {role === "eigenaar" && <button className="icon-btn danger ghost" onClick={() => removePhoto(ph.id)}><Trash2 size={14} /></button>}
          </div>
        ))}
      </div>
      <div className="add-form">
        <div className="add-form-title">Foto toevoegen</div>
        <FileCaptureButtons accept="image/*" onPicked={handlePicked} busy={busy} />
        <FilePreview fileData={form.fileData} fileType={form.fileType} fileName={form.fileName} onClear={() => setForm((f) => ({ ...f, fileData: null, fileType: null, fileName: null }))} />
        <div className="add-form-grid">
          <input placeholder="Titel / omschrijving" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input placeholder="Opmerking" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          {role === "eigenaar" && (
            <label className="checkbox-label">
              <input type="checkbox" checked={!!form.shareWithClient} onChange={(e) => setForm({ ...form, shareWithClient: e.target.checked })} />
              Ook zichtbaar voor klant
            </label>
          )}
          <button className="btn-primary" onClick={addPhoto}><Plus size={14} /> Toevoegen</button>
        </div>
      </div>
    </div>
  );
}

function ChatTab({ project, updateProject, currentUser }) {
  const [text, setText] = useState("");
  const messages = project.chatMessages || [];

  const send = () => {
    if (!text.trim()) return;
    updateProject(project.id, (p) => ({ ...p, chatMessages: [...(p.chatMessages || []), { id: uid(), author: currentUser.name, text, date: new Date().toISOString().slice(0, 10) }] }));
    setText("");
  };

  return (
    <div className="panel">
      {messages.length === 0 && <div className="empty-hint">Nog geen berichten.</div>}
      <div className="chat-list">
        {messages.map((m) => (
          <div key={m.id} className={"chat-msg" + (m.author === currentUser.name ? " mine" : "")}>
            <div className="chat-msg-top"><span className="chat-author">{m.author}</span><span className="mono chat-date">{m.date}</span></div>
            <div className="chat-text">{m.text}</div>
          </div>
        ))}
      </div>
      <div className="chat-input-row">
        <input placeholder="Typ een bericht…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
        <button className="btn-primary" onClick={send}><Send size={14} /></button>
      </div>
    </div>
  );
}

function OwnerClientChatTab({ project, updateProject, currentUser }) {
  const [text, setText] = useState("");
  const messages = project.ownerChat || [];

  const send = () => {
    if (!text.trim()) return;
    updateProject(project.id, (p) => ({ ...p, ownerChat: [...(p.ownerChat || []), { id: uid(), author: currentUser.name, text, date: new Date().toISOString().slice(0, 10) }] }));
    setText("");
  };

  return (
    <div className="panel">
      <div className="hint-bar"><Lock size={13} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />Dit gesprek is alleen zichtbaar voor jou en de klant — het team ziet dit niet.</div>
      {messages.length === 0 && <div className="empty-hint">Nog geen berichten.</div>}
      <div className="chat-list">
        {messages.map((m) => (
          <div key={m.id} className={"chat-msg" + (m.author === currentUser.name ? " mine" : "")}>
            <div className="chat-msg-top"><span className="chat-author">{m.author}</span><span className="mono chat-date">{m.date}</span></div>
            <div className="chat-text">{m.text}</div>
          </div>
        ))}
      </div>
      <div className="chat-input-row">
        <input placeholder="Typ een bericht…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
        <button className="btn-primary" onClick={send}><Send size={14} /></button>
      </div>
    </div>
  );
}

function CompletionPointsTab({ project, updateProject, role, teamMembers, currentUser, addNotification }) {
  const [form, setForm] = useState({ description: "", responsible: "", deadline: "" });
  const STAT = { open: "Open", in_behandeling: "In behandeling", gereed: "Gereed", goedgekeurd: "Goedgekeurd" };
  const items = project.completionPoints || [];

  const addPoint = () => {
    if (!form.description.trim()) return;
    updateProject(project.id, (p) => ({ ...p, completionPoints: [...(p.completionPoints || []), { id: uid(), ...form, status: "open" }] }));
    if (form.responsible) addNotification(form.responsible, `Opleverpunt toegewezen bij "${project.name}": ${form.description}${form.deadline ? ` (voor ${form.deadline})` : ""}`);
    setForm({ description: "", responsible: "", deadline: "" });
  };
  const setStatus = (id, status) => updateProject(project.id, (p) => ({ ...p, completionPoints: p.completionPoints.map((c) => (c.id === id ? { ...c, status } : c)) }));
  const removePoint = (id) => updateProject(project.id, (p) => ({ ...p, completionPoints: p.completionPoints.filter((c) => c.id !== id) }));

  return (
    <div className="panel">
      {role === "team" && <div className="hint-bar">Opleverpunten die aan jou zijn toegewezen kun je zelf afvinken zodra ze klaar zijn.</div>}
      {items.length === 0 && <div className="empty-hint">Nog geen opleverpunten.</div>}
      <div className="work-list">
        {items.map((c) => {
          const isMine = role === "team" && c.responsible === currentUser.name;
          const locked = c.status === "goedgekeurd";
          return (
            <div key={c.id} className={"work-row" + (isMine ? " work-mine" : "")}>
              {isMine ? (
                <button className="task-check" onClick={() => !locked && setStatus(c.id, c.status === "gereed" || locked ? "open" : "gereed")} disabled={locked}>
                  {c.status === "gereed" || locked ? <CheckCircle2 size={19} /> : <Circle size={19} />}
                </button>
              ) : (
                <div className="work-type-icon"><ClipboardCheck size={16} /></div>
              )}
              <div className="work-body">
                <div className="work-desc">{c.description}</div>
                <div className="work-sub">{c.responsible && `${c.responsible} · `}{c.deadline && `voor ${c.deadline}`}</div>
              </div>
              {role === "eigenaar" ? (
                <select className="status-select" value={c.status} onChange={(e) => setStatus(c.id, e.target.value)}>
                  {Object.entries(STAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              ) : (
                <span className={"pill pill-" + (c.status === "goedgekeurd" ? "afgerond" : c.status === "gereed" ? "lopend" : "gepland")}>{STAT[c.status]}</span>
              )}
              {role === "klant" && c.status === "gereed" && (
                <button className="btn-primary" onClick={() => setStatus(c.id, "goedgekeurd")}>Goedkeuren</button>
              )}
              {role === "eigenaar" && <button className="icon-btn danger ghost" onClick={() => removePoint(c.id)}><Trash2 size={14} /></button>}
            </div>
          );
        })}
      </div>
      {role === "eigenaar" && (
        <div className="add-form">
          <div className="add-form-title">Opleverpunt toevoegen</div>
          <div className="add-form-grid">
            <input placeholder="Omschrijving" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <AssigneeInput value={form.responsible} onChange={(v) => setForm({ ...form, responsible: v })} teamMembers={teamMembers} />
            <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            <button className="btn-primary" onClick={addPoint}><Plus size={14} /> Toevoegen</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ClientChoicesTab({ project, updateProject, role }) {
  const [form, setForm] = useState({ category: "", description: "", deadline: "" });
  const items = project.clientChoices || [];

  const addChoice = () => {
    if (!form.category.trim()) return;
    updateProject(project.id, (p) => ({ ...p, clientChoices: [...(p.clientChoices || []), { id: uid(), ...form, status: "open" }] }));
    setForm({ category: "", description: "", deadline: "" });
  };
  const markChosen = (id) => updateProject(project.id, (p) => ({ ...p, clientChoices: p.clientChoices.map((c) => (c.id === id ? { ...c, status: "gekozen" } : c)) }));
  const markRejected = (id) => updateProject(project.id, (p) => ({ ...p, clientChoices: p.clientChoices.map((c) => (c.id === id ? { ...c, status: "afgewezen" } : c)) }));
  const removeChoice = (id) => updateProject(project.id, (p) => ({ ...p, clientChoices: p.clientChoices.filter((c) => c.id !== id) }));

  const CHOICE_LABEL = { open: "Open", gekozen: "Gekozen", afgewezen: "Afgewezen" };
  const CHOICE_PILL = { open: "pill-gepland", gekozen: "pill-afgerond", afgewezen: "pill-danger" };

  return (
    <div className="panel">
      {role === "klant" && <div className="hint-bar">Maak hier je keuzes bekend vóór de genoemde deadline.</div>}
      {items.length === 0 && <div className="empty-hint">Nog geen klantkeuzes.</div>}
      <div className="work-list">
        {items.map((c) => (
          <div key={c.id} className="work-row">
            <div className="work-type-icon"><Palette size={16} /></div>
            <div className="work-body">
              <div className="work-desc">{c.category}</div>
              <div className="work-sub">{c.description}{c.deadline && ` · deadline ${c.deadline}`}</div>
            </div>
            <span className={"pill " + CHOICE_PILL[c.status]}>{CHOICE_LABEL[c.status]}</span>
            {role === "klant" && c.status === "open" && (
              <>
                <button className="btn-primary" onClick={() => markChosen(c.id)}>Kies</button>
                <button className="btn-ghost" onClick={() => markRejected(c.id)}>Afwijzen</button>
              </>
            )}
            {role === "eigenaar" && <button className="icon-btn danger ghost" onClick={() => removeChoice(c.id)}><Trash2 size={14} /></button>}
          </div>
        ))}
      </div>
      {role !== "klant" && (
        <div className="add-form">
          <div className="add-form-title">Klantkeuze toevoegen</div>
          <div className="add-form-grid">
            <input placeholder="Categorie (bv. Tegels, Sanitair)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <input placeholder="Toelichting / opties" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            <button className="btn-primary" onClick={addChoice}><Plus size={14} /> Toevoegen</button>
          </div>
        </div>
      )}
    </div>
  );
}

function FinancialTab({ project, updateProject, role }) {
  const [form, setForm] = useState({ title: "", amount: "" });
  const items = project.invoices || [];
  const totaal = items.reduce((s, i) => s + i.amount, 0);
  const betaald = items.filter((i) => i.status === "betaald").reduce((s, i) => s + i.amount, 0);

  const addInvoice = () => {
    if (!form.title.trim() || !form.amount) return;
    updateProject(project.id, (p) => ({ ...p, invoices: [...(p.invoices || []), { id: uid(), title: form.title, amount: Number(form.amount), status: "open" }] }));
    setForm({ title: "", amount: "" });
  };
  const toggleStatus = (id) => updateProject(project.id, (p) => ({ ...p, invoices: p.invoices.map((i) => (i.id === id ? { ...i, status: i.status === "betaald" ? "open" : "betaald" } : i)) }));

  return (
    <div className="panel">
      <div className="netto-bar">
        <div className="netto-item">Totaal gefactureerd <b>{fmtEuro(totaal)}</b></div>
        <div className="netto-item">Betaald <b>{fmtEuro(betaald)}</b></div>
        <div className="netto-item netto-total">Openstaand <b>{fmtEuro(totaal - betaald)}</b></div>
      </div>
      {items.length === 0 && <div className="empty-hint">Nog geen facturen.</div>}
      <div className="work-list">
        {items.map((i) => (
          <div key={i.id} className="work-row">
            <div className="work-type-icon"><Receipt size={16} /></div>
            <div className="work-body"><div className="work-desc">{i.title}</div><div className="work-sub mono">{fmtEuro(i.amount)}</div></div>
            <button className={"stamp stamp-" + (i.status === "betaald" ? "akkoord" : "open")} onClick={() => role === "eigenaar" && toggleStatus(i.id)} disabled={role !== "eigenaar"}>{i.status}</button>
          </div>
        ))}
      </div>
      {role === "eigenaar" && (
        <div className="add-form">
          <div className="add-form-title">Factuur toevoegen</div>
          <div className="add-form-grid">
            <input placeholder="Omschrijving" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input type="number" placeholder="Bedrag €" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <button className="btn-primary" onClick={addInvoice}><Plus size={14} /> Toevoegen</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Dashboard({ data, projects, currentUser, role, onOpenProject }) {
  const today = new Date().toISOString().slice(0, 10);
  const [search, setSearch] = useState("");

  const Card = ({ title, value, sub }) => (
    <div className="dash-card"><div className="dash-card-value">{value}</div><div className="dash-card-title">{title}</div>{sub && <div className="dash-card-sub">{sub}</div>}</div>
  );
  const ListCard = ({ title, items, empty }) => (
    <div className="dash-list-card">
      <div className="dash-list-title">{title}</div>
      {items.length === 0 ? <div className="empty-hint">{empty}</div> : (
        <div className="dash-list">
          {items.map((it, idx) => (
            <button key={idx} className="dash-list-item" onClick={() => onOpenProject(it.projectId, it.tab)}>
              <span>{it.label}</span><span className="dash-list-project mono">{it.projectName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
  const ProjectCard = ({ p }) => {
    const photo = (p.photos || []).filter((ph) => ph.fileData).slice(-1)[0];
    const pct = projectProgress(p);
    const client = data.clients.find((c) => c.id === p.clientId)?.name;
    return (
      <button className="proj-card" onClick={() => onOpenProject(p.id, "planning")}>
        <div className="proj-card-thumb">
          {photo ? <img src={photo.fileData} alt="" /> : <div className="proj-card-thumb-placeholder"><Building2 size={22} /></div>}
        </div>
        <div className="proj-card-body">
          <div className="proj-card-name">{p.name}</div>
          {client && <div className="proj-card-client">{client}</div>}
          <div className="proj-card-progress"><div className="proj-card-progress-fill" style={{ width: pct + "%" }} /></div>
          <div className="proj-card-foot">
            <span className="mono">{pct}%</span>
            <span className={"pill pill-" + p.status}>{STATUS_LABEL[p.status]}</span>
          </div>
        </div>
      </button>
    );
  };

  if (role === "eigenaar") {
    const geplandProjects = projects.filter((p) => p.status === "gepland");
    const lopendProjects = projects.filter((p) => p.status === "lopend");
    const afgerondProjects = projects.filter((p) => p.status === "afgerond");
    const clientName = (p) => data.clients.find((c) => c.id === p.clientId)?.name || "";
    const takenVandaag = projects.flatMap((p) => (p.tasks || []).filter((t) => t.dueDate === today && !t.done).map((t) => ({ label: t.title, projectName: p.name, projectId: p.id, tab: "planning" })));
    const openMeerwerk = projects.flatMap((p) => (p.extraWork || []).filter((w) => w.status === "open").map((w) => ({ label: `${w.description} (${fmtEuro(w.amount)})`, projectName: p.name, projectId: p.id, tab: "meerwerk" })));
    const openOplever = projects.flatMap((p) => (p.completionPoints || []).filter((c) => c.status !== "goedgekeurd").map((c) => ({ label: c.description, projectName: p.name, projectId: p.id, tab: "opleverpunten" })));
    const openKeuzes = projects.flatMap((p) => (p.clientChoices || []).filter((c) => c.status === "open").map((c) => ({ label: c.category, projectName: p.name, projectId: p.id, tab: "klantkeuzes" })));
    const attentionCount = takenVandaag.length + openMeerwerk.length + openOplever.length + openKeuzes.length;
    const q = search.trim().toLowerCase();
    const overviewProjects = [...lopendProjects, ...geplandProjects].filter((p) => !q || p.name.toLowerCase().includes(q) || clientName(p).toLowerCase().includes(q));

    return (
      <div className="dashboard">
        <div className="dash-topbar">
          <div className="dash-search"><Search size={14} /><input placeholder="Zoek een project of klant…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <div className="dash-bell" title={attentionCount > 0 ? `${attentionCount} punten die aandacht nodig hebben` : "Alles is bijgewerkt"}>
            <Bell size={16} />
            {attentionCount > 0 && <span className="dash-bell-badge">{attentionCount}</span>}
          </div>
        </div>

        <div className="dash-cards">
          <Card title="Gepland" value={geplandProjects.length} />
          <Card title="Lopend" value={lopendProjects.length} />
          <Card title="Afgerond" value={afgerondProjects.length} />
          <Card title="Taken vandaag" value={takenVandaag.length} />
          <Card title="Openstaand meerwerk" value={openMeerwerk.length} />
          <Card title="Openstaande opleverpunten" value={openOplever.length} />
        </div>

        <div className="dash-section-title">Projecten overzicht</div>
        {overviewProjects.length === 0 ? (
          <div className="empty-hint">Geen projecten gevonden.</div>
        ) : (
          <div className="proj-card-grid">
            {overviewProjects.map((p) => <ProjectCard key={p.id} p={p} />)}
          </div>
        )}

        <div className="dash-lists">
          <ListCard title={`Afgerond (${afgerondProjects.length})`} items={afgerondProjects.map((p) => ({ label: p.name, projectName: clientName(p), projectId: p.id, tab: "dossier" }))} empty="Nog geen afgeronde projecten." />
          <ListCard title="Taken vandaag" items={takenVandaag} empty="Niets gepland voor vandaag." />
          <ListCard title="Openstaand meerwerk" items={openMeerwerk} empty="Alles is afgehandeld." />
          <ListCard title="Openstaande opleverpunten" items={openOplever} empty="Alle opleverpunten zijn goedgekeurd." />
          <ListCard title="Openstaande klantkeuzes" items={openKeuzes} empty="Geen keuzes in afwachting." />
        </div>
      </div>
    );
  }

  if (role === "team") {
    const mijnTaken = projects.flatMap((p) => (p.tasks || []).filter((t) => t.assignee === currentUser.name && !t.done).map((t) => ({ label: t.title, projectName: p.name, projectId: p.id, tab: "planning" })));
    const mijnPlanning = projects.flatMap((p) => (p.schedule || []).filter((s) => s.assignee === currentUser.name).map((s) => ({ label: `${s.title} (${fmtDate(s.start)} – ${fmtDate(s.end)})`, projectName: p.name, projectId: p.id, tab: "bouwplanning" })));
    return (
      <div className="dashboard">
        <div className="dash-cards"><Card title="Open taken" value={mijnTaken.length} /><Card title="Ingepland" value={mijnPlanning.length} /></div>
        <div className="dash-lists">
          <ListCard title="Mijn openstaande taken" items={mijnTaken} empty="Geen openstaande taken." />
          <ListCard title="Mijn bouwplanning" items={mijnPlanning} empty="Nog niets ingepland." />
        </div>
      </div>
    );
  }

  // klant
  const voortgang = projects.map((p) => ({ p, pct: projectProgress(p) }));
  const openKeuzes = projects.flatMap((p) => (p.clientChoices || []).filter((c) => c.status === "open").map((c) => ({ label: c.category, projectName: p.name, projectId: p.id, tab: "klantkeuzes" })));
  const openMeerwerk = projects.flatMap((p) => (p.extraWork || []).filter((w) => w.status === "open").map((w) => ({ label: `${w.description} (${fmtEuro(w.amount)})`, projectName: p.name, projectId: p.id, tab: "meerwerk" })));
  return (
    <div className="dashboard">
      <div className="dash-cards">
        {voortgang.map(({ p, pct }) => (
          <button key={p.id} className="dash-card dash-card-clickable" onClick={() => onOpenProject(p.id, "bouwplanning")}>
            <div className="dash-card-value">{pct}%</div>
            <div className="dash-card-title">{p.name}</div>
          </button>
        ))}
      </div>
      <div className="dash-lists">
        <ListCard title="Openstaande keuzes" items={openKeuzes} empty="Geen keuzes in afwachting." />
        <ListCard title="Openstaand meerwerk" items={openMeerwerk} empty="Niets openstaand." />
      </div>
    </div>
  );
}

function DrawingsTab({ project, updateProject, role, currentUser }) {
  const [form, setForm] = useState({ title: "", note: "", fileData: null, fileType: null, fileName: null });
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);

  const handlePicked = async (file) => {
    setBusy(true);
    try {
      const result = await processUploadedFile(file);
      setForm((f) => ({ ...f, ...result, title: f.title || file.name.replace(/\.[^.]+$/, "") }));
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  const addDrawing = () => {
    if (!form.title.trim()) return;
    const vis = defaultItemVisibility(role);
    if (role === "eigenaar" && form.shareWithClient) vis.clientVisible = true;
    updateProject(project.id, (p) => ({
      ...p,
      drawings: [...p.drawings, {
        id: uid(), title: form.title, note: form.note,
        fileData: form.fileData, fileType: form.fileType, fileName: form.fileName,
        uploadedBy: currentUser?.name || "Eigenaar", uploaderRole: role,
        ...vis,
      }],
    }));
    setForm({ title: "", note: "", fileData: null, fileType: null, fileName: null, shareWithClient: false });
  };
  const removeDrawing = (id) => updateProject(project.id, (p) => ({ ...p, drawings: p.drawings.filter((d) => d.id !== id) }));
  const setVisibility = (id, patch) => updateProject(project.id, (p) => ({ ...p, drawings: p.drawings.map((d) => (d.id === id ? { ...d, ...patch } : d)) }));

  const list = project.drawings.filter((d) => {
    if (role === "eigenaar") return true;
    if (d.uploadedBy === currentUser.name) return true;
    if (role === "team") return d.reviewed && d.teamVisible;
    return d.reviewed && d.clientVisible;
  });

  return (
    <div className="panel">
      <Lightbox src={preview} onClose={() => setPreview(null)} />
      {role !== "eigenaar" && <div className="hint-bar">Wat jij hier toevoegt, deelt de eigenaar pas verder nadat het is bekeken.</div>}
      {list.length === 0 && <div className="empty-hint">Nog geen tekeningen{role === "klant" ? " gedeeld" : " gekoppeld"}.</div>}
      <div className="drawing-grid">
        {list.map((d) => (
          <div key={d.id} className="drawing-card">
            {d.fileData ? (
              d.fileType === "pdf" ? (
                <a href={d.fileData} target="_blank" rel="noopener noreferrer" className="drawing-icon" title="PDF openen"><FileText size={20} /></a>
              ) : (
                <button type="button" className="thumb-btn" onClick={() => setPreview(d.fileData)} title="Openen">
                  <img src={d.fileData} alt="" className="drawing-thumb" />
                </button>
              )
            ) : (
              <div className="drawing-icon"><ImageIcon size={20} /></div>
            )}
            <div className="drawing-body">
              <div className="drawing-title">{d.title}</div>
              {d.note && <div className="drawing-note">{d.note}</div>}
              {d.uploadedBy && <div className="drawing-note mono">{d.uploadedBy}</div>}
              <VisibilityReview item={d} role={role} onSet={(patch) => setVisibility(d.id, patch)} />
            </div>
            {role === "eigenaar" && <button className="icon-btn danger ghost" onClick={() => removeDrawing(d.id)}><Trash2 size={14} /></button>}
          </div>
        ))}
      </div>
      <div className="add-form">
        <div className="add-form-title">Tekening toevoegen</div>
        <FileCaptureButtons accept="image/*,application/pdf" onPicked={handlePicked} busy={busy} />
        <FilePreview fileData={form.fileData} fileType={form.fileType} fileName={form.fileName} onClear={() => setForm((f) => ({ ...f, fileData: null, fileType: null, fileName: null }))} />
        <div className="add-form-grid">
          <input placeholder="Titel (bv. Plattegrond begane grond v3)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input placeholder="Toelichting" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          {role === "eigenaar" && (
            <label className="checkbox-label">
              <input type="checkbox" checked={!!form.shareWithClient} onChange={(e) => setForm({ ...form, shareWithClient: e.target.checked })} />
              Ook zichtbaar voor klant
            </label>
          )}
          <button className="btn-primary" onClick={addDrawing}><Plus size={14} /> Toevoegen</button>
        </div>
      </div>
    </div>
  );
}

function NotesTab({ project, updateProject, role, currentUser }) {
  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState("team");

  const addNote = () => {
    if (!text.trim()) return;
    const note = {
      id: uid(), text, author: currentUser.name,
      visibility: role === "eigenaar" ? visibility : role === "klant" ? "klant_only" : "team",
      date: new Date().toISOString().slice(0, 10),
    };
    updateProject(project.id, (p) => ({ ...p, notes: [note, ...p.notes] }));
    setText("");
  };
  const removeNote = (id) => updateProject(project.id, (p) => ({ ...p, notes: p.notes.filter((n) => n.id !== id) }));
  const toggleClientNoteSharing = (id) => updateProject(project.id, (p) => ({
    ...p,
    notes: p.notes.map((n) => (n.id === id ? { ...n, visibility: n.visibility === "klant_only" ? "klant" : "klant_only" } : n)),
  }));

  const visible = project.notes.filter((n) => {
    if (role === "eigenaar") return true;
    if (role === "team") return n.visibility !== "prive" && n.visibility !== "klant_only";
    return n.visibility === "klant" || n.visibility === "klant_only";
  });

  return (
    <div className="panel">
      {visible.length === 0 && <div className="empty-hint">Nog geen notities.</div>}
      <div className="note-list">
        {visible.map((n) => (
          <div key={n.id} className="note-card">
            <div className="note-top">
              <span className="note-author">{n.author}</span>
              <span className="mono note-date">{n.date}</span>
              <span className={"vis-pill " + (n.visibility === "prive" || n.visibility === "klant_only" ? "vis-private" : n.visibility === "klant" ? "vis-klant" : "vis-public")}>
                {n.visibility === "prive" || n.visibility === "klant_only" ? <Lock size={11} /> : <Globe size={11} />} {n.visibility === "klant_only" ? "Alleen jij (van klant)" : VIS_LABEL[n.visibility]}
              </span>
              {role === "eigenaar" && (n.visibility === "klant_only" || n.visibility === "klant") && (
                <button className="link-btn" onClick={() => toggleClientNoteSharing(n.id)}>
                  {n.visibility === "klant_only" ? "Deel met team" : "Verberg voor team"}
                </button>
              )}
              {role === "eigenaar" && <button className="icon-btn danger ghost note-del" onClick={() => removeNote(n.id)}><Trash2 size={13} /></button>}
            </div>
            <div className="note-text">{n.text}</div>
          </div>
        ))}
      </div>
      <div className="add-form">
        <div className="add-form-title">Notitie toevoegen</div>
        <textarea rows={3} placeholder="Schrijf een notitie over dit project…" value={text} onChange={(e) => setText(e.target.value)} />
        {role === "klant" && <div className="hint-bar small">Deze notitie zie alleen jij en de eigenaar, tenzij die 'm deelt met het team.</div>}
        <div className="add-form-grid">
          {role === "eigenaar" && (
            <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
              <option value="team">Zichtbaar voor team</option>
              <option value="klant">Zichtbaar voor team + klant</option>
              <option value="prive">Alleen voor mij</option>
            </select>
          )}
          <button className="btn-primary" onClick={addNote}><Plus size={14} /> Toevoegen</button>
        </div>
      </div>
    </div>
  );
}

function applyPhaseShift(schedule, phaseId, days, cutoffISO) {
  const cutoffTime = new Date(cutoffISO).getTime();
  return schedule.map((s) => {
    if (s.id === phaseId) {
      return { ...s, end: new Date(new Date(s.end).getTime() + days * DAY_MS).toISOString().slice(0, 10) };
    }
    if (new Date(s.start).getTime() > cutoffTime) {
      return {
        ...s,
        start: new Date(new Date(s.start).getTime() + days * DAY_MS).toISOString().slice(0, 10),
        end: new Date(new Date(s.end).getTime() + days * DAY_MS).toISOString().slice(0, 10),
      };
    }
    return s;
  });
}

const EXTRAWORK_STATUS_LABEL = { open: "open", akkoord: "akkoord", afgewezen: "afgewezen" };

function ExtraWorkTab({ project, updateProject, role, currentUser }) {
  const [form, setForm] = useState({ type: "meerwerk", description: "", amount: "", extraDays: "", phaseId: "", explanation: "" });
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [signingId, setSigningId] = useState(null);
  const [sigPreview, setSigPreview] = useState(null);
  const phases = project.schedule || [];
  const toggleExplain = (id) => setExpandedIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const addItem = () => {
    if (!form.description.trim() || !form.amount) return;
    const days = form.type === "meerwerk" ? Number(form.extraDays) || 0 : 0;
    if (days > 0 && !form.phaseId) {
      alert("Kies bij welke fase deze extra dagen horen, anders wordt de bouwplanning niet aangepast.");
      return;
    }
    updateProject(project.id, (p) => {
      const targetPhase = days > 0 && form.phaseId ? (p.schedule || []).find((s) => s.id === form.phaseId) : null;
      const newEntry = {
        id: uid(), type: form.type, description: form.description, amount: Number(form.amount), status: "open",
        ...(form.explanation.trim() ? { explanation: form.explanation.trim() } : {}),
        ...(targetPhase ? { extraDays: days, phaseId: form.phaseId, scheduleCutoff: targetPhase.end, scheduleApplied: false } : {}),
      };
      return { ...p, extraWork: [...p.extraWork, newEntry] };
    });
    setForm({ type: "meerwerk", description: "", amount: "", extraDays: "", phaseId: "", explanation: "" });
  };

  const setStatus = (id, newStatus, signatureDataUrl) => updateProject(project.id, (p) => {
    let newSchedule = p.schedule || [];
    const extraWork = p.extraWork.map((w) => {
      if (w.id !== id) return w;
      let scheduleApplied = w.scheduleApplied;
      const hasShift = w.extraDays > 0 && w.phaseId && w.scheduleCutoff;
      if (newStatus === "akkoord" && hasShift && !scheduleApplied) {
        newSchedule = applyPhaseShift(newSchedule, w.phaseId, w.extraDays, w.scheduleCutoff);
        scheduleApplied = true;
      } else if (newStatus !== "akkoord" && hasShift && scheduleApplied) {
        newSchedule = applyPhaseShift(newSchedule, w.phaseId, -w.extraDays, w.scheduleCutoff);
        scheduleApplied = false;
      }
      const base = { ...w, status: newStatus, scheduleApplied };
      if (newStatus === "akkoord") return { ...base, approvedBy: currentUser.name, approvedDate: new Date().toISOString().slice(0, 10), rejectedBy: null, rejectedDate: null, ...(signatureDataUrl ? { signature: signatureDataUrl } : {}) };
      if (newStatus === "afgewezen") return { ...base, rejectedBy: currentUser.name, rejectedDate: new Date().toISOString().slice(0, 10), approvedBy: null, approvedDate: null };
      return { ...base, approvedBy: null, approvedDate: null, rejectedBy: null, rejectedDate: null };
    });
    return { ...p, extraWork, schedule: newSchedule };
  });


  const removeItem = (id) => updateProject(project.id, (p) => ({ ...p, extraWork: p.extraWork.filter((w) => w.id !== id) }));

  const meerwerkAkkoord = project.extraWork.filter((w) => w.type === "meerwerk" && w.status === "akkoord").reduce((s, w) => s + w.amount, 0);
  const minderwerkAkkoord = project.extraWork.filter((w) => w.type === "minderwerk" && w.status === "akkoord").reduce((s, w) => s + w.amount, 0);
  const netto = meerwerkAkkoord - minderwerkAkkoord;

  return (
    <div className="panel">
      {signingId && (
        <SignaturePad
          title="Onderteken om akkoord te bevestigen"
          onCancel={() => setSigningId(null)}
          onSave={(dataUrl) => { setStatus(signingId, "akkoord", dataUrl); setSigningId(null); }}
        />
      )}
      <Lightbox src={sigPreview} onClose={() => setSigPreview(null)} />
      <div className="netto-bar">
        <div className="netto-item"><TrendingUp size={14} /> Meerwerk (akkoord) <b>{fmtEuro(meerwerkAkkoord)}</b></div>
        <div className="netto-item"><TrendingDown size={14} /> Minderwerk (akkoord) <b>{fmtEuro(minderwerkAkkoord)}</b></div>
        <div className="netto-item netto-total">Netto bij te betalen <b>{fmtEuro(netto)}</b></div>
      </div>
      {role === "klant" && <div className="hint-bar">Zodra je een keuze maakt (akkoord of afwijzen), staat dit vast — alleen Van Essen Bouw &amp; Onderhoud kan het daarna nog aanpassen.</div>}
      {project.extraWork.length === 0 && <div className="empty-hint">Nog geen meer- of minderwerk geregistreerd.</div>}
      <div className="work-list">
        {project.extraWork.map((w) => {
          const phase = w.phaseId ? phases.find((ph) => ph.id === w.phaseId) : null;
          return (
            <div key={w.id} className={"work-row work-" + w.type}>
              <div className="work-type-icon">{w.type === "meerwerk" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}</div>
              <div className="work-body">
                <div className="work-desc">{w.description}</div>
                <div className="work-sub mono">{w.type === "meerwerk" ? "+" : "−"} {fmtEuro(w.amount)}</div>
                {w.extraDays > 0 && (
                  <div className="work-sub">
                    +{w.extraDays} {w.extraDays === 1 ? "dag" : "dagen"} extra{phase ? ` bij ${phase.title}` : ""} — {w.scheduleApplied ? "bouwplanning aangepast" : "bouwplanning past pas aan na akkoord van de klant"}
                  </div>
                )}
                {w.status === "akkoord" && w.approvedBy && (
                  <div className="work-sub sig-line">
                    Akkoord door {w.approvedBy} op {w.approvedDate}
                    {w.signature && (
                      <button type="button" className="sig-thumb-btn" onClick={() => setSigPreview(w.signature)} title="Handtekening bekijken">
                        <img src={w.signature} alt="Handtekening" className="sig-thumb" />
                      </button>
                    )}
                  </div>
                )}
                {w.status === "afgewezen" && w.rejectedBy && (
                  <div className="work-sub">Afgewezen door {w.rejectedBy} op {w.rejectedDate}</div>
                )}
                {w.explanation && (
                  <button type="button" className="explain-toggle" onClick={() => toggleExplain(w.id)}>
                    <ChevronDown size={12} className={expandedIds.has(w.id) ? "open" : ""} /> Toelichting
                  </button>
                )}
                {w.explanation && expandedIds.has(w.id) && <div className="work-explanation">{w.explanation}</div>}
              </div>
              {role === "eigenaar" ? (
                <select className="status-select" value={w.status} onChange={(e) => setStatus(w.id, e.target.value)}>
                  <option value="open">Open</option>
                  <option value="akkoord">Akkoord</option>
                  <option value="afgewezen">Afgewezen</option>
                </select>
              ) : role === "klant" && w.status === "open" ? (
                <div className="choice-btns">
                  <button className="btn-primary" onClick={() => setSigningId(w.id)}>Akkoord</button>
                  <button className="btn-ghost" onClick={() => setStatus(w.id, "afgewezen")}>Afwijzen</button>
                </div>
              ) : (
                <span className={"stamp stamp-" + w.status}>{EXTRAWORK_STATUS_LABEL[w.status]}</span>
              )}
              {role === "eigenaar" && <button className="icon-btn danger ghost" onClick={() => removeItem(w.id)}><Trash2 size={14} /></button>}
            </div>
          );
        })}
      </div>
      {role !== "klant" && (
        <div className="add-form">
          <div className="add-form-title">Meer- of minderwerk toevoegen</div>
          <div className="add-form-grid">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="meerwerk">Meerwerk</option>
              <option value="minderwerk">Minderwerk</option>
            </select>
            <input placeholder="Omschrijving" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <input type="number" placeholder="Bedrag €" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <textarea rows={2} placeholder="Korte toelichting voor de klant (optioneel)" value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} />
            {role === "eigenaar" && form.type === "meerwerk" && phases.length > 0 && (
              <>
                <input type="number" min="0" placeholder="Extra dagen (optioneel)" value={form.extraDays} onChange={(e) => setForm({ ...form, extraDays: e.target.value })} />
                {Number(form.extraDays) > 0 && (
                  <select value={form.phaseId} onChange={(e) => setForm({ ...form, phaseId: e.target.value })}>
                    <option value="">Bij welke fase?</option>
                    {phases.map((ph) => <option key={ph.id} value={ph.id}>{ph.title}</option>)}
                  </select>
                )}
              </>
            )}
            <button className="btn-primary" onClick={addItem}><Plus size={14} /> Toevoegen</button>
          </div>
          {role === "eigenaar" && form.type === "meerwerk" && phases.length > 0 && Number(form.extraDays) > 0 && (
            <div className="hint-bar small">Zodra de klant akkoord geeft, wordt de gekozen fase met {form.extraDays} dagen verlengd en schuiven latere fases automatisch mee. Wijst de klant af, dan verandert er niets aan de planning.</div>
          )}
        </div>
      )}
    </div>
  );
}

function CalcTab({ project, updateProject }) {
  const meerwerkAkkoord = project.extraWork.filter((w) => w.type === "meerwerk" && w.status === "akkoord").reduce((s, w) => s + w.amount, 0);
  const minderwerkAkkoord = project.extraWork.filter((w) => w.type === "minderwerk" && w.status === "akkoord").reduce((s, w) => s + w.amount, 0);
  const begroot = Number(project.calc.begroot) || 0;
  const werkelijk = Number(project.calc.werkelijk) || 0;
  const aangepasteBegroting = begroot + meerwerkAkkoord - minderwerkAkkoord;
  const marge = aangepasteBegroting - werkelijk;
  const margePct = aangepasteBegroting ? (marge / aangepasteBegroting) * 100 : 0;
  const setCalc = (field, value) => updateProject(project.id, (p) => ({ ...p, calc: { ...p.calc, [field]: value } }));

  return (
    <div className="panel">
      <div className="calc-grid">
        <label className="calc-field"><span>Begroot (oorspronkelijke calculatie)</span><input type="number" value={project.calc.begroot} onChange={(e) => setCalc("begroot", e.target.value)} /></label>
        <label className="calc-field"><span>Werkelijke kosten tot nu toe</span><input type="number" value={project.calc.werkelijk} onChange={(e) => setCalc("werkelijk", e.target.value)} /></label>
      </div>
      <div className="calc-summary">
        <div className="calc-line"><span>Oorspronkelijk begroot</span><span className="mono">{fmtEuro(begroot)}</span></div>
        <div className="calc-line"><span>+ Meerwerk (akkoord)</span><span className="mono">{fmtEuro(meerwerkAkkoord)}</span></div>
        <div className="calc-line"><span>− Minderwerk (akkoord)</span><span className="mono">{fmtEuro(minderwerkAkkoord)}</span></div>
        <div className="calc-line calc-line-strong"><span>Aangepaste begroting</span><span className="mono">{fmtEuro(aangepasteBegroting)}</span></div>
        <div className="calc-line"><span>Werkelijke kosten</span><span className="mono">{fmtEuro(werkelijk)}</span></div>
        <div className={"calc-line calc-line-marge " + (marge >= 0 ? "pos" : "neg")}><span>Marge</span><span className="mono">{fmtEuro(marge)} ({margePct.toFixed(1)}%)</span></div>
      </div>
      <div className="hint-bar small">Totaal geregistreerde uren op dit project: {(project.hours || []).reduce((s, h) => s + h.hours, 0)} uur (zie tabblad Uren).</div>
    </div>
  );
}

function HoursTab({ project, updateProject, role, currentUser }) {
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), hours: "", note: "" });
  const entries = project.hours || [];

  const addEntry = () => {
    const h = Number(form.hours);
    if (!h || h <= 0) return;
    updateProject(project.id, (p) => ({ ...p, hours: [...(p.hours || []), { id: uid(), teamMember: currentUser.name, date: form.date, hours: h, note: form.note }] }));
    setForm({ date: new Date().toISOString().slice(0, 10), hours: "", note: "" });
  };
  const removeEntry = (id) => updateProject(project.id, (p) => ({ ...p, hours: (p.hours || []).filter((h) => h.id !== id) }));

  const totals = {};
  entries.forEach((h) => { totals[h.teamMember] = (totals[h.teamMember] || 0) + h.hours; });
  const grandTotal = entries.reduce((s, h) => s + h.hours, 0);
  const visibleEntries = role === "eigenaar" ? entries : entries.filter((h) => h.teamMember === currentUser.name);

  return (
    <div className="panel">
      {role === "eigenaar" && Object.keys(totals).length > 0 && (
        <div className="netto-bar">
          {Object.entries(totals).map(([name, total]) => (
            <div key={name} className="netto-item">{name} <b>{total} uur</b></div>
          ))}
          <div className="netto-item netto-total">Totaal <b>{grandTotal} uur</b></div>
        </div>
      )}
      {role === "klant" && <div className="hint-bar">Overzicht van geregistreerde arbeidsuren op dit project.</div>}
      {visibleEntries.length === 0 && <div className="empty-hint">Nog geen uren geregistreerd.</div>}
      <div className="work-list">
        {[...visibleEntries].reverse().map((h) => (
          <div key={h.id} className="work-row">
            <div className="work-type-icon"><Clock size={16} /></div>
            <div className="work-body">
              <div className="work-desc">{h.teamMember} · {h.hours} uur</div>
              <div className="work-sub mono">{h.date}{h.note ? ` · ${h.note}` : ""}</div>
            </div>
            {(role === "eigenaar" || h.teamMember === currentUser.name) && (
              <button className="icon-btn danger ghost" onClick={() => removeEntry(h.id)}><Trash2 size={14} /></button>
            )}
          </div>
        ))}
      </div>
      {role !== "klant" && (
        <div className="add-form">
          <div className="add-form-title">Uren registreren</div>
          <div className="add-form-grid">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <input type="number" step="0.5" min="0" placeholder="Aantal uren" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
            <input placeholder="Opmerking (optioneel)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            <button className="btn-primary" onClick={addEntry}><Plus size={14} /> Toevoegen</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SafetyTab({ project, updateProject, role, currentUser }) {
  const items = (project.safetyChecklist && project.safetyChecklist.length)
    ? project.safetyChecklist
    : DEFAULT_SAFETY_ITEMS.map((text, idx) => ({ id: `default-${idx}`, text }));
  const logs = project.safetyLogs || [];
  const today = new Date().toISOString().slice(0, 10);
  const [checked, setChecked] = useState(new Set());
  const [newItemText, setNewItemText] = useState("");

  const alreadyLoggedToday = logs.some((l) => l.date === today && l.teamMember === currentUser.name);
  const toggleCheck = (id) => setChecked((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const submitToday = () => {
    if (checked.size !== items.length) { alert("Vink eerst alle punten af voordat je bevestigt."); return; }
    updateProject(project.id, (p) => ({
      ...p,
      safetyChecklist: items,
      safetyLogs: [...(p.safetyLogs || []), { id: uid(), date: today, teamMember: currentUser.name, time: new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }) }],
    }));
    setChecked(new Set());
  };

  const addChecklistItem = () => {
    if (!newItemText.trim()) return;
    updateProject(project.id, (p) => ({ ...p, safetyChecklist: [...items, { id: uid(), text: newItemText.trim() }] }));
    setNewItemText("");
  };
  const removeChecklistItem = (id) => updateProject(project.id, (p) => ({ ...p, safetyChecklist: items.filter((i) => i.id !== id) }));

  if (role === "team") {
    return (
      <div className="panel">
        {alreadyLoggedToday ? (
          <div className="hint-bar"><ShieldCheck size={14} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} /> Je hebt de veiligheidscheck voor vandaag al bevestigd.</div>
        ) : (
          <>
            <div className="hint-bar">Loop de checklist na voordat je begint met werken.</div>
            <div className="task-list">
              {items.map((it) => (
                <div key={it.id} className="task-row">
                  <button className="task-check" onClick={() => toggleCheck(it.id)}>
                    {checked.has(it.id) ? <CheckCircle2 size={19} /> : <Circle size={19} />}
                  </button>
                  <div className="task-body"><div className="task-title">{it.text}</div></div>
                </div>
              ))}
            </div>
            <button className="btn-primary" onClick={submitToday}><ShieldCheck size={14} /> Bevestig veiligheidscheck voor vandaag</button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="panel">
      {role === "eigenaar" && (
        <>
          <div className="add-form-title">Checklist-items</div>
          <div className="task-list">
            {items.map((it) => (
              <div key={it.id} className="task-row">
                <div className="task-body"><div className="task-title">{it.text}</div></div>
                <button className="icon-btn danger ghost" onClick={() => removeChecklistItem(it.id)}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <div className="add-form">
            <div className="add-form-grid">
              <input placeholder="Nieuw checklist-item" value={newItemText} onChange={(e) => setNewItemText(e.target.value)} />
              <button className="btn-primary" onClick={addChecklistItem}><Plus size={14} /> Toevoegen</button>
            </div>
          </div>
        </>
      )}
      <div className="add-form-title" style={{ marginTop: 14 }}>Bevestigingen</div>
      {logs.length === 0 ? <div className="empty-hint">Nog geen bevestigingen.</div> : (
        <div className="work-list">
          {[...logs].reverse().map((l) => (
            <div key={l.id} className="work-row">
              <div className="work-type-icon"><ShieldCheck size={16} /></div>
              <div className="work-body"><div className="work-desc">{l.teamMember}</div><div className="work-sub mono">{l.date} · {l.time}</div></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const WARRANTY_UNIT_LABELS = { weken: ["week", "weken"], maanden: ["maand", "maanden"], jaren: ["jaar", "jaar"] };
const formatWarrantyTerm = (amount, unit) => {
  const [singular, plural] = WARRANTY_UNIT_LABELS[unit] || [unit, unit];
  return `${amount} ${amount === 1 ? singular : plural}`;
};

function DossierTab({ project, updateProject, role, currentUser }) {
  const [warrantyItem, setWarrantyItem] = useState("");
  const [warrantyAmount, setWarrantyAmount] = useState(1);
  const [warrantyUnit, setWarrantyUnit] = useState("jaren");
  const [deliveryDate, setDeliveryDate] = useState(project.deliveryDate || "");
  const [signing, setSigning] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => { setDeliveryDate(project.deliveryDate || ""); }, [project.deliveryDate]);

  const points = project.completionPoints || [];
  const approvedPoints = points.filter((c) => c.status === "goedgekeurd");
  const openPoints = points.filter((c) => c.status !== "goedgekeurd");
  const oplevFotos = (project.photos || []).filter((ph) => ph.category === "oplevering");
  const drawings = project.drawings || [];
  const meerwerkAkkoord = (project.extraWork || []).filter((w) => w.type === "meerwerk" && w.status === "akkoord").reduce((s, w) => s + w.amount, 0);
  const minderwerkAkkoord = (project.extraWork || []).filter((w) => w.type === "minderwerk" && w.status === "akkoord").reduce((s, w) => s + w.amount, 0);
  const begroot = Number(project.calc?.begroot) || 0;
  const eindtotaal = begroot + meerwerkAkkoord - minderwerkAkkoord;
  const totalHours = (project.hours || []).reduce((s, h) => s + h.hours, 0);
  const warrantyItems = project.warrantyItems || [];
  const isReady = openPoints.length === 0;
  const isSigned = !!project.deliverySignoff;

  const saveDeliveryDate = () => updateProject(project.id, (p) => ({ ...p, deliveryDate }));
  const addWarrantyItem = () => {
    if (!warrantyItem.trim()) return;
    updateProject(project.id, (p) => ({ ...p, warrantyItems: [...(p.warrantyItems || []), { id: uid(), item: warrantyItem.trim(), amount: Number(warrantyAmount) || 0, unit: warrantyUnit }] }));
    setWarrantyItem("");
    setWarrantyAmount(1);
    setWarrantyUnit("jaren");
  };
  const removeWarrantyItem = (id) => updateProject(project.id, (p) => ({ ...p, warrantyItems: (p.warrantyItems || []).filter((w) => w.id !== id) }));
  const signOff = (dataUrl) => {
    updateProject(project.id, (p) => ({ ...p, status: "afgerond", deliverySignoff: { dataUrl, signedBy: currentUser.name, signedDate: new Date().toISOString().slice(0, 10) } }));
    setSigning(false);
  };

  const openDossierWindow = () => {
    const w = window.open("", "_blank");
    if (!w) {
      alert("Kon geen nieuw tabblad openen. Sta pop-ups toe voor deze pagina en probeer het opnieuw.");
      return;
    }
    w.document.write(buildDossierHtml(project, points, oplevFotos, warrantyItems, meerwerkAkkoord, minderwerkAkkoord, begroot, eindtotaal));
    w.document.close();
  };

  return (
    <div className="panel">
      {signing && (
        <SignaturePad title="Onderteken voor akkoord oplevering" onCancel={() => setSigning(false)} onSave={signOff} />
      )}
      <Lightbox src={preview} onClose={() => setPreview(null)} />

      <div className={"dossier-status " + (isSigned ? "signed" : isReady ? "ready" : "pending")}>
        {isSigned ? (
          <><CheckCircle2 size={16} /> Opgeleverd en ondertekend door {project.deliverySignoff.signedBy} op {project.deliverySignoff.signedDate}</>
        ) : isReady ? (
          <><ShieldCheck size={16} /> Alle opleverpunten zijn afgerond — klaar voor ondertekening</>
        ) : (
          <><ClipboardCheck size={16} /> Nog {openPoints.length} openstaand opleverpunt{openPoints.length === 1 ? "" : "en"}</>
        )}
      </div>
      {isSigned && (
        <div className="hint-bar no-print"><Lock size={13} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />Het dossier is ondertekend en daarmee vergrendeld — de opleverdatum en garantie-items kunnen niet meer worden aangepast, door niemand.</div>
      )}

      <div className="dash-cards">
        <div className="dash-card"><div className="dash-card-value">{approvedPoints.length}/{points.length || 0}</div><div className="dash-card-title">Opleverpunten afgerond</div></div>
        <div className="dash-card"><div className="dash-card-value">{oplevFotos.length}</div><div className="dash-card-title">Opleverfoto's</div></div>
        <div className="dash-card"><div className="dash-card-value">{drawings.length}</div><div className="dash-card-title">Tekeningen</div></div>
        <div className="dash-card"><div className="dash-card-value">{totalHours}</div><div className="dash-card-title">Uren besteed</div></div>
      </div>

      <div className="access-block no-print">
        <div className="access-block-title"><CalendarRange size={14} /> Opleverdatum</div>
        {role === "eigenaar" && !isSigned ? (
          <div className="access-row">
            <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            <button className="btn-primary" onClick={saveDeliveryDate}>Opslaan</button>
          </div>
        ) : (
          <div className="work-sub">{project.deliveryDate || "Nog niet vastgesteld"}</div>
        )}
      </div>

      {points.length > 0 && (
        <div className="access-block">
          <div className="access-block-title"><ClipboardCheck size={14} /> Opleverpunten</div>
          <div className="work-list">
            {points.map((c) => (
              <div key={c.id} className="work-row">
                <div className="work-type-icon">{c.status === "goedgekeurd" ? <CheckCircle2 size={16} /> : <Circle size={16} />}</div>
                <div className="work-body">
                  <div className="work-desc">{c.description}</div>
                  <div className="work-sub">{c.responsible && `${c.responsible} · `}{c.status === "goedgekeurd" ? "Goedgekeurd" : c.deadline ? `Deadline ${c.deadline}` : "Open"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {oplevFotos.length > 0 && (
        <div className="access-block">
          <div className="access-block-title"><Camera size={14} /> Opleverfoto's</div>
          <div className="drawing-grid">
            {oplevFotos.map((ph) => (
              <div key={ph.id} className="drawing-card">
                {ph.fileData ? (
                  <button type="button" className="thumb-btn" onClick={() => setPreview(ph.fileData)}>
                    <img src={ph.fileData} alt="" className="drawing-thumb" />
                  </button>
                ) : <div className="drawing-icon"><Camera size={20} /></div>}
                <div className="drawing-body"><div className="drawing-title">{ph.title}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="access-block">
        <div className="access-block-title"><Euro size={14} /> Financiële samenvatting</div>
        <div className="calc-summary">
          <div className="calc-line"><span>Oorspronkelijke offerte</span><span className="mono">{fmtEuro(begroot)}</span></div>
          <div className="calc-line"><span>Meerwerk (akkoord)</span><span className="mono">{fmtEuro(meerwerkAkkoord)}</span></div>
          <div className="calc-line"><span>Minderwerk (akkoord)</span><span className="mono">{fmtEuro(minderwerkAkkoord)}</span></div>
          <div className="calc-line calc-line-strong"><span>Eindtotaal</span><span className="mono">{fmtEuro(eindtotaal)}</span></div>
        </div>
      </div>

      <div className="access-block">
        <div className="access-block-title"><ShieldCheck size={14} /> Garantie</div>
        {warrantyItems.length === 0 && <div className="empty-hint">Nog geen garantie-items toegevoegd.</div>}
        <div className="access-list">
          {warrantyItems.map((w) => (
            <div key={w.id} className="access-item">
              <span className="access-name">{w.item}</span>
              <span className="pill pill-lopend">{formatWarrantyTerm(w.amount ?? w.months ?? 0, w.unit || "maanden")}</span>
              {role === "eigenaar" && !isSigned && <button className="icon-btn danger ghost" onClick={() => removeWarrantyItem(w.id)}><Trash2 size={13} /></button>}
            </div>
          ))}
        </div>
        {role === "eigenaar" && !isSigned && (
          <div className="access-row no-print">
            <input placeholder="Onderdeel (bv. Dakbedekking)" value={warrantyItem} onChange={(e) => setWarrantyItem(e.target.value)} />
            <input type="number" min="0" style={{ width: 70 }} value={warrantyAmount} onChange={(e) => setWarrantyAmount(e.target.value)} />
            <select value={warrantyUnit} onChange={(e) => setWarrantyUnit(e.target.value)}>
              <option value="weken">weken</option>
              <option value="maanden">maanden</option>
              <option value="jaren">jaren</option>
            </select>
            <button className="btn-primary" onClick={addWarrantyItem}><Plus size={14} /> Toevoegen</button>
          </div>
        )}
      </div>

      <div className="access-block no-print">
        <div className="access-block-title"><Lock size={14} /> Afronding</div>
        {isSigned ? (
          <div className="sig-line">
            <span className="work-sub">Ondertekend door {project.deliverySignoff.signedBy} op {project.deliverySignoff.signedDate}</span>
            <button type="button" className="sig-thumb-btn" onClick={() => setPreview(project.deliverySignoff.dataUrl)}>
              <img src={project.deliverySignoff.dataUrl} alt="Handtekening" className="sig-thumb" />
            </button>
          </div>
        ) : role === "klant" ? (
          isReady ? (
            <button className="btn-primary" onClick={() => setSigning(true)}>Onderteken voor akkoord oplevering</button>
          ) : (
            <div className="hint-bar small">Zodra alle opleverpunten zijn afgerond, kun je hier de oplevering ondertekenen.</div>
          )
        ) : (
          <div className="hint-bar small">De klant kan hier tekenen zodra alle opleverpunten zijn afgerond.</div>
        )}
      </div>

      <button className="btn-ghost no-print" onClick={openDossierWindow}>Openen om te printen / als PDF op te slaan</button>
    </div>
  );
}

function buildDossierHtml(project, points, oplevFotos, warrantyItems, meerwerkAkkoord, minderwerkAkkoord, begroot, eindtotaal) {
  const esc = (s) => (s || "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const pointsHtml = points.length
    ? points.map((c) => `<div style="padding:6px 0;border-bottom:1px solid #eee;">${c.status === "goedgekeurd" ? "&#9989;" : "&#11036;"} ${esc(c.description)}${c.responsible ? " — " + esc(c.responsible) : ""}</div>`).join("")
    : "<p>Geen opleverpunten.</p>";
  const photosHtml = oplevFotos.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:14px;">${oplevFotos.map((ph) => ph.fileData ? `<div style="width:200px;"><img src="${ph.fileData}" style="width:100%;border-radius:6px;border:1px solid #ccc;" /><div style="font-size:12px;color:#555;margin-top:4px;">${esc(ph.title)}</div></div>` : "").join("")}</div>`
    : "<p>Geen opleverfoto's.</p>";
  const warrantyHtml = warrantyItems.length
    ? warrantyItems.map((w) => `<div style="padding:4px 0;">${esc(w.item)} — ${esc(formatWarrantyTerm(w.amount ?? w.months ?? 0, w.unit || "maanden"))}</div>`).join("")
    : "<p>Geen garantie-items vastgelegd.</p>";
  const sigHtml = project.deliverySignoff
    ? `<p>Ondertekend door ${esc(project.deliverySignoff.signedBy)} op ${project.deliverySignoff.signedDate}</p><img src="${project.deliverySignoff.dataUrl}" style="height:60px;border:1px solid #ccc;border-radius:4px;" />`
    : "<p>Nog niet ondertekend.</p>";

  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Opleverdossier — ${esc(project.name)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 30px 40px; max-width: 720px; margin: 0 auto; line-height: 1.5; }
  h1 { font-size: 21px; margin-bottom: 4px; }
  h2 { font-size: 14px; margin-top: 26px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  .meta { color: #555; font-size: 13px; }
  .print-btn { margin-bottom: 24px; padding: 9px 16px; font-size: 13px; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style>
</head><body>
  <button class="print-btn" onclick="window.print()">Afdrukken / opslaan als PDF</button>
  <h1>Opleverdossier — ${esc(project.name)}</h1>
  <div class="meta">${esc(project.address || "")}<br/>Opleverdatum: ${esc(project.deliveryDate || "nog niet vastgesteld")}</div>
  <h2>Opleverpunten</h2>${pointsHtml}
  <h2>Opleverfoto's</h2>${photosHtml}
  <h2>Financieel</h2><p>Oorspronkelijke offerte: ${fmtEuro(begroot)}<br/>Meerwerk akkoord: ${fmtEuro(meerwerkAkkoord)}<br/>Minderwerk akkoord: ${fmtEuro(minderwerkAkkoord)}<br/><b>Eindtotaal: ${fmtEuro(eindtotaal)}</b></p>
  <h2>Garantie</h2>${warrantyHtml}
  <h2>Ondertekening</h2>${sigHtml}
</body></html>`;
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800;900&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

:root {
  --bg: #050505;
  --panel: #121316;
  --panel-2: #1a1c20;
  --border: #2a2d32;
  --brand: #3aa9db;
  --brand-dim: #1c4c63;
  --success: #4caf7d;
  --danger: #d1554a;
  --text: #f2f3f4;
  --text-dim: #a3a8ad;
  --text-faint: #6c7075;
  --font-display: 'Montserrat', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
}
* { box-sizing: border-box; }

.app-shell { font-family: var(--font-body); background: var(--bg); color: var(--text); min-height: 640px; display: grid; grid-template-columns: 260px 1fr; position: relative; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); }
.app-loading, .login-shell { display: flex; align-items: center; justify-content: center; min-height: 500px; background: var(--bg); color: var(--text-dim); font-family: var(--font-body); border-radius: 8px; gap: 10px; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.login-shell { flex-direction: column; padding: 30px; }
.login-card { display: flex; flex-direction: column; align-items: center; gap: 14px; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 40px 36px; max-width: 360px; width: 100%; text-align: center; }
.login-title { font-family: var(--font-display); font-weight: 800; font-size: 15px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--brand); margin-top: 4px; }
.login-copy { color: var(--text-dim); font-size: 13px; margin: 0; line-height: 1.5; }
.login-form { display: flex; gap: 8px; width: 100%; margin-top: 6px; }
.login-form input { flex: 1; background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 10px 12px; border-radius: 6px; font-family: var(--font-mono); letter-spacing: 0.08em; text-align: center; font-size: 13px; text-transform: uppercase; }
.login-error { color: var(--danger); font-size: 12px; }
.login-hint { color: var(--text-faint); font-size: 11px; line-height: 1.5; margin-top: 6px; }

.brandmark { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
.brandmark.large { align-items: center; }
.brandmark-name { font-family: var(--font-display); font-weight: 800; font-size: 20px; letter-spacing: 0.01em; line-height: 1; }
.brandmark.large .brandmark-name { font-size: 30px; }
.bm-van { color: var(--brand); }
.bm-essen { color: var(--text); }
.bm-sub { font-family: var(--font-display); font-weight: 700; font-size: 9px; letter-spacing: 0.14em; color: var(--brand); }
.brandmark.large .bm-sub { font-size: 11px; }

.mobile-bar { display: none; }
.sidebar { background: var(--panel); border-right: 1px solid var(--border); padding: 18px 14px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }

.new-project-toggle { display: flex; align-items: center; gap: 6px; background: transparent; border: 1px dashed var(--border); color: var(--text-dim); padding: 9px 10px; border-radius: 6px; font-size: 12.5px; cursor: pointer; font-family: var(--font-body); }
.new-project-toggle:hover { border-color: var(--brand); color: var(--text); }
.new-project-form { display: flex; flex-direction: column; gap: 6px; background: var(--panel-2); padding: 10px; border-radius: 6px; border: 1px solid var(--border); }
.new-project-form input, .new-project-form select { background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 7px 8px; border-radius: 4px; font-size: 12.5px; font-family: var(--font-body); }
.form-row-btns { display: flex; gap: 6px; margin-top: 2px; }

.project-list { display: flex; flex-direction: column; gap: 6px; flex: 1; }
.empty-hint { color: var(--text-faint); font-size: 12.5px; padding: 10px 2px; line-height: 1.5; }
.project-item { text-align: left; background: transparent; border: 1px solid transparent; border-radius: 8px; padding: 8px; cursor: pointer; color: var(--text); display: flex; align-items: center; gap: 10px; }
.project-item:hover { background: var(--panel-2); }
.project-item.active { background: var(--panel-2); border-color: var(--brand-dim); }
.project-item-thumb { width: 38px; height: 38px; border-radius: 6px; overflow: hidden; background: var(--panel-2); flex-shrink: 0; }
.project-item-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.project-item-thumb-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-faint); }
.project-item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.project-item-name { font-size: 12.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.project-item-sub { font-size: 10.5px; color: var(--text-faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.project-item-progress { height: 4px; background: var(--bg); border-radius: 3px; overflow: hidden; }
.project-item-progress-fill { height: 100%; background: var(--brand); border-radius: 3px; }

.project-group { display: flex; flex-direction: column; gap: 3px; }
.project-group-header { display: flex; align-items: center; gap: 7px; background: transparent; border: none; color: var(--text-dim); padding: 6px 4px; font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; cursor: pointer; }
.project-group-header:hover { color: var(--text); }
.project-group-header .count-badge { margin-left: auto; }
.project-group-empty { padding: 4px 10px 8px; font-size: 11px; }

.pill { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 7px; border-radius: 20px; font-family: var(--font-mono); white-space: nowrap; }
.pill-gepland { background: #3a3f2c; color: #c9d17a; }
.pill-lopend { background: var(--brand-dim); color: #a9d4ee; }
.pill-afgerond { background: #2e4530; color: #9bcf9f; }
.pill-danger { background: #4a2e2e; color: #e0a3a3; }

.toegang-toggle { display: flex; align-items: center; gap: 8px; background: transparent; border: 1px solid var(--border); color: var(--text-dim); padding: 9px 10px; border-radius: 6px; font-size: 12.5px; cursor: pointer; font-family: var(--font-body); }
.toegang-toggle.active, .toegang-toggle:hover { border-color: var(--brand); color: var(--text); }

.sidebar-user { display: flex; align-items: center; gap: 8px; border-top: 1px solid var(--border); padding-top: 12px; }
.sidebar-user-name { font-size: 12px; font-weight: 600; }
.sidebar-user-role { font-size: 10px; color: var(--text-faint); font-family: var(--font-mono); text-transform: uppercase; }
.logout-btn { margin-left: auto; background: transparent; border: 1px solid var(--border); color: var(--text-dim); border-radius: 5px; padding: 5px 8px; cursor: pointer; display: flex; align-items: center; gap: 5px; font-size: 11px; }
.logout-btn:hover { border-color: var(--danger); color: var(--danger); }

.main { padding: 22px 26px 40px; overflow-y: auto; }
.project-header { position: relative; padding: 18px 20px; border: 1px solid var(--border); border-radius: 8px; background: linear-gradient(180deg, var(--panel), var(--panel-2)); overflow: hidden; margin-bottom: 12px; }
.header-grid-texture { position: absolute; inset: 0; opacity: 0.10; pointer-events: none; background-image: linear-gradient(var(--brand) 1px, transparent 1px), linear-gradient(90deg, var(--brand) 1px, transparent 1px); background-size: 22px 22px; }
.header-top { position: relative; display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; flex-wrap: wrap; }
.header-eyebrow { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--brand); margin-bottom: 2px; }
.project-header h1 { font-family: var(--font-display); font-weight: 800; font-size: 24px; margin: 0 0 8px; letter-spacing: 0.005em; text-transform: uppercase; }
.header-meta { display: flex; gap: 16px; flex-wrap: wrap; }
.header-meta span { display: flex; align-items: center; gap: 5px; font-size: 12.5px; color: var(--text-dim); }
.header-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.status-select { background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 7px 8px; border-radius: 5px; font-size: 12px; font-family: var(--font-body); }

.address-card { display: flex; align-items: center; gap: 12px; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; color: var(--brand); flex-wrap: wrap; }
.address-body { flex: 1; color: var(--text); }
.address-label { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-faint); }
.address-value { font-size: 14px; font-weight: 600; }
.address-link { display: flex; align-items: center; gap: 5px; background: var(--brand-dim); color: #a9d4ee; text-decoration: none; padding: 7px 12px; border-radius: 5px; font-size: 12px; font-weight: 600; }
.address-link.apple { background: var(--panel-2); color: var(--text-dim); border: 1px solid var(--border); }
.address-edit { background: transparent; border: 1px solid var(--border); color: var(--text-dim); padding: 7px 10px; border-radius: 5px; font-size: 11.5px; cursor: pointer; }

.icon-btn { background: transparent; border: 1px solid var(--border); border-radius: 5px; padding: 6px; cursor: pointer; color: var(--text-dim); display: flex; }
.icon-btn.danger:hover { border-color: var(--danger); color: var(--danger); }
.icon-btn.ghost { border: none; padding: 4px; }

.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 18px; flex-wrap: wrap; }
.tab-btn { display: flex; align-items: center; gap: 6px; background: transparent; border: none; color: var(--text-faint); padding: 9px 12px; font-size: 12.5px; cursor: pointer; border-bottom: 2px solid transparent; font-family: var(--font-body); }
.tab-btn:hover { color: var(--text); }
.tab-btn.active { color: var(--text); border-bottom-color: var(--brand); }

.panel { display: flex; flex-direction: column; gap: 16px; }
.hint-bar { font-size: 12px; color: var(--text-faint); background: var(--panel-2); border: 1px solid var(--border); border-radius: 6px; padding: 9px 12px; line-height: 1.5; }
.hint-bar.small { font-size: 11px; }

.task-list { display: flex; flex-direction: column; gap: 6px; }
.task-row { display: flex; align-items: center; gap: 10px; background: var(--panel); border: 1px solid var(--border); border-radius: 7px; padding: 10px 12px; }
.task-row.done { opacity: 0.55; }
.task-row.done .task-title { text-decoration: line-through; }
.task-check { background: transparent; border: none; color: var(--success); cursor: pointer; display: flex; }
.task-row:not(.done) .task-check { color: var(--text-faint); }
.task-check:disabled { cursor: default; opacity: 0.6; }
.task-body { flex: 1; }
.task-title { font-size: 13.5px; font-weight: 500; }
.task-meta { display: flex; gap: 14px; margin-top: 3px; font-size: 11.5px; color: var(--text-faint); }
.task-meta span { display: flex; align-items: center; gap: 4px; }
.mono { font-family: var(--font-mono); }
.phase-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 4px; }
.phase-group-title { font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--brand); }
.phase-group-range { color: var(--text-faint); text-transform: none; letter-spacing: 0; }

.add-form { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.add-form-title { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-faint); font-family: var(--font-mono); }
.add-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; align-items: center; }
.add-form input, .add-form select, .add-form textarea { background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 8px 9px; border-radius: 5px; font-size: 12.5px; font-family: var(--font-body); width: 100%; }
.add-form textarea { resize: vertical; }
.checkbox-label { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-dim); }
.checkbox-label input { width: auto; }
.assignee-custom { display: flex; gap: 6px; align-items: center; }
.link-btn { background: none; border: none; color: var(--brand); font-size: 11px; cursor: pointer; white-space: nowrap; padding: 0; }

.btn-primary { background: var(--brand); color: #051019; border: none; padding: 8px 14px; border-radius: 5px; font-size: 12.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
.btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--text-dim); padding: 8px 14px; border-radius: 5px; font-size: 12.5px; cursor: pointer; }

.drawing-grid { display: flex; flex-direction: column; gap: 8px; }
.drawing-card { display: flex; align-items: flex-start; gap: 10px; background: var(--panel); border: 1px solid var(--border); border-radius: 7px; padding: 10px 12px; }
.drawing-icon { color: var(--brand); margin-top: 2px; }
.drawing-thumb { width: 44px; height: 44px; object-fit: cover; border-radius: 5px; flex-shrink: 0; }
.thumb-btn { padding: 0; border: none; background: none; cursor: pointer; line-height: 0; }
.lightbox-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 1000; cursor: zoom-out; }
.lightbox-img { max-width: 90%; max-height: 90%; border-radius: 6px; cursor: default; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
.lightbox-close { position: absolute; top: 18px; right: 18px; background: var(--panel); border: 1px solid var(--border); color: var(--text); border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.file-capture-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.file-busy { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-faint); }
.file-preview { display: flex; align-items: center; gap: 8px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; width: fit-content; }
.file-preview-img { max-height: 60px; max-width: 100px; border-radius: 4px; object-fit: cover; }
.file-preview-pdf { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-dim); }
.drawing-body { flex: 1; }
.drawing-title { font-size: 13.5px; font-weight: 600; }
.drawing-note { font-size: 12px; color: var(--text-faint); margin-top: 2px; }
.review-controls { display: flex; align-items: center; gap: 10px; margin-top: 6px; flex-wrap: wrap; }
.checkbox-label.small { font-size: 11px; gap: 4px; }
.vis-review { background: var(--brand-dim); color: #a9d4ee; }

.note-list { display: flex; flex-direction: column; gap: 8px; }
.note-card { background: var(--panel); border: 1px solid var(--border); border-radius: 7px; padding: 10px 12px; }
.note-top { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; flex-wrap: wrap; }
.note-author { font-size: 12.5px; font-weight: 600; }
.note-date { font-size: 10.5px; color: var(--text-faint); }
.note-del { margin-left: auto; }
.note-text { font-size: 13px; line-height: 1.5; color: var(--text); }
.vis-pill { display: flex; align-items: center; gap: 4px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; padding: 2px 7px; border-radius: 20px; font-family: var(--font-mono); }
.vis-private { background: #4a2e2e; color: #e0a3a3; }
.vis-public { background: var(--brand-dim); color: #a9d4ee; }
.vis-klant { background: #2e4530; color: #9bcf9f; }

.netto-bar { display: flex; gap: 18px; flex-wrap: wrap; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; }
.netto-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-dim); }
.netto-item b { color: var(--text); font-family: var(--font-mono); font-size: 13px; }
.netto-total { margin-left: auto; color: var(--brand); }
.netto-total b { color: var(--brand); }

.work-list { display: flex; flex-direction: column; gap: 8px; }
.work-row { display: flex; align-items: center; gap: 10px; background: var(--panel); border: 1px solid var(--border); border-radius: 7px; padding: 10px 12px; border-left: 3px solid var(--border); }
.work-meerwerk { border-left-color: var(--success); }
.work-minderwerk { border-left-color: var(--danger); }
.work-mine { border-left-color: var(--brand); background: var(--panel-2); }
.work-type-icon { color: var(--text-faint); }
.work-meerwerk .work-type-icon { color: var(--success); }
.work-minderwerk .work-type-icon { color: var(--danger); }
.work-body { flex: 1; }
.work-desc { font-size: 13px; font-weight: 500; }
.work-sub { font-size: 12px; color: var(--text-faint); margin-top: 2px; }
.explain-toggle { display: flex; align-items: center; gap: 4px; background: none; border: none; color: var(--brand); font-size: 11px; cursor: pointer; padding: 3px 0; }
.explain-toggle svg { transition: transform 0.15s; }
.explain-toggle svg.open { transform: rotate(180deg); }
.work-explanation { font-size: 12.5px; color: var(--text-dim); background: var(--panel-2); border: 1px solid var(--border); border-radius: 5px; padding: 8px 10px; margin-top: 2px; line-height: 1.5; }

.stamp { font-family: var(--font-mono); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.1em; padding: 5px 12px; border-radius: 3px; border: 2px solid; background: transparent; transform: rotate(-4deg); cursor: pointer; font-weight: 600; }
.stamp:disabled { cursor: default; }
.stamp-open { color: var(--brand); border-color: var(--brand); }
.stamp-akkoord { color: var(--success); border-color: var(--success); }
.stamp-afgewezen { color: var(--danger); border-color: var(--danger); }
.choice-btns { display: flex; gap: 6px; }

.sig-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 1001; padding: 20px; }
.sig-modal { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 18px; display: flex; flex-direction: column; gap: 10px; align-items: center; }
.sig-title { font-size: 13px; font-weight: 600; color: var(--text); }
.sig-canvas { background: #fff; border-radius: 6px; touch-action: none; cursor: crosshair; border: 1px solid var(--border); }
.sig-hint { font-size: 11px; color: var(--text-faint); }
.sig-actions { display: flex; gap: 8px; }
.sig-line { display: flex; align-items: center; gap: 8px; }
.sig-thumb-btn { padding: 0; border: 1px solid var(--border); border-radius: 4px; background: #fff; cursor: pointer; line-height: 0; }
.sig-thumb { height: 20px; width: 46px; object-fit: contain; display: block; }

.dossier-status { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; border: 1px solid var(--border); }
.dossier-status.pending { background: #3a2f1c; color: #e0c48a; border-color: #5a4a2a; }
.dossier-status.ready { background: var(--brand-dim); color: #a9d4ee; border-color: var(--brand); }
.dossier-status.signed { background: #1f3a2a; color: #9bcf9f; border-color: var(--success); }

@media print {
  * { background: #fff !important; color: #000 !important; border-color: #ccc !important; box-shadow: none !important; }
  .sidebar, .mobile-bar, .tabs, .save-indicator, .no-print, .header-right, .address-card .address-edit { display: none !important; }
  .app-shell { display: block !important; border: none !important; }
  .main { padding: 0 !important; }
  .dossier-status.pending, .dossier-status.ready, .dossier-status.signed { background: #fff !important; border: 1px solid #000 !important; }
}

.calc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.calc-field { display: flex; flex-direction: column; gap: 5px; font-size: 11.5px; color: var(--text-faint); font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.04em; }
.calc-field input { background: var(--panel); border: 1px solid var(--border); color: var(--text); padding: 9px 10px; border-radius: 6px; font-size: 14px; font-family: var(--font-mono); }
.calc-summary { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 6px 16px; }
.calc-line { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid var(--border); font-size: 13px; color: var(--text-dim); }
.calc-line:last-child { border-bottom: none; }
.calc-line-strong { color: var(--text); font-weight: 600; }
.calc-line-marge { font-weight: 700; font-size: 14px; }
.calc-line-marge.pos { color: var(--success); }
.calc-line-marge.neg { color: var(--danger); }

.access-panel { max-width: 680px; }
.template-item { padding: 8px 10px; }
.template-form { flex-direction: column; align-items: stretch; }
.template-form textarea { background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 5px; padding: 8px 10px; font-size: 12px; font-family: var(--font-mono); resize: vertical; }
.access-subtabs { display: flex; gap: 6px; border-bottom: 1px solid var(--border); }
.access-subtab { display: flex; align-items: center; gap: 7px; background: transparent; border: none; color: var(--text-faint); padding: 9px 4px; font-size: 12.5px; cursor: pointer; border-bottom: 2px solid transparent; }
.access-subtab:hover { color: var(--text); }
.access-subtab.active { color: var(--text); border-bottom-color: var(--brand); }
.count-badge { background: var(--panel-2); color: var(--text-dim); font-family: var(--font-mono); font-size: 10px; padding: 1px 6px; border-radius: 10px; }
.access-search-row { display: flex; gap: 8px; }
.access-search-row input, .access-search-row select { background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 8px 10px; border-radius: 5px; font-size: 12.5px; }
.access-search-row input { flex: 1; }
.access-summary { width: 100%; display: flex; align-items: center; gap: 10px; background: none; border: none; padding: 8px 10px; cursor: pointer; text-align: left; }
.access-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--brand-dim); color: #a9d4ee; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
.access-summary-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.access-summary-name { font-size: 13px; font-weight: 600; color: var(--text); }
.access-summary-sub { font-size: 11px; color: var(--text-faint); }
.access-chevron { color: var(--text-faint); transition: transform 0.15s; flex-shrink: 0; }
.access-chevron.open { transform: rotate(180deg); }
.access-details { padding: 0 10px 10px; display: flex; flex-direction: column; gap: 10px; border-top: 1px solid var(--border); margin-top: 2px; padding-top: 10px; }
.access-item.team-row, .access-item.client-row { flex-direction: column; align-items: stretch; padding: 0; gap: 0; }
.access-block { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.access-block-title { display: flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--brand); font-family: var(--font-mono); }
.access-row { display: flex; gap: 8px; }
.access-row input { flex: 1; background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 8px 10px; border-radius: 5px; font-size: 12.5px; }
.code-input { font-family: var(--font-mono); letter-spacing: 0.06em; }
.access-list { display: flex; flex-direction: column; gap: 6px; }
.access-item { display: flex; align-items: center; gap: 10px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 6px; padding: 8px 10px; flex-wrap: wrap; }
.access-item.client-row { flex-direction: column; align-items: stretch; gap: 8px; }
.client-row-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.access-name { font-size: 12.5px; color: var(--text); flex: 1; }
.access-name-sub { color: var(--text-faint); font-weight: 400; }
.access-name-input { background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 6px 8px; border-radius: 4px; font-size: 12.5px; flex: 1; min-width: 120px; }
.team-row select { background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 6px 8px; border-radius: 4px; font-size: 12px; }
.trade-custom-input { background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 6px 8px; border-radius: 4px; font-size: 12px; width: 110px; }
.code-pill { display: flex; align-items: center; gap: 5px; background: var(--bg); border: 1px solid var(--border); padding: 4px 9px; border-radius: 20px; font-size: 12px; letter-spacing: 0.06em; cursor: pointer; color: var(--brand); }
.copied-tag { font-size: 10px; color: var(--success); }
.perm-grid { display: flex; flex-wrap: wrap; gap: 10px 16px; padding: 4px 2px 0; align-items: center; }
.perm-group { display: flex; gap: 10px; padding-right: 14px; border-right: 1px solid var(--border); margin-right: 2px; }
.perm-checkbox { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--text-dim); }
.perm-checkbox input { width: auto; }
.edit-right { padding: 2px; }
.project-access { display: flex; flex-direction: column; gap: 6px; padding: 8px; background: var(--panel); border: 1px solid var(--border); border-radius: 6px; }
.project-access-list { display: flex; flex-direction: column; gap: 4px; padding-left: 4px; }
.project-access-list .checkbox-label { font-size: 11.5px; }

.notif-bar { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.notif-item { display: flex; align-items: center; gap: 10px; background: var(--brand-dim); border: 1px solid var(--brand); border-radius: 7px; padding: 9px 12px; color: #d9edf9; }
.notif-text { flex: 1; font-size: 12.5px; }
.notif-date { font-size: 10px; color: #a9d4ee; margin-top: 2px; }

.gantt-scroll { overflow-x: auto; border: 1px solid var(--border); border-radius: 8px; background: var(--panel); }
.gantt-grid { display: grid; grid-auto-rows: 36px; width: max-content; }
.gantt-cell { display: flex; align-items: center; border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.gantt-corner { position: sticky; left: 0; z-index: 2; background: var(--panel); }
.gantt-head { flex-direction: column; justify-content: center; gap: 0; background: var(--panel-2); font-family: var(--font-mono); }
.gantt-head-day { font-size: 11px; color: var(--text); font-weight: 600; line-height: 1.1; }
.gantt-head-wd { font-size: 8.5px; color: var(--text-faint); line-height: 1.1; }
.gantt-head.weekend { background: #201f26; }
.gantt-row-label { position: sticky; left: 0; z-index: 1; background: var(--panel); flex-direction: column; align-items: flex-start; justify-content: center; gap: 1px; padding: 4px 10px; position: relative; }
.gantt-row-title { font-size: 12px; font-weight: 600; color: var(--text); white-space: nowrap; }
.gantt-row-sub { display: flex; gap: 8px; font-size: 10px; color: var(--text-faint); white-space: nowrap; }
.gantt-progress-tag { color: var(--brand); font-family: var(--font-mono); }
.gantt-row-del { position: absolute; right: 4px; top: 4px; }
.gantt-daycell.weekend { background: #201f26; }
.gantt-daycell.filled { background: var(--brand); }
.gantt-daycell.filled.first { border-top-left-radius: 5px; border-bottom-left-radius: 5px; margin-left: 2px; }
.gantt-daycell.filled.last { border-top-right-radius: 5px; border-bottom-right-radius: 5px; margin-right: 2px; }

.no-project { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--text-faint); min-height: 300px; }

.dashboard { display: flex; flex-direction: column; gap: 18px; }

.dash-topbar { display: flex; align-items: center; gap: 12px; }
.dash-search { flex: 1; max-width: 340px; display: flex; align-items: center; gap: 8px; background: var(--panel); border: 1px solid var(--border); border-radius: 20px; padding: 8px 14px; color: var(--text-faint); }
.dash-search input { flex: 1; background: none; border: none; color: var(--text); font-size: 12.5px; }
.dash-bell { position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: var(--panel); border: 1px solid var(--border); color: var(--text-dim); }
.dash-bell-badge { position: absolute; top: -4px; right: -4px; background: var(--danger); color: #fff; font-size: 9.5px; font-weight: 700; min-width: 16px; height: 16px; border-radius: 8px; display: flex; align-items: center; justify-content: center; padding: 0 3px; }

.dash-section-title { font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-faint); margin-top: 4px; }
.proj-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px; }
.proj-card { display: flex; flex-direction: column; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; cursor: pointer; text-align: left; padding: 0; }
.proj-card:hover { border-color: var(--brand); }
.proj-card-thumb { height: 100px; background: var(--panel-2); overflow: hidden; }
.proj-card-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.proj-card-thumb-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-faint); }
.proj-card-body { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 6px; }
.proj-card-name { font-size: 13px; font-weight: 600; color: var(--text); }
.proj-card-client { font-size: 11px; color: var(--text-faint); margin-top: -4px; }
.proj-card-progress { height: 6px; background: var(--panel-2); border-radius: 4px; overflow: hidden; }
.proj-card-progress-fill { height: 100%; background: var(--brand); border-radius: 4px; }
.proj-card-foot { display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: var(--text-dim); }
.dash-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.dash-card { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 4px; text-align: left; }
.dash-card-clickable { cursor: pointer; }
.dash-card-clickable:hover { border-color: var(--brand); }
.dash-card-value { font-family: var(--font-display); font-weight: 800; font-size: 26px; color: var(--brand); }
.dash-card-title { font-size: 12px; color: var(--text-dim); }
.dash-card-sub { font-size: 10.5px; color: var(--text-faint); }
.dash-lists { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.dash-list-card { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 14px; }
.dash-list-title { font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-faint); margin-bottom: 8px; }
.dash-list { display: flex; flex-direction: column; gap: 4px; }
.dash-list-item { display: flex; justify-content: space-between; gap: 8px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 5px; padding: 7px 10px; font-size: 12px; color: var(--text); cursor: pointer; text-align: left; }
.dash-list-item:hover { border-color: var(--brand); }
.dash-list-project { color: var(--text-faint); white-space: nowrap; }

.chat-list { display: flex; flex-direction: column; gap: 8px; max-height: 360px; overflow-y: auto; }
.chat-msg { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; max-width: 80%; }
.chat-msg.mine { align-self: flex-end; background: var(--brand-dim); border-color: var(--brand); }
.chat-msg-top { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 3px; }
.chat-author { font-size: 11.5px; font-weight: 600; }
.chat-date { font-size: 10px; color: var(--text-faint); }
.chat-text { font-size: 13px; line-height: 1.4; }
.chat-input-row { display: flex; gap: 8px; }
.chat-input-row input { flex: 1; background: var(--panel); border: 1px solid var(--border); color: var(--text); padding: 9px 12px; border-radius: 6px; font-size: 13px; }

.save-indicator { position: absolute; bottom: 10px; right: 14px; font-size: 10.5px; color: var(--text-faint); display: flex; align-items: center; gap: 5px; font-family: var(--font-mono); }
.save-indicator.error { color: var(--danger); }

@media (max-width: 760px) {
  .app-shell { grid-template-columns: 1fr; }
  .sidebar { position: absolute; top: 46px; left: 0; right: 0; bottom: 0; z-index: 20; display: none; border-right: none; border-top: 1px solid var(--border); }
  .sidebar.open { display: flex; }
  .mobile-bar { display: flex; align-items: center; justify-content: space-between; background: var(--panel); border-bottom: 1px solid var(--border); padding: 10px 14px; }
  .mobile-bar button { display: flex; align-items: center; gap: 6px; background: transparent; border: none; color: var(--text); font-size: 12.5px; }
  .mobile-logout { color: var(--text-dim) !important; }
  .main { padding: 16px; }
  .project-header h1 { font-size: 20px; }
}
`;
