import { useState } from "react";
import type { CSSProperties } from "react";

// ── Types ─────────────────────────────────────────────────
type Step = "calendar" | "time" | "details" | "done";
interface FormState { name: string; email: string; guest: string; notes: string; }
interface DoneViewProps { selDay: number; selTime: string; month: number; year: number; name: string; }

// ── Helpers ───────────────────────────────────────────────
function isAvailableDay(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  const dow = date.getDay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dow >= 1 && dow <= 5 && date >= today;
}
function getMonthStartDay(year: number, month: number): number {
  return (new Date(year, month - 1, 1).getDay() + 6) % 7;
}
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
function getDayName(year: number, month: number, day: number): string {
  const n = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  return n[(new Date(year, month - 1, day).getDay() + 6) % 7];
}
function addMinutes(time: string | null, mins: number): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// ── Constants ─────────────────────────────────────────────
const TIME_SLOTS = ["8:00","8:30","9:00","9:30","10:00","10:30","11:00","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00"];
const WEEKDAY_LABELS = ["MON","TUE","WED","THU","FRI","SAT","SUN"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ── CSS ───────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { font-family: 'Inter', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }

  /* ── Day cells ── */
  .day-avail:hover  { background-color: #3d2a06 !important; }
  .day-avail:active { background-color: #4e3508 !important; }

  /* ── Time buttons ── */
  .ts-btn           { transition: background .12s, border-color .12s; }
  .ts-btn:hover     { background-color: rgba(204,144,24,0.15) !important; border-color: #E8A820 !important; }
  .ts-btn:active    { background-color: rgba(204,144,24,0.30) !important; }
  .ts-btn.active    { background-color: #CC9018 !important; color: #0a0800 !important; border-color: #CC9018 !important; }
  .ts-btn.active:hover { background-color: #E8A820 !important; }

  /* ── Primary button ── */
  .btn-primary        { transition: background .12s, transform .08s; }
  .btn-primary:hover  { background-color: #E8A820 !important; }
  .btn-primary:active { background-color: #B87D10 !important; transform: scale(.99); }

  /* ── Secondary / outline button ── */
  .btn-secondary        { transition: background .12s, border-color .12s; }
  .btn-secondary:hover  { background-color: rgba(204,144,24,0.10) !important; border-color: #E8A820 !important; }
  .btn-secondary:active { background-color: rgba(204,144,24,0.22) !important; }

  .back-btn:hover { opacity: .7; }
  .cookie:hover   { opacity: .7; }

  input:focus, textarea:focus { outline: none; border-color: #CC9018 !important; }

  ::-webkit-scrollbar       { width: 4px; }
  ::-webkit-scrollbar-track { background: #0e0e18; }
  ::-webkit-scrollbar-thumb { background: #3d2a06; border-radius: 4px; }
`;

// ── SVG icons ─────────────────────────────────────────────
const SI = { width:14, height:14, viewBox:"0 0 24 24", fill:"none", stroke:"currentColor", strokeWidth:2, strokeLinecap:"round" as const, strokeLinejoin:"round" as const };
const IcoClock = () => <svg {...SI}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IcoCam   = () => <svg {...SI}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
const IcoCal   = () => <svg {...SI}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcoGlobe = () => <svg {...SI}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;

// ── Design tokens (відповідно до дизайн-системи) ─────────
const C = {
  // Primary (amber/golden)
  p400:     "#B87D10",   // темний amber
  p300:     "#CC9018",   // середній amber
  p200:     "#E8A820",   // золотистий
  p100:     "#F5C842",   // яскраво-жовтий
  p50:      "#FAE17A",   // світло-жовтий

  // Secondary (темний фон)
  s100:     "#0e0e18",   // 100% — майже чорний navy
  s75:      "#16161f",   // 75%
  s50:      "#1f1f2a",   // 50%
  s25:      "#2e2e3d",   // 25%
  s800:     "#0a0a12",   // Secondary 800

  // Grey
  g500:     "#2a2a2a",
  g400:     "#555555",
  g300:     "#888888",
  g200:     "#aaaaaa",
  g100:     "#e0e0e0",

  // Aliases для зручності
  get bg()       { return this.s100; },
  get card()     { return this.s75; },
  get border()   { return this.s25; },
  get amber()    { return this.p300; },
  get amberTxt() { return this.p200; },
  get dayBg()    { return "#2a1e04"; },
  get yellow()   { return this.p100; },
  get input()    { return this.s50; },
  get inputBdr() { return this.s25; },
};

// ── Main Component ────────────────────────────────────────
export default function ConsultationBooking() {
  const now = new Date();
  const [year,  setYear]  = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [selDay,  setSelDay]  = useState<number | null>(null);
  const [selTime, setSelTime] = useState<string | null>(null);
  const [step,    setStep]    = useState<Step>("calendar");
  const [showGuests, setShowGuests] = useState(false);
  const [form, setForm] = useState<FormState>({ name:"", email:"", guest:"", notes:"" });

  const prevMonth = () => { if (month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if (month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); };

  const handleDayClick = (day: number) => {
    if (!isAvailableDay(year, month, day)) return;
    setSelDay(day); setSelTime(null); setStep("time");
  };

  const setField = (key: keyof FormState, val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const startOffset = getMonthStartDay(year, month);
  const daysInMonth = getDaysInMonth(year, month);
  const cells: (number|null)[] = [
    ...Array<null>(startOffset).fill(null),
    ...Array.from({length:daysInMonth},(_,i)=>i+1),
  ];

  const isTStep    = step === "time";
  const showSelDay = step === "time" || step === "details";

  // ── Shared styles ──
  const s = {
    page: { minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:20 } as CSSProperties,
    card: { background:C.card, borderRadius:18, overflow:"hidden", width:"100%", maxWidth: 700, transition:"max-width .35s ease", boxShadow:"0 24px 80px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.05)" } as CSSProperties,
    header: { padding:"24px 28px 20px", borderBottom:`1px solid ${C.border}` },
    title: { fontSize:32, fontWeight:700, color:"#fff", letterSpacing:"-0.5px", marginBottom:16, textAlign:"center" as const } as CSSProperties,
    metaRow: { display:"flex", alignItems:"center", flexWrap:"wrap" as const, gap:24, color:"#888", fontSize:13, paddingBottom:14 },
    metaItem: { display:"flex", alignItems:"center", gap:6 },
    bookBar: { display:"flex", alignItems:"center", flexWrap:"wrap" as const, gap:16, paddingTop:14, borderTop:`1px solid ${C.border}`, color:"#aaa", fontSize:13 },
    body: { display:"flex", justifyContent:"center" } as CSSProperties,
    // Calendar — 344×344 grid
    calCol: { flexShrink:0, width:344, padding:"20px 20px 16px", borderRight: isTStep?`1px solid ${C.border}`:"none" } as CSSProperties,
    secTitle: { color:"#fff", fontWeight:600, fontSize:17, marginBottom:16 },
    monthNav: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 },
    navBtn: (active:boolean):CSSProperties => ({ width:34, height:34, borderRadius:"50%", border:"none", background:active?C.amber:"#2a2a2a", color:active?"#fff":"#aaa", fontSize:17, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }),
    monthLabel: { color:"#fff", fontWeight:500, fontSize:14 } as CSSProperties,
    grid: { display:"grid", gridTemplateColumns:"repeat(7, 40px)", gap:4 } as CSSProperties,
    wdLabel: { width:40, height:32, textAlign:"center" as const, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:600, color:"#555" },
    dayCell: (avail:boolean, sel:boolean):CSSProperties => ({
      width:40, height:40, borderRadius:"50%",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:13.5, cursor: avail?"pointer":"default",
      background: sel?C.yellow:avail?C.dayBg:"transparent",
      color: sel?"#1c1200":avail?C.amberTxt:"#444",
      fontWeight: sel?700:avail?600:400,
    }),
    tzRow: { display:"flex", alignItems:"center", gap:6, marginTop:14, paddingTop:14, borderTop:`1px solid ${C.border}`, color:"#888", fontSize:12, height:48 },
    // Time panel — 260px wide, 530px min-height
    timePanel: { width:260, flexShrink:0, padding:"16px 12px 16px", display:"flex", flexDirection:"column" as const, minHeight:530 },
    timeLabel: { color:"#888", fontSize:13, marginBottom:12 },
    timeListWrap: { flex:1, position:"relative" as const, overflow:"hidden" },
    timeList: { overflowY:"auto" as const, paddingRight:4, maxHeight:420, paddingBottom:8 },
    timeFade: { position:"absolute" as const, bottom:0, left:0, right:0, height:64, background:`linear-gradient(to bottom, transparent, ${C.card})`, pointerEvents:"none" as const },
    // Time button — 236×40
    timeBtn: ():CSSProperties => ({ display:"flex", alignItems:"center", justifyContent:"center", width:236, height:40, marginBottom:8, border:`1.5px solid ${C.amber}`, borderRadius:10, background:"transparent", color:C.amberTxt, fontSize:15, fontWeight:600, cursor:"pointer" }),
    nextBtn: (ready:boolean):CSSProperties => ({ marginTop:12, width:"100%", padding:"14px 0", borderRadius:30, border:"none", background:ready?C.yellow:"#2e2e38", color:ready?"#1c1200":"#55556a", fontSize:16, fontWeight:700, cursor:ready?"pointer":"not-allowed" }),
    // Details — 350px wide
    detailsCol: { width:350, flexShrink:0, padding:"24px 28px 28px" },
    formLabel: { display:"block", color:"#ccc", fontSize:13, marginBottom:6 } as CSSProperties,
    formInput: { display:"block", width:"100%", height:44, padding:"0 14px", background:C.input, border:`1px solid ${C.inputBdr}`, borderRadius:8, color:"#fff", fontSize:14, marginBottom:14 } as CSSProperties,
    addGuestBtn: { padding:"9px 20px", background:"transparent", border:`1.5px solid ${C.amber}`, borderRadius:20, color:C.amberTxt, fontSize:13, fontWeight:600, cursor:"pointer", marginBottom:14 } as CSSProperties,
    textarea: { display:"block", width:"100%", padding:"12px 14px", background:C.input, border:`1px solid ${C.inputBdr}`, borderRadius:8, color:"#fff", fontSize:14, minHeight:90, resize:"vertical" as const, marginBottom:20 },
    schedBtn: { padding:"13px 28px", background:C.yellow, border:"none", borderRadius:28, color:"#1c1200", fontSize:15, fontWeight:700, cursor:"pointer" } as CSSProperties,
    footer: { textAlign:"center" as const, padding:"12px 32px 14px", borderTop:`1px solid ${C.border}` },
  };

  return (
    <>
      <style>{CSS}</style>
      <div style={s.page}>
        <div style={s.card}>

          {/* ── Header ── */}
          <div style={s.header}>
  

            <h1 style={s.title}>Consultation</h1>

            <div style={s.metaRow}>
              <span style={s.metaItem}><IcoClock /> 30 min</span>
              <span style={s.metaItem}><IcoCam /> Web conferencing details provided upon confirmation.</span>
            </div>

            {(step==="details"||step==="done") && selDay!==null && selTime && (
              <div style={s.bookBar}>
                <IcoCal />
                <span>{selTime} – {addMinutes(selTime,30)}, {getDayName(year,month,selDay)}, {MONTH_NAMES[month-1]} {selDay}, {year}</span>
                <span style={{margin:"0 4px",color:C.border}}>·</span>
                <IcoGlobe />
                <span>European Time</span>
              </div>
            )}
          </div>

          {/* ── Body ── */}
          {step==="done" && selDay!==null && selTime ? (
            <DoneView selDay={selDay} selTime={selTime} month={month} year={year} name={form.name} />
          ) : (
            <div style={s.body}>

              {/* Calendar */}
              {(step==="calendar"||step==="time") && (
                <div style={s.calCol}>
                  {step==="calendar" && <p style={s.secTitle}>Select a Date &amp; Time</p>}

                  <div style={s.monthNav}>
                    <button type="button" style={s.navBtn(false)} onClick={prevMonth}>‹</button>
                    <span style={s.monthLabel}>{MONTH_NAMES[month-1]} {year}</span>
                    <button type="button" style={s.navBtn(true)} onClick={nextMonth}>›</button>
                  </div>

                  <div style={s.grid}>
                    {WEEKDAY_LABELS.map(l => (
                      <div key={l} style={s.wdLabel}>{l}</div>
                    ))}
                    {cells.map((day, i) => {
                      if (day===null) return <div key={`e${i}`} style={{width:40,height:40}} />;
                      const avail = isAvailableDay(year, month, day);
                      const sel   = day===selDay && showSelDay;
                      return (
                        <div key={day}
                          className={avail&&!sel?"day-avail":""}
                          style={s.dayCell(avail,sel)}
                          onClick={() => handleDayClick(day)}>
                          {day}
                        </div>
                      );
                    })}
                  </div>

                  <div style={s.tzRow}><IcoGlobe /> Central European Time (8:11pm) ▾</div>
                </div>
              )}

              {/* Time slots */}
              {isTStep && selDay!==null && (
                <div style={s.timePanel}>
                  <p style={s.timeLabel}>{getDayName(year,month,selDay)}, {MONTH_NAMES[month-1]} {selDay}</p>
                  <div style={s.timeListWrap}>
                    <div style={s.timeList}>
                      {TIME_SLOTS.map(t => (
                        <button key={t} type="button"
                          className={`ts-btn${selTime===t?" active":""}`}
                          style={s.timeBtn()}
                          onClick={() => setSelTime(t)}>
                          {t}
                        </button>
                      ))}
                    </div>
                    <div style={s.timeFade} />
                  </div>
                  <button type="button" className="btn-primary"
                    style={s.nextBtn(!!selTime)}
                    onClick={() => { if(selTime) setStep("details"); }}>
                    Next
                  </button>
                </div>
              )}

              {/* Details */}
              {step==="details" && (
                <div style={s.detailsCol}>
                  <p style={{color:"#fff",fontWeight:600,fontSize:17,marginBottom:20}}>Enter details</p>

                  {(["name","email"] as (keyof FormState)[]).map(key => (
                    <div key={key}>
                      <label style={s.formLabel}>
                        {key==="name"?"Name":"Email"} <span style={{color:C.amberTxt}}>*</span>
                      </label>
                      <input type={key==="email"?"email":"text"}
                        value={form[key]}
                        onChange={e => setField(key, e.target.value)}
                        style={s.formInput} />
                    </div>
                  ))}

                  <button type="button" className="btn-secondary"
                    style={s.addGuestBtn}
                    onClick={() => setShowGuests(g=>!g)}>
                    {showGuests ? "− Remove Guest" : "+ Add Guests"}
                  </button>

                  {showGuests && (
                    <input type="email" placeholder="Guest email address"
                      value={form.guest}
                      onChange={e => setField("guest", e.target.value)}
                      style={{...s.formInput, marginBottom:14}} />
                  )}

                  <label style={s.formLabel}>Please share anything that will help prepare our meeting</label>
                  <textarea value={form.notes}
                    onChange={e => setField("notes", e.target.value)}
                    style={s.textarea} />

                  <button type="button" className="btn-primary btn-sched" style={s.schedBtn}
                    onClick={() => { if(form.name&&form.email) setStep("done"); }}>
                    Schedule Event
                  </button>
                </div>
              )}

            </div>
          )}

          {/* Footer */}
          <div style={s.footer}>
            <span className="cookie" style={{color:C.amber,fontSize:13,cursor:"pointer"}}>
              Cookie settings
            </span>
          </div>

        </div>
      </div>
    </>
  );
}

// ── Done screen ───────────────────────────────────────────
function DoneView({ selDay, selTime, month, year, name }: DoneViewProps) {
  const row: CSSProperties = { display:"flex", alignItems:"center", gap:10, color:"#999", fontSize:14, marginBottom:12 };
  return (
    <div style={{ padding:"32px 28px", display:"flex", flexDirection:"column", gap:16 }}>

      {/* Banner — 458×60 */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:60, padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
          {/* Amber circle-check icon */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#CC9018" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" fill="rgba(204,144,24,0.15)"/>
            <polyline points="9 12 11 14 15 10"/>
          </svg>
          <h2 style={{ color:"#fff", fontSize:20, fontWeight:700, margin:0 }}>You are scheduled</h2>
        </div>
        <p style={{ color:"#888", fontSize:13, margin:0 }}>
          A calendar invitation has been sent to your email address.
        </p>
      </div>

      {/* Info card */}
      <div style={{ border:`1px solid ${C.border}`, borderRadius:12, padding:"20px 20px" }}>
        <p style={{ color:"#fff", fontWeight:700, fontSize:16, marginBottom:16 }}>Schedule eClosing</p>

        {/* Person */}
        <div style={row}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <span>{name || "—"}</span>
        </div>

        {/* Date/time */}
        <div style={row}>
          <IcoCal />
          <span>{selTime} - {addMinutes(selTime,30)}, {getDayName(year,month,selDay)}, {MONTH_NAMES[month-1]} {selDay}, {year}</span>
        </div>

        {/* Timezone */}
        <div style={{ ...row, marginBottom:0 }}>
          <IcoGlobe />
          <span>European Time</span>
        </div>
      </div>

    </div>
  );
}