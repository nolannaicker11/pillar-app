import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════
   PILLAR PERFORMANCE — CONSTANTS
═══════════════════════════════════════════════════════════ */

const DAY_NAMES   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const REST_S = 90;

const PHASES = ["Build","Perform","Test","Deload"];
const PHASE_REPMOD = { Build:0, Perform:1, Test:2, Deload:-2 };
const PHASE_KGMOD  = { Build:1.0, Perform:1.05, Test:1.1, Deload:0.85 };

const QUOTES = [
  "The body achieves what the mind believes.",
  "Every rep is a deposit in your future self.",
  "Discipline is the bridge between goals and accomplishment.",
  "You don't find the time. You make it.",
  "Strong is built, not born.",
  "The pain you feel today is the strength you feel tomorrow.",
  "Show up. Do the work. Trust the process.",
  "Comfort is the enemy of progress.",
];

const CALI_PROGRAMS = {
  Build:   { skill:"Wall Handstand Hold",          note:"Build comfort inverted. Rest 90s between holds.", drills:[{n:"Wrist warm-up circles",s:"2×30s"},{n:"Pike shoulder stretch",s:"2×30s"},{n:"Hollow body holds",s:"3×20s"},{n:"Wall kick-up holds",s:"5×max (target 15s)"},{n:"Stomach-to-wall hold",s:"3×max"},{n:"Freestanding handstand",s:"attempts — log best ↓",free:true}] },
  Perform: { skill:"Freestanding Kick-up Practice", note:"10 min wall work, 10 min freestanding attempts.", drills:[{n:"Wrist warm-up",s:"2×30s"},{n:"Hollow body holds",s:"3×20s"},{n:"Wall hold max attempts",s:"5×max (target 20s)"},{n:"Stomach-to-wall hold",s:"3×max"},{n:"Kick-up freestanding",s:"8 attempts"},{n:"Scapular protraction plank",s:"3×10"},{n:"Freestanding handstand",s:"best attempt — log ↓",free:true}] },
  Test:    { skill:"Max Hold Time Trial",           note:"Record your best hold. This is your benchmark.", drills:[{n:"Full warm-up",s:"5 min"},{n:"Hollow body holds",s:"2×20s"},{n:"Wall hold max #1",s:"1×max"},{n:"Rest",s:"3 min full"},{n:"Wall hold max #2",s:"1×max"},{n:"Freestanding handstand",s:"6 attempts — log ↓",free:true}] },
  Deload:  { skill:"Mobility & Maintenance",        note:"Keep the pattern alive, not the intensity.", drills:[{n:"Wrist mobility",s:"3×30s"},{n:"Downward dog to pike",s:"3×10"},{n:"Hollow body holds",s:"2×15s easy"},{n:"Wall holds easy",s:"3×10s"},{n:"Thoracic rotation",s:"2×10/side"},{n:"Freestanding handstand",s:"easy attempts — log ↓",free:true}] },
};

// Default exercises per muscle group
const MUSCLE_LIBRARY = {
  Chest:      { region:"Upper", exercises:[{name:"Explosive Push-up",type:"athletic",reps:8,baseKg:0,note:"Clap or leave ground at top"},{name:"Single-Arm Alternating DB Press",type:"build",reps:10,baseKg:18,note:"Alternate arms each rep, brace core"}] },
  Back:       { region:"Upper", exercises:[{name:"Explosive Pull-up",type:"athletic",reps:6,baseKg:0,note:"Drive elbows fast, controlled descent"},{name:"Barbell Bent Over Row",type:"build",reps:10,baseKg:50,note:"Hinge to 45°, pull to lower chest"}] },
  Shoulders:  { region:"Upper", exercises:[{name:"Push Press",type:"athletic",reps:8,baseKg:30,note:"Leg drive to initiate, lock out overhead"},{name:"Lateral Raise",type:"build",reps:12,baseKg:10,note:"3s negative, stop at shoulder height"}] },
  Biceps:     { region:"Upper", exercises:[{name:"Supinated Chin-up",type:"athletic",reps:8,baseKg:0,note:"Full ROM, squeeze at top"},{name:"Spider Curl",type:"build",reps:12,baseKg:10,note:"Chest on incline, strict curl"},{name:"Reverse Curl",type:"build",reps:12,baseKg:8,note:"Overhand grip, brachialis focus"}] },
  Triceps:    { region:"Upper", exercises:[{name:"Dips",type:"athletic",reps:10,baseKg:0,note:"Slight forward lean, full depth"},{name:"Cable Push-Down",type:"build",reps:12,baseKg:20,note:"Elbows pinned, full extension"},{name:"Overhead Extension",type:"build",reps:12,baseKg:14,note:"Elbows in, full stretch at bottom"}] },
  Quads:      { region:"Lower", exercises:[{name:"Jump Squat",type:"athletic",reps:8,baseKg:0,note:"Land soft, immediate re-drive"},{name:"Bulgarian Split Squat",type:"build",reps:10,baseKg:20,note:"Rear foot elevated, knee tracks toe"}] },
  Hamstrings: { region:"Lower", exercises:[{name:"Single-Leg RDL",type:"athletic",reps:8,baseKg:16,note:"Balance & control, hip hinge"},{name:"Lying Leg Curl",type:"build",reps:12,baseKg:30,note:"Slow negative, full contraction"}] },
  Glutes:     { region:"Lower", exercises:[{name:"Hip Thrust w/ Pause",type:"athletic",reps:10,baseKg:60,note:"2s pause at top, drive through heel"},{name:"Cable Pull-Through",type:"build",reps:12,baseKg:20,note:"Hinge not squat"}] },
  Calves:     { region:"Lower", exercises:[{name:"Explosive Single-Leg Raise",type:"athletic",reps:12,baseKg:0,note:"Fast up, 3s down"},{name:"Seated Calf Raise",type:"build",reps:15,baseKg:30,note:"Full ROM, deliberate tempo"}] },
};

const ALL_GROUPS = Object.keys(MUSCLE_LIBRARY);
const REST_TYPES = ["Full Rest","Walking","Pilates","Yoga","Swimming","Light Cycling","Stretching","Other"];

const RUN_TEMPLATES = {
  Build:   {label:"Baseline Easy Run", dist:"3km",       structure:"Run 3km easy. Log your time. This is your starting point.",     tip:"Don't race it. Get a feel for where you're at."},
  Perform: {label:"Tempo Intervals",   dist:"3km total", structure:"5 min warm-up → 1km at 4:00/km → 90s rest → 1km → cool down.", tip:"4:00/km = sub-12 min 3km. Train at race speed."},
  Test:    {label:"3km Time Trial",    dist:"3km",       structure:"8 min warm-up → 3km time trial. Even splits.",                tip:"First km discipline is everything."},
  Deload:  {label:"Easy Recovery Run", dist:"2–3km",     structure:"Easy jog. No pace targets. Focus on breathing and form.",       tip:"Let the training absorb. Stay moving, no stress."},
};

/* ═══ THEME ═══ */
const BG      = "#0a0a0a";
const TEAL    = "#0d9488";
const TEALL   = "#2dd4bf";
const TEALA   = "rgba(13,148,136,0.5)";
const SURFACE = "rgba(13,148,136,0.08)";
const BORDER  = "rgba(13,148,136,0.22)";
const BORDERA = "rgba(13,148,136,0.5)";
const T1      = "#ffffff";
const T2      = "#94a3b8";
const T3      = "#3a4854";

/* ═══ DATE HELPERS ═══ */
function isoDate(d) {
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function dateFromIso(iso) { const [y,m,d]=iso.split("-").map(Number); return new Date(y,m-1,d); }
function addDays(iso,n) { const d=dateFromIso(iso); d.setDate(d.getDate()+n); return isoDate(d); }
function fmtDDMM(iso) { const d=dateFromIso(iso); return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`; }
function todayIso() { return isoDate(new Date()); }
function startOfWeek(iso) { const d=dateFromIso(iso); d.setDate(d.getDate()-d.getDay()); return isoDate(d); }
function daysBetween(a,b) { return Math.round((dateFromIso(b)-dateFromIso(a))/86400000); }
function phaseForIso(start,iso) { return PHASES[((Math.floor(daysBetween(start,iso)/7)%4)+4)%4]; }
const suggestKg = (base,phase) => base===0 ? null : Math.round(base*PHASE_KGMOD[phase]*2)/2;

/* ═══════════════════════════════════════════════════════════
   STORAGE — window.storage (Claude artifact API)
═══════════════════════════════════════════════════════════ */

const DEFAULT_STATE = {
  programStart: todayIso(),
  entries: {},
  exHistory: {},
  customExNames: {},
  customWorkouts: {},
  recentCustomExercises: [],
  scans: [],
  view: "calendar",
};

function useAppStorage() {
  const [state,setState] = useState(DEFAULT_STATE);
  const [loaded,setLoaded] = useState(false);

  useEffect(()=>{
    try {
      const raw = localStorage.getItem("pillar_performance_v1");
      if(raw) setState({...DEFAULT_STATE,...JSON.parse(raw)});
    } catch {}
    setLoaded(true);
  },[]);

  const persist = useCallback((s)=>{
    try { localStorage.setItem("pillar_performance_v1",JSON.stringify(s)); } catch {}
  },[]);

  const update = useCallback((patch)=>{
    setState(prev=>{
      const next = typeof patch==="function" ? patch(prev) : {...prev,...patch};
      persist(next);
      return next;
    });
  },[persist]);

  return {state,update,loaded};
}

/* ═══ AUDIO ═══ */
function playChime() {
  try {
    const ctx=new (window.AudioContext||window.webkitAudioContext)();
    [523.25,659.25,783.99,1046.5].forEach((freq,i)=>{
      const osc=ctx.createOscillator(),g=ctx.createGain();
      osc.connect(g);g.connect(ctx.destination);
      osc.frequency.value=freq;osc.type="sine";
      const t=ctx.currentTime+i*0.18;
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.3,t+0.04);g.gain.exponentialRampToValueAtTime(0.001,t+0.55);
      osc.start(t);osc.stop(t+0.65);
    });
  } catch {}
}

/* ═══ REST TIMER ═══ */
function RestTimer({onDone}) {
  const [rem,setRem]=useState(REST_S);
  const iv=useRef(null);
  useEffect(()=>{
    iv.current=setInterval(()=>{ setRem(r=>{ if(r<=1){clearInterval(iv.current);playChime();setTimeout(onDone,2200);return 0;} return r-1; }); },1000);
    return()=>clearInterval(iv.current);
  },[]);
  const pct=((REST_S-rem)/REST_S)*100;
  return (
    <div style={{margin:"10px 0 4px",background:SURFACE,borderRadius:10,padding:"12px 14px",border:`1px solid ${BORDER}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:10,fontWeight:700,letterSpacing:1.5,color:rem===0?TEALL:T2}}>{rem===0?"GO":"REST"}</span>
        <span style={{fontSize:20,fontWeight:900,letterSpacing:-1,color:TEALL}}>{Math.floor(rem/60)}:{String(rem%60).padStart(2,"0")}</span>
      </div>
      <div style={{height:2,background:T3,borderRadius:1}}><div style={{height:"100%",width:`${pct}%`,background:TEAL,borderRadius:1,transition:"width 1s linear"}}/></div>
      {rem>0&&<button onClick={()=>{clearInterval(iv.current);onDone();}} style={{marginTop:8,background:"none",border:"none",color:T3,fontSize:11,cursor:"pointer",padding:0}}>Skip →</button>}
    </div>
  );
}

/* ═══ SHARED UI ═══ */
function ProgressBar({done,total}) {
  const pct=total>0?Math.round((done/total)*100):0;
  return (
    <div style={{marginBottom:18}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
        <span style={{fontSize:11,color:T3}}>Progress</span>
        <span style={{fontSize:11,fontWeight:700,color:pct===100?TEALL:T3}}>{pct}%</span>
      </div>
      <div style={{height:2,background:T3,borderRadius:1}}><div style={{height:"100%",width:`${pct}%`,background:pct===100?TEALL:TEAL,borderRadius:1,transition:"width 0.35s ease"}}/></div>
    </div>
  );
}

function Tick({on,onToggle,size=22}) {
  return (
    <button onClick={onToggle} style={{width:size,height:size,borderRadius:6,flexShrink:0,cursor:"pointer",border:`1.5px solid ${on?TEAL:T3}`,background:on?TEAL:"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
      {on&&<span style={{fontSize:size*0.55,color:"#fff",fontWeight:900,lineHeight:1}}>✓</span>}
    </button>
  );
}

/* ═══ HabitBox — tick to confirm ═══ */
function HabitBox({label,value,onChange,placeholder,type="text"}) {
  const [confirmed,setConfirmed]=useState(!!value);
  const [draft,setDraft]=useState(value||"");
  useEffect(()=>{ setDraft(value||""); if(value) setConfirmed(true); },[]);
  if(confirmed&&value) return (
    <button onClick={()=>setConfirmed(false)} style={{width:"100%",textAlign:"left",background:SURFACE,border:`1px solid ${BORDERA}`,borderRadius:10,padding:"12px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>
        <div style={{fontSize:9,color:T3,letterSpacing:1,marginBottom:2}}>{label.toUpperCase()}</div>
        <div style={{fontSize:15,fontWeight:700,color:TEALL}}>{value}</div>
      </div>
      <div style={{width:20,height:20,borderRadius:"50%",background:TEAL,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <span style={{fontSize:11,color:"#fff",fontWeight:900}}>✓</span>
      </div>
    </button>
  );
  return (
    <div style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:10,padding:"12px 14px"}}>
      <div style={{fontSize:9,color:T3,letterSpacing:1,marginBottom:6}}>{label.toUpperCase()}</div>
      <div style={{display:"flex",gap:8}}>
        <input type={type} placeholder={placeholder} value={draft} onChange={e=>setDraft(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter"&&draft){onChange(draft);setConfirmed(true);} }}
          style={{flex:1,background:"rgba(255,255,255,0.05)",border:`1px solid ${BORDER}`,borderRadius:6,padding:"8px 10px",color:T1,fontSize:15,fontWeight:700,boxSizing:"border-box"}}/>
        <button onClick={()=>{ if(draft){onChange(draft);setConfirmed(true);} }} disabled={!draft}
          style={{width:36,flexShrink:0,borderRadius:6,border:`1px solid ${draft?TEAL:BORDER}`,background:draft?TEAL:"transparent",color:draft?"#fff":T3,cursor:draft?"pointer":"default",fontSize:14,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>
          ✓
        </button>
      </div>
    </div>
  );
}

/* ═══ HEXAGON DAY CELL ═══ */
function HexCell({iso,entry,dayNumber,isToday,onClick}) {
  const completed=!!entry?.completed;
  let hexFill="transparent",hexStroke="rgba(255,255,255,0.14)",strokeWidth=1.5;
  if(entry){
    if(entry.type==="workout"||entry.type==="custom"||entry.type==="run"){
      hexFill=completed?TEAL:"rgba(13,148,136,0.18)"; hexStroke=TEAL; strokeWidth=completed?0:2;
    } else if(entry.type==="rest-active"){
      hexFill=completed?"#ffffff":"rgba(255,255,255,0.14)"; hexStroke="#fff"; strokeWidth=completed?0:2;
    } else if(entry.type==="rest-full"){
      hexFill="transparent"; hexStroke="#fff"; strokeWidth=2;
    }
  }
  const textColor=completed?(entry.type==="rest-active"?"#000":"#fff"):T1;
  return (
    <button onClick={onClick} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
      <div style={{position:"relative",width:44,height:44}}>
        <svg viewBox="0 0 100 100" width="44" height="44" style={{position:"absolute",top:0,left:0}}>
          <polygon points="50,3 93,26 93,74 50,97 7,74 7,26" fill={hexFill} stroke={hexStroke} strokeWidth={strokeWidth}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
          {dayNumber?<span style={{fontSize:15,fontWeight:900,color:textColor}}>{dayNumber}</span>
            :isToday?<div style={{width:7,height:7,borderRadius:"50%",background:TEALL}}/>:null}
        </div>
        {isToday&&<div style={{position:"absolute",inset:-4,border:`2px solid ${TEALL}`,borderRadius:"50%",pointerEvents:"none",boxShadow:`0 0 0 2px rgba(45,212,191,0.15)`}}/>}
      </div>
      <span style={{fontSize:9,color:isToday?TEALL:T3,fontWeight:isToday?700:400}}>{fmtDDMM(iso)}</span>
    </button>
  );
}

/* ═══ CALENDAR SCREEN ═══ */
function CalendarScreen({entries,programStart,onOpenDay,quote}) {
  const sortedLogged=Object.keys(entries).filter(iso=>entries[iso]?.completed).sort();
  const seqNum={}; sortedLogged.forEach((iso,i)=>{ seqNum[iso]=i+1; });
  const today=todayIso();
  const [weeksBack,setWeeksBack]=useState(2);
  const [weeksFwd,setWeeksFwd]=useState(2);
  const centerWeekStart=startOfWeek(today);
  const weeks=[]; for(let w=-weeksBack;w<=weeksFwd;w++) weeks.push(addDays(centerWeekStart,w*7));
  let streak=0,cursor=today; while(entries[cursor]?.completed){streak++;cursor=addDays(cursor,-1);}
  return (
    <div style={{paddingBottom:20}}>
      <div style={{padding:"52px 24px 24px",borderBottom:`1px solid ${BORDER}`}}>
        <div style={{fontSize:9,color:T3,letterSpacing:2.5,textTransform:"uppercase",marginBottom:6}}>
          Pillar Performance · {MONTH_NAMES[dateFromIso(today).getMonth()]} {dateFromIso(today).getFullYear()}
        </div>
        <h1 style={{fontSize:26,fontWeight:900,margin:"0 0 6px",letterSpacing:-1,color:T1}}>
          {streak>0?<>{streak}-day <span style={{color:TEALL}}>streak</span></>:<>Let's <span style={{color:TEALL}}>begin</span></>}
        </h1>
        <p style={{fontSize:13,color:T3,fontStyle:"italic",lineHeight:1.6,margin:"6px 0 0",maxWidth:300}}>"{quote}"</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"16px 16px 6px",textAlign:"center"}}>
        {DAY_NAMES.map(d=><div key={d} style={{fontSize:9,color:T3,fontWeight:700,letterSpacing:1}}>{d.toUpperCase()}</div>)}
      </div>
      <div style={{padding:"0 12px"}}>
        {weeks.map(wStart=>{
          const phase=phaseForIso(programStart,wStart);
          return (
            <div key={wStart} style={{position:"relative",marginBottom:14}}>
              {/* Watermark — Option 2: slate grey, weight 300, font-size ~17px (half of 34) */}
              <div style={{position:"absolute",top:-2,left:4,fontSize:17,fontWeight:300,color:"rgba(148,163,184,0.2)",letterSpacing:-0.5,pointerEvents:"none",userSelect:"none"}}>
                {phase.toUpperCase()}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,position:"relative"}}>
                {Array.from({length:7},(_,i)=>{
                  const iso=addDays(wStart,i);
                  return <HexCell key={iso} iso={iso} entry={entries[iso]} dayNumber={entries[iso]?.completed?seqNum[iso]:null} isToday={iso===today} onClick={()=>onOpenDay(iso)}/>;
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{display:"flex",gap:10,padding:"12px 20px 4px"}}>
        <button onClick={()=>setWeeksBack(w=>w+8)} style={{flex:1,padding:"10px",borderRadius:10,border:`1px solid ${BORDER}`,background:"transparent",color:T3,fontSize:11,fontWeight:700,cursor:"pointer"}}>Go back further ↑</button>
        <button onClick={()=>setWeeksFwd(w=>w+8)} style={{flex:1,padding:"10px",borderRadius:10,border:`1px solid ${BORDER}`,background:"transparent",color:T3,fontSize:11,fontWeight:700,cursor:"pointer"}}>Load later ↓</button>
      </div>
      <div style={{padding:"16px 20px 0",display:"flex",gap:10,flexWrap:"wrap"}}>
        {[["Workout / Run",TEAL,"solid"],["Active Rest","#fff","solid"],["Full Rest","#fff","outline"]].map(([lbl,col,st])=>(
          <div key={lbl} style={{display:"flex",alignItems:"center",gap:6}}>
            <svg viewBox="0 0 100 100" width="14" height="14"><polygon points="50,3 93,26 93,74 50,97 7,74 7,26" fill={st==="solid"?col:"transparent"} stroke={col} strokeWidth={st==="outline"?8:0}/></svg>
            <span style={{fontSize:10,color:T3}}>{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ EXERCISE ROW — no did-not-complete, no skipped state ═══ */
function ExRow({ex,exKey,histKey,phase,payload,onChangeField,checked,onCheck,customName,onCustomName,exHistory,onUpdateHistory,onRemoveExercise}) {
  const [open,setOpen]=useState(false);
  const [timer,setTimer]=useState(null);
  const [editing,setEditing]=useState(false);
  const [nameInput,setNameInput]=useState(customName||ex.name);
  const saved=payload[exKey]||{};
  const targetReps=ex.reps+PHASE_REPMOD[phase];
  const hist=exHistory[histKey];
  const sugKg=hist?.lastKg?hist.lastKg:suggestKg(ex.baseKg,phase);
  const displayName=customName||ex.name;

  const handleNameSave=()=>{ if(nameInput.trim()) onCustomName(nameInput.trim()); setEditing(false); };

  useEffect(()=>{
    const s0ok=saved.s0_reps&&saved.s0_kg, s1ok=saved.s1_reps&&saved.s1_kg;
    if(s0ok&&s1ok){
      if(!checked) onCheck(exKey);
      onUpdateHistory(histKey,{lastReps:saved.s1_reps,lastKg:saved.s1_kg,lastDate:todayIso()});
    }
  },[saved.s0_reps,saved.s0_kg,saved.s1_reps,saved.s1_kg]);

  return (
    <div style={{borderBottom:`1px solid rgba(13,148,136,0.12)`,opacity:checked?0.55:1,transition:"opacity 0.25s"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0"}}>
        <Tick on={checked} onToggle={()=>onCheck(exKey)}/>
        <button onClick={()=>setOpen(o=>!o)} style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",padding:0}}>
          <div style={{textAlign:"left"}}>
            <span style={{fontSize:9,fontWeight:700,letterSpacing:1,color:ex.type==="athletic"?TEALL:T2,background:ex.type==="athletic"?"rgba(20,184,166,0.12)":"rgba(148,163,184,0.08)",padding:"2px 6px",borderRadius:3,textTransform:"uppercase",display:"inline-block",marginBottom:4}}>
              {ex.type==="athletic"?"Athletic":"Build"}
            </span>
            <div style={{fontSize:15,fontWeight:500,color:T1}}>{displayName}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:12,color:T3}}>2×{targetReps}</span>
            <span style={{color:T3,fontSize:11,transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}>▾</span>
          </div>
        </button>
        {/* Remove exercise button */}
        <button onClick={()=>onRemoveExercise(exKey)} style={{background:"none",border:"none",color:T3,fontSize:14,cursor:"pointer",padding:"0 2px",flexShrink:0}} title="Remove exercise">✕</button>
      </div>
      {open&&(
        <div style={{paddingBottom:16,paddingLeft:32}}>
          {/* Editable name row */}
          <div style={{marginBottom:12,background:"rgba(13,148,136,0.06)",borderRadius:8,padding:"10px 12px",border:`1px solid ${BORDER}`}}>
            {editing?(
              <div style={{display:"flex",gap:6}}>
                <input value={nameInput} onChange={e=>setNameInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")handleNameSave();}}
                  style={{flex:1,background:"rgba(255,255,255,0.05)",border:`1px solid ${BORDERA}`,borderRadius:6,padding:"6px 8px",color:T1,fontSize:13,fontWeight:600,boxSizing:"border-box"}} autoFocus/>
                <button onClick={handleNameSave} style={{padding:"6px 12px",borderRadius:6,border:"none",background:TEAL,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Save</button>
                <button onClick={()=>{setEditing(false);setNameInput(customName||ex.name);}} style={{padding:"6px 10px",borderRadius:6,border:`1px solid ${BORDER}`,background:"transparent",color:T3,fontSize:12,cursor:"pointer"}}>✕</button>
              </div>
            ):(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:11,color:T2,fontStyle:"italic"}}>{ex.note}</span>
                <button onClick={()=>setEditing(true)} style={{background:"none",border:"none",color:T3,fontSize:10,cursor:"pointer",fontWeight:600,flexShrink:0,marginLeft:8}}>EDIT</button>
              </div>
            )}
          </div>
          {sugKg&&<div style={{fontSize:12,color:T3,marginBottom:12}}>
            {hist?.lastKg?"Last time: ":"Suggested: "}
            <span style={{color:TEALL,fontWeight:700}}>{sugKg} kg{hist?.lastReps?` × ${hist.lastReps}`:""}</span>
            <span style={{color:T3,fontSize:11}}> — adjust by feel</span>
          </div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[0,1].map(si=>(
              <div key={si} style={{background:"rgba(13,148,136,0.06)",borderRadius:10,padding:"12px 10px",border:`1px solid ${BORDER}`}}>
                <div style={{fontSize:9,color:T3,fontWeight:700,letterSpacing:1,marginBottom:8}}>SET {si+1}</div>
                <div style={{display:"flex",gap:6,marginBottom:8}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:8,color:T3,marginBottom:3}}>REPS</div>
                    <input type="number" placeholder={targetReps} value={saved[`s${si}_reps`]||""} onChange={e=>onChangeField(exKey,`s${si}_reps`,e.target.value)}
                      style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${BORDER}`,borderRadius:6,padding:"8px 7px",color:T1,fontSize:15,fontWeight:700,boxSizing:"border-box"}}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:8,color:T3,marginBottom:3}}>KG{sugKg?<span style={{color:T3}}> ~{sugKg}</span>:""}</div>
                    <input type="number" placeholder={sugKg??"BW"} value={saved[`s${si}_kg`]||""} onChange={e=>onChangeField(exKey,`s${si}_kg`,e.target.value)}
                      style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${BORDER}`,borderRadius:6,padding:"8px 7px",color:T1,fontSize:15,fontWeight:700,boxSizing:"border-box"}}/>
                  </div>
                </div>
                <button onClick={()=>setTimer(si)} style={{width:"100%",padding:"5px 0",borderRadius:6,border:`1px solid ${BORDER}`,background:"transparent",color:T3,fontSize:9,fontWeight:700,cursor:"pointer",letterSpacing:0.5}}>START REST</button>
              </div>
            ))}
          </div>
          {timer!==null&&<RestTimer key={`${exKey}-t${timer}`} onDone={()=>setTimer(null)}/>}
        </div>
      )}
    </div>
  );
}

/* ═══ FREE-FORM EXERCISE ROW (custom-created, no default targets) ═══ */
function FreeExRow({name,exKey,payload,onChangeField,checked,onCheck,onRemove}) {
  const [open,setOpen]=useState(false);
  const [timer,setTimer]=useState(null);
  const saved=payload[exKey]||{};
  useEffect(()=>{
    if(saved.s0_reps&&saved.s0_kg&&saved.s1_reps&&saved.s1_kg&&!checked) onCheck(exKey);
  },[saved.s0_reps,saved.s0_kg,saved.s1_reps,saved.s1_kg]);
  return (
    <div style={{borderBottom:`1px solid rgba(13,148,136,0.12)`,opacity:checked?0.55:1,transition:"opacity 0.25s"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0"}}>
        <Tick on={checked} onToggle={()=>onCheck(exKey)}/>
        <button onClick={()=>setOpen(o=>!o)} style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",padding:0}}>
          <div style={{textAlign:"left"}}>
            <span style={{fontSize:9,fontWeight:700,letterSpacing:1,color:T2,background:"rgba(148,163,184,0.08)",padding:"2px 6px",borderRadius:3,textTransform:"uppercase",display:"inline-block",marginBottom:4}}>Custom</span>
            <div style={{fontSize:15,fontWeight:500,color:T1}}>{name}</div>
          </div>
          <span style={{color:T3,fontSize:11,transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}>▾</span>
        </button>
        <button onClick={onRemove} style={{background:"none",border:"none",color:T3,fontSize:14,cursor:"pointer",padding:"0 2px",flexShrink:0}}>✕</button>
      </div>
      {open&&(
        <div style={{paddingBottom:16,paddingLeft:32}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
            {[0,1].map(si=>(
              <div key={si} style={{background:"rgba(13,148,136,0.06)",borderRadius:10,padding:"12px 10px",border:`1px solid ${BORDER}`}}>
                <div style={{fontSize:9,color:T3,fontWeight:700,letterSpacing:1,marginBottom:8}}>SET {si+1}</div>
                <div style={{display:"flex",gap:6,marginBottom:8}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:8,color:T3,marginBottom:3}}>REPS</div>
                    <input type="number" placeholder="—" value={saved[`s${si}_reps`]||""} onChange={e=>onChangeField(exKey,`s${si}_reps`,e.target.value)}
                      style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${BORDER}`,borderRadius:6,padding:"8px 7px",color:T1,fontSize:15,fontWeight:700,boxSizing:"border-box"}}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:8,color:T3,marginBottom:3}}>KG / TIME</div>
                    <input type="text" placeholder="BW" value={saved[`s${si}_kg`]||""} onChange={e=>onChangeField(exKey,`s${si}_kg`,e.target.value)}
                      style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${BORDER}`,borderRadius:6,padding:"8px 7px",color:T1,fontSize:15,fontWeight:700,boxSizing:"border-box"}}/>
                  </div>
                </div>
                <button onClick={()=>setTimer(si)} style={{width:"100%",padding:"5px 0",borderRadius:6,border:`1px solid ${BORDER}`,background:"transparent",color:T3,fontSize:9,fontWeight:700,cursor:"pointer",letterSpacing:0.5}}>START REST</button>
              </div>
            ))}
          </div>
          {timer!==null&&<RestTimer key={`${exKey}-t${timer}`} onDone={()=>setTimer(null)}/>}
        </div>
      )}
    </div>
  );
}

/* ═══ CREATE EXERCISE BOX ═══ */
function CreateExerciseBox({onAdd,recentExercises}) {
  const [open,setOpen]=useState(false);
  const [name,setName]=useState("");
  const handleAdd=(exName)=>{ const n=(exName||name).trim(); if(!n)return; onAdd(n); setName(""); setOpen(false); };
  if(!open) return (
    <button onClick={()=>setOpen(true)} style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px dashed ${BORDERA}`,background:"transparent",color:TEAL,fontSize:12,fontWeight:700,cursor:"pointer",marginBottom:10,textAlign:"left"}}>
      + Add exercise
    </button>
  );
  return (
    <div style={{background:"rgba(13,148,136,0.06)",border:`1px solid ${BORDERA}`,borderRadius:10,padding:12,marginBottom:10}}>
      <div style={{fontSize:9,color:TEAL,fontWeight:700,letterSpacing:1,marginBottom:8}}>NEW EXERCISE</div>
      <div style={{display:"flex",gap:6,marginBottom:recentExercises?.length?10:0}}>
        <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")handleAdd();}} placeholder="Exercise name..." autoFocus
          style={{flex:1,background:"rgba(255,255,255,0.05)",border:`1px solid ${BORDER}`,borderRadius:6,padding:"8px 10px",color:T1,fontSize:13,boxSizing:"border-box"}}/>
        <button onClick={()=>handleAdd()} style={{padding:"8px 14px",borderRadius:6,border:"none",background:TEAL,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Add</button>
        <button onClick={()=>{setOpen(false);setName("");}} style={{padding:"8px 10px",borderRadius:6,border:`1px solid ${BORDER}`,background:"transparent",color:T3,fontSize:12,cursor:"pointer"}}>✕</button>
      </div>
      {recentExercises?.length>0&&(
        <div>
          <div style={{fontSize:8,color:T3,marginBottom:6,letterSpacing:0.8}}>RECENTLY ADDED</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {recentExercises.map((rn,i)=>(
              <button key={i} onClick={()=>handleAdd(rn)} style={{padding:"6px 10px",borderRadius:6,border:`1px solid ${BORDER}`,background:"rgba(13,148,136,0.08)",color:TEALL,fontSize:11,fontWeight:600,cursor:"pointer"}}>{rn}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ MUSCLE GROUP — inline add/remove exercises ═══ */
function MuscleGroup({groupName,exercises,extraExercises,phase,payload,onChangeField,checked,onCheck,customExNames,onCustomExName,exHistory,onUpdateHistory,onRemoveGroup,onAddExercise,onRemoveExercise,recentCustomExercises,onAddRecentExercise}) {
  // exercises = default library exercises
  // extraExercises = [{name,key}] added this session
  const baseKeys  = exercises.map((_,i)=>`${groupName}-${i}`);
  const extraKeys = (extraExercises||[]).map(e=>e.key);
  const allKeys   = [...baseKeys,...extraKeys];
  const allFilled = exercises.every((_,i)=>{ const d=payload[baseKeys[i]]||{}; return d.s0_reps&&d.s0_kg&&d.s1_reps&&d.s1_kg; });
  const anyDone   = allKeys.every(k=>checked[k]);
  const [open,setOpen]=useState(false);

  useEffect(()=>{ if(allFilled&&!anyDone){ baseKeys.forEach(k=>{ if(!checked[k])onCheck(k); }); setOpen(false); } },[allFilled]);

  const handleGroupTick=()=>{
    if(!anyDone){ allKeys.forEach(k=>{ if(!checked[k])onCheck(k); }); setOpen(false); }
    else { allKeys.forEach(k=>{ if(checked[k])onCheck(k); }); setOpen(true); }
  };

  const handleAddExercise=(name)=>{ onAddExercise(groupName,name); onAddRecentExercise(name); };

  return (
    <div style={{background:anyDone?"rgba(13,148,136,0.08)":SURFACE,borderRadius:12,marginBottom:8,overflow:"hidden",border:`1px solid ${anyDone?BORDERA:BORDER}`,transition:"all 0.3s"}}>
      <div style={{display:"flex",alignItems:"center",padding:"13px 16px",gap:10}}>
        <Tick on={anyDone} onToggle={handleGroupTick}/>
        <button onClick={()=>setOpen(o=>!o)} style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",padding:0}}>
          <span style={{fontSize:11,fontWeight:700,color:anyDone?TEALL:T1,letterSpacing:1.5,textTransform:"uppercase"}}>{groupName}</span>
          <span style={{color:T3,fontSize:11,transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}>▾</span>
        </button>
        <button onClick={()=>onRemoveGroup(groupName)} style={{background:"none",border:"none",color:T3,fontSize:14,cursor:"pointer",padding:"0 2px",flexShrink:0}} title="Remove group">✕</button>
      </div>
      {open&&(
        <>
          <div style={{padding:"0 16px"}}>
            {/* Default exercises */}
            {exercises.map((ex,i)=>{
              const exKey=baseKeys[i], histKey=`${groupName}-${i}`;
              return (
                <ExRow key={exKey} ex={ex} exKey={exKey} histKey={histKey} phase={phase}
                  payload={payload} onChangeField={onChangeField}
                  checked={!!checked[exKey]} onCheck={onCheck}
                  customName={customExNames[histKey]} onCustomName={n=>onCustomExName(histKey,n)}
                  exHistory={exHistory} onUpdateHistory={onUpdateHistory}
                  onRemoveExercise={(k)=>onRemoveExercise(groupName,k)}
                />
              );
            })}
            {/* Extra exercises added this session */}
            {(extraExercises||[]).map(e=>(
              <FreeExRow key={e.key} name={e.name} exKey={e.key} payload={payload} onChangeField={onChangeField}
                checked={!!checked[e.key]} onCheck={onCheck} onRemove={()=>onRemoveExercise(groupName,e.key)}/>
            ))}
            {/* Add exercise button */}
            <CreateExerciseBox onAdd={handleAddExercise} recentExercises={recentCustomExercises}/>
          </div>
          <button onClick={()=>setOpen(false)} style={{width:"100%",background:"none",border:"none",borderTop:`1px solid ${BORDER}`,padding:"9px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:T3}}>
            <span style={{fontSize:9,fontWeight:700,letterSpacing:1}}>COLLAPSE ▲</span>
          </button>
        </>
      )}
    </div>
  );
}

/* ═══ GROUP PICKER DROPDOWN ═══ */
function GroupPicker({activeGroups,onToggleGroup}) {
  const [open,setOpen]=useState(false);
  return (
    <div style={{marginBottom:14}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",padding:"11px 14px",borderRadius:10,border:`1px solid ${BORDER}`,background:SURFACE,color:TEALL,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span>+ / − Add or remove muscle groups</span>
        <span style={{transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}>▾</span>
      </button>
      {open&&(
        <div style={{marginTop:6,background:"#111",border:`1px solid ${BORDERA}`,borderRadius:10,padding:10}}>
          {ALL_GROUPS.map(g=>{
            const active=activeGroups.includes(g);
            return (
              <button key={g} onClick={()=>onToggleGroup(g)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 10px",borderRadius:8,border:"none",background:active?"rgba(13,148,136,0.15)":"transparent",color:active?TEALL:T2,fontSize:13,fontWeight:600,cursor:"pointer",marginBottom:2}}>
                <span>{g}</span>
                <Tick on={active} onToggle={()=>{}} size={18}/>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══ CALISTHENICS ═══ */
function CaliSection({phase,payload,onChangeField,checked,onCheck,onRemove}) {
  const p=CALI_PROGRAMS[phase];
  const [open,setOpen]=useState(false);
  const [timer,setTimer]=useState(null);
  const holdKey=`cali-hold`;
  const savedHold=payload[holdKey]||{};
  const drills=p.drills.filter(d=>!d.free);
  const caliKeys=drills.map((_,i)=>`cali-${i}`);
  const allDone=caliKeys.every(k=>checked[k]);
  const handleGroupTick=()=>{
    if(!allDone){ caliKeys.forEach(k=>{ if(!checked[k])onCheck(k); }); setOpen(false); }
    else { caliKeys.forEach(k=>{ if(checked[k])onCheck(k); }); setOpen(true); }
  };
  return (
    <div style={{background:allDone?"rgba(13,148,136,0.08)":SURFACE,border:`1px solid ${allDone?BORDERA:BORDER}`,borderRadius:12,marginBottom:14,overflow:"hidden",transition:"all 0.3s"}}>
      <div style={{display:"flex",alignItems:"center",padding:"15px 16px",gap:10}}>
        <Tick on={allDone} onToggle={handleGroupTick}/>
        <button onClick={()=>setOpen(o=>!o)} style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",padding:0}}>
          <div>
            <div style={{fontSize:9,color:T2,fontWeight:700,letterSpacing:1.5,marginBottom:3}}>CALISTHENICS · 20 MIN</div>
            <div style={{fontSize:15,fontWeight:700,color:allDone?TEALL:T1}}>{p.skill}</div>
          </div>
          <span style={{color:T3,fontSize:11,transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}>▾</span>
        </button>
        {onRemove&&<button onClick={onRemove} style={{background:"none",border:"none",color:T3,fontSize:14,cursor:"pointer",padding:"0 2px",flexShrink:0}}>✕</button>}
      </div>
      {open&&(
        <>
          <div style={{padding:"0 16px 4px"}}>
            <p style={{fontSize:11,color:T3,marginBottom:14,fontStyle:"italic"}}>{p.note}</p>
            {drills.map((d,i)=>{
              const ck=caliKeys[i], done=!!checked[ck];
              return (
                <div key={i}>
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:`1px solid rgba(13,148,136,0.08)`,opacity:done?0.4:1,transition:"opacity 0.2s"}}>
                    <Tick on={done} onToggle={()=>{ onCheck(ck); if(!done)setTimer(i); }}/>
                    <span style={{flex:1,fontSize:13,color:T2}}>{d.n}</span>
                    <span style={{fontSize:12,color:TEAL,fontWeight:700}}>{d.s}</span>
                  </div>
                  {timer===i&&!done&&<RestTimer key={`cali-${i}`} onDone={()=>setTimer(null)}/>}
                </div>
              );
            })}
            <div style={{margin:"16px 0",background:"rgba(13,148,136,0.06)",borderRadius:10,padding:"14px",border:`1px solid ${BORDER}`}}>
              <div style={{fontSize:9,color:TEAL,fontWeight:700,letterSpacing:1.2,marginBottom:8}}>FREESTANDING HANDSTAND</div>
              <p style={{fontSize:11,color:T3,marginBottom:10,fontStyle:"italic"}}>{p.drills.find(d=>d.free)?.s}</p>
              <div style={{fontSize:9,color:T3,marginBottom:5,letterSpacing:0.8}}>LONGEST HOLD (seconds)</div>
              <input type="number" placeholder="e.g. 15" value={savedHold.hold||""} onChange={e=>onChangeField(holdKey,"hold",e.target.value)}
                style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${BORDER}`,borderRadius:8,padding:"10px 12px",color:TEALL,fontSize:22,fontWeight:900,boxSizing:"border-box"}}/>
              {savedHold.hold&&<div style={{fontSize:11,color:T3,marginTop:5}}>↑ {savedHold.hold}s logged</div>}
            </div>
          </div>
          <button onClick={()=>setOpen(false)} style={{width:"100%",background:"none",border:"none",borderTop:`1px solid ${BORDER}`,padding:"9px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:T3}}>
            <span style={{fontSize:9,fontWeight:700,letterSpacing:1}}>COLLAPSE ▲</span>
          </button>
        </>
      )}
    </div>
  );
}

/* ═══ RUN BLOCK ═══ */
function RunBlock({phase,payload,onChangeField,checked,onCheck}) {
  const s=RUN_TEMPLATES[phase], sk="run", saved=payload[sk]||{}, done=!!checked[sk];
  return (
    <div style={{background:SURFACE,border:`1px solid ${done?BORDERA:BORDER}`,borderRadius:12,padding:"16px"}}>
      <div style={{fontSize:9,color:T2,fontWeight:700,letterSpacing:1.5,marginBottom:4}}>RUN · {s.dist}</div>
      <div style={{fontSize:15,fontWeight:700,color:done?TEALL:T1,marginBottom:10}}>{s.label}</div>
      <p style={{fontSize:13,color:T2,marginBottom:6,lineHeight:1.65}}>{s.structure}</p>
      <p style={{fontSize:12,color:T3,fontStyle:"italic",marginBottom:16}}>↳ {s.tip}</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
        {[["Time (mm:ss)","time","11:42"],["Avg Pace /km","pace","3:54"],["Avg HR (bpm)","hr","162"],["Distance (km)","dist","3.0"]].map(([lbl,field,ph])=>(
          <div key={field}>
            <div style={{fontSize:9,color:T3,marginBottom:4}}>{lbl}</div>
            <input type="text" placeholder={ph} value={saved[field]||""} onChange={e=>onChangeField(sk,field,e.target.value)}
              style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${BORDER}`,borderRadius:6,padding:"9px 10px",color:T1,fontSize:14,fontWeight:700,boxSizing:"border-box"}}/>
          </div>
        ))}
      </div>
      <button onClick={()=>onCheck(sk)} style={{width:"100%",padding:"12px",borderRadius:10,border:`1px solid ${BORDER}`,cursor:"pointer",fontWeight:700,fontSize:14,transition:"all 0.2s",background:done?TEAL:"transparent",color:done?"#fff":T2}}>
        {done?"✓ Run Complete":"Mark Run Complete"}
      </button>
    </div>
  );
}

/* ═══ REST DAY INPUT ═══ */
function RestDayInput({payload,onChangeField}) {
  const saved=payload["rest"]||{};
  return (
    <div style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:12,padding:"16px"}}>
      <div style={{fontSize:9,color:T2,fontWeight:700,letterSpacing:1.5,marginBottom:12}}>RECOVERY TYPE</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>
        {REST_TYPES.map(rt=>(
          <button key={rt} onClick={()=>onChangeField("rest","restType",rt)}
            style={{padding:"8px 10px",borderRadius:8,border:`1px solid ${saved.restType===rt?TEAL:BORDER}`,background:saved.restType===rt?"rgba(13,148,136,0.15)":"transparent",color:saved.restType===rt?TEALL:T3,fontSize:12,fontWeight:600,cursor:"pointer",textAlign:"left"}}>
            {rt}
          </button>
        ))}
      </div>
      {saved.restType==="Other"&&(
        <input placeholder="Describe activity..." value={saved.restOther||""} onChange={e=>onChangeField("rest","restOther",e.target.value)}
          style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${BORDER}`,borderRadius:6,padding:"8px 10px",color:T1,fontSize:13,boxSizing:"border-box",marginBottom:10}}/>
      )}
      {saved.restType&&saved.restType!=="Full Rest"&&(
        <textarea placeholder="Notes on your session..." value={saved.restNotes||""} onChange={e=>onChangeField("rest","restNotes",e.target.value)}
          style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${BORDER}`,borderRadius:6,padding:"8px 10px",color:T1,fontSize:12,boxSizing:"border-box",minHeight:60,resize:"vertical",fontFamily:"inherit"}}/>
      )}
    </div>
  );
}

/* ═══ CUSTOM WORKOUT BUILDER ═══ */
function CustomWorkoutBuilder({onSave,onCancel,recentCustomExercises,onAddRecentExercise}) {
  const [name,setName]=useState(""); const [note,setNote]=useState("");
  const [includeCali,setIncludeCali]=useState(false);
  const [selectedGroups,setSelectedGroups]=useState([]);
  const [customItems,setCustomItems]=useState([]);
  const [newExName,setNewExName]=useState("");
  const toggleGroup=(g)=>setSelectedGroups(p=>p.includes(g)?p.filter(x=>x!==g):[...p,g]);
  const addItem=(nm)=>{ const n=(nm??newExName).trim(); if(!n)return; setCustomItems(p=>[...p,{name:n}]); setNewExName(""); onAddRecentExercise(n); };
  return (
    <div style={{background:"#111",border:`1px solid ${BORDERA}`,borderRadius:14,padding:18,marginBottom:14}}>
      <div style={{fontSize:9,color:TEAL,fontWeight:700,letterSpacing:1.5,marginBottom:14}}>BUILD CUSTOM WORKOUT</div>
      <div style={{marginBottom:12}}>
        <div style={{fontSize:9,color:T3,marginBottom:5}}>WORKOUT NAME</div>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Tendon & Mobility Day"
          style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${BORDER}`,borderRadius:8,padding:"10px 12px",color:T1,fontSize:14,fontWeight:600,boxSizing:"border-box"}}/>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:9,color:T3,marginBottom:5}}>NOTE (optional)</div>
        <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="What's this workout for?"
          style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${BORDER}`,borderRadius:8,padding:"10px 12px",color:T1,fontSize:13,boxSizing:"border-box",minHeight:56,resize:"vertical",fontFamily:"inherit"}}/>
      </div>
      <button onClick={()=>setIncludeCali(c=>!c)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,border:`1px solid ${BORDER}`,background:includeCali?"rgba(13,148,136,0.1)":"transparent",marginBottom:14,cursor:"pointer"}}>
        <Tick on={includeCali} onToggle={()=>{}} size={18}/>
        <span style={{fontSize:13,color:includeCali?TEALL:T2,fontWeight:600}}>Include calisthenics block</span>
      </button>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:9,color:T3,marginBottom:8}}>MUSCLE GROUPS</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {ALL_GROUPS.map(g=>{ const active=selectedGroups.includes(g); return (
            <button key={g} onClick={()=>toggleGroup(g)} style={{padding:"8px 10px",borderRadius:8,border:`1px solid ${active?TEALA:BORDER}`,background:active?"rgba(13,148,136,0.15)":"transparent",color:active?TEALL:T2,fontSize:12,fontWeight:600,cursor:"pointer",textAlign:"left"}}>{g}</button>
          ); })}
        </div>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:9,color:T3,marginBottom:8}}>EXERCISES (e.g. Pilates moves)</div>
        <div style={{display:"flex",gap:6,marginBottom:8}}>
          <input value={newExName} onChange={e=>setNewExName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addItem();}} placeholder="Exercise name..."
            style={{flex:1,background:"rgba(255,255,255,0.05)",border:`1px solid ${BORDER}`,borderRadius:6,padding:"8px 10px",color:T1,fontSize:13,boxSizing:"border-box"}}/>
          <button onClick={()=>addItem()} style={{padding:"8px 14px",borderRadius:6,border:"none",background:TEAL,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Add</button>
        </div>
        {recentCustomExercises?.length>0&&(
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
            {recentCustomExercises.map((rn,i)=>(
              <button key={i} onClick={()=>addItem(rn)} style={{padding:"6px 10px",borderRadius:6,border:`1px solid ${BORDER}`,background:"rgba(13,148,136,0.08)",color:TEALL,fontSize:11,fontWeight:600,cursor:"pointer"}}>{rn}</button>
            ))}
          </div>
        )}
        {customItems.map((item,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"rgba(13,148,136,0.06)",borderRadius:6,marginBottom:4}}>
            <span style={{fontSize:12,color:T2}}>{item.name}</span>
            <button onClick={()=>setCustomItems(p=>p.filter((_,idx)=>idx!==i))} style={{background:"none",border:"none",color:T3,cursor:"pointer",fontSize:12}}>✕</button>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={onCancel} style={{flex:1,padding:"11px",borderRadius:10,border:`1px solid ${BORDER}`,background:"transparent",color:T3,fontSize:13,fontWeight:700,cursor:"pointer"}}>Cancel</button>
        <button onClick={()=>{ if(!name.trim())return; onSave({name:name.trim(),note,includeCali,groups:selectedGroups,customItems}); }} style={{flex:1,padding:"11px",borderRadius:10,border:"none",background:TEAL,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Save Workout</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DAY SCREEN
═══════════════════════════════════════════════════════════ */

function DayScreen({iso,programStart,entries,onUpdateEntry,exHistory,onUpdateHistory,customExNames,onCustomExName,customWorkouts,onSaveCustomWorkout,recentCustomExercises,onAddRecentExercise,onBack}) {
  const entry=entries[iso]||{};
  const phase=phaseForIso(programStart,iso);
  const isToday=iso===todayIso();
  const [showActivityPicker,setShowActivityPicker]=useState(!entry.type);
  const [showCustomBuilder,setShowCustomBuilder]=useState(false);

  const updateEntry=(patch)=>onUpdateEntry(iso,patch);
  const setPayloadField=(key,field,val)=>updateEntry({payload:{...(entry.payload||{}),[key]:{...((entry.payload||{})[key]||{}),[field]:val}}});
  const toggleChecked=(key)=>updateEntry({checked:{...(entry.checked||{}),[key]:!(entry.checked||{})[key]}});

  const activeUpperGroups=entry.upperGroups||["Chest","Back","Shoulders","Biceps","Triceps"];
  const activeLowerGroups=entry.lowerGroups||["Quads","Hamstrings","Glutes","Calves"];
  const freeExercises=entry.freeExercises||[];      // [{name,key}] global (not per group)
  const groupExercises=entry.groupExercises||{};    // {GroupName: [{name,key}]} per-group extras
  const caliIncluded=entry.includeCali!==false;

  const toggleUpperGroup=(g)=>updateEntry({upperGroups:activeUpperGroups.includes(g)?activeUpperGroups.filter(x=>x!==g):[...activeUpperGroups,g]});
  const toggleLowerGroup=(g)=>updateEntry({lowerGroups:activeLowerGroups.includes(g)?activeLowerGroups.filter(x=>x!==g):[...activeLowerGroups,g]});
  const removeUpperGroup=(g)=>updateEntry({upperGroups:activeUpperGroups.filter(x=>x!==g)});
  const removeLowerGroup=(g)=>updateEntry({lowerGroups:activeLowerGroups.filter(x=>x!==g)});
  const toggleCali=()=>updateEntry({includeCali:!caliIncluded});

  // Add/remove exercises within a specific muscle group
  const handleAddGroupExercise=(groupName,exName)=>{
    const key=`${groupName}-extra-${Date.now()}`;
    const prev=groupExercises[groupName]||[];
    updateEntry({groupExercises:{...groupExercises,[groupName]:[...prev,{name:exName,key}]}});
  };
  const handleRemoveGroupExercise=(groupName,exKey)=>{
    // Could be a default exercise or an extra
    const prev=groupExercises[groupName]||[];
    const filtered=prev.filter(e=>e.key!==exKey);
    // For default exercises (keyed as GroupName-i), mark them removed
    const removedDefaults=entry.removedDefaultExercises||{};
    updateEntry({groupExercises:{...groupExercises,[groupName]:filtered},removedDefaultExercises:{...removedDefaults,[exKey]:true}});
  };

  const removedDefaults=entry.removedDefaultExercises||{};

  // Global free exercises (not tied to a muscle group)
  const addFreeExercise=(name)=>{ const key=`freecreated-${Date.now()}`; updateEntry({freeExercises:[...freeExercises,{name,key}]}); onAddRecentExercise(name); };
  const removeFreeExercise=(key)=>updateEntry({freeExercises:freeExercises.filter(f=>f.key!==key)});

  // Progress item keys
  const getItemKeys=()=>{
    if(entry.type==="workout"){
      const groups=entry.workoutKind==="upper"?activeUpperGroups:activeLowerGroups;
      const exKeys=groups.flatMap(g=>MUSCLE_LIBRARY[g].exercises.map((_,i)=>`${g}-${i}`).filter(k=>!removedDefaults[k]));
      const extraKeys=groups.flatMap(g=>(groupExercises[g]||[]).map(e=>e.key));
      const caliKeys=caliIncluded?CALI_PROGRAMS[phase].drills.filter(d=>!d.free).map((_,i)=>`cali-${i}`):[]; 
      const freeKeys=freeExercises.map(f=>f.key);
      return [...exKeys,...extraKeys,...caliKeys,...freeKeys];
    }
    if(entry.type==="run") return ["run"];
    if(entry.type==="custom"){
      const cw=customWorkouts[entry.customWorkoutId]; if(!cw) return [];
      const exKeys=(cw.groups||[]).flatMap(g=>MUSCLE_LIBRARY[g].exercises.map((_,i)=>`${g}-${i}`));
      const caliKeys=caliIncluded?CALI_PROGRAMS[phase].drills.filter(d=>!d.free).map((_,i)=>`cali-${i}`):[];
      const builderFree=(cw.customItems||[]).map((_,i)=>`free-${i}`);
      const sessionFree=freeExercises.map(f=>f.key);
      return [...exKeys,...caliKeys,...builderFree,...sessionFree];
    }
    return [];
  };
  const itemKeys=getItemKeys();
  const checked=entry.checked||{};
  const doneCount=itemKeys.filter(k=>checked[k]).length;
  const allDone=itemKeys.length>0&&doneCount===itemKeys.length;

  const handleFinish=()=>{ updateEntry({completed:true}); onBack(); };

  return (
    <div style={{minHeight:"100vh"}}>
      <div style={{padding:"50px 22px 18px",borderBottom:`1px solid ${BORDER}`,position:"sticky",top:0,zIndex:10,background:BG,backdropFilter:"blur(24px)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:T3,cursor:"pointer",fontSize:20,padding:0,lineHeight:1}}>←</button>
          <div>
            <div style={{fontSize:9,color:T3,letterSpacing:2,textTransform:"uppercase"}}>{isToday?"Today":fmtDDMM(iso)} · {phase} Phase</div>
            <h1 style={{fontSize:22,fontWeight:900,margin:0,letterSpacing:-0.6,color:T1}}>{fmtDDMM(iso)}</h1>
          </div>
        </div>
      </div>

      <div style={{padding:"18px 20px"}}>
        {/* Habit boxes */}
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:18}}>
          <HabitBox label="Wake-up time" value={entry.wakeTime||""} onChange={v=>updateEntry({wakeTime:v})} placeholder="e.g. 6:15am"/>
          <HabitBox label="Previous day calories" value={entry.prevCalories||""} onChange={v=>updateEntry({prevCalories:v})} placeholder="e.g. 2400" type="number"/>
          <HabitBox label="Previous day steps" value={entry.prevSteps||""} onChange={v=>updateEntry({prevSteps:v})} placeholder="e.g. 8500" type="number"/>
        </div>

        {/* Activity picker */}
        {(showActivityPicker||!entry.type)&&(
          <div style={{background:"#111",border:`1px solid ${BORDERA}`,borderRadius:14,padding:16,marginBottom:16}}>
            <div style={{fontSize:9,color:TEAL,fontWeight:700,letterSpacing:1.5,marginBottom:12}}>CHOOSE TODAY'S ACTIVITY</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <button onClick={()=>{ updateEntry({type:"workout",workoutKind:"upper",checked:{},payload:{},freeExercises:[],groupExercises:{},removedDefaultExercises:{}}); setShowActivityPicker(false); }}
                style={{padding:"12px 14px",borderRadius:10,border:`1px solid ${BORDER}`,background:"transparent",color:T1,fontSize:14,fontWeight:600,cursor:"pointer",textAlign:"left"}}>Workout — Upper Body</button>
              <button onClick={()=>{ updateEntry({type:"workout",workoutKind:"lower",checked:{},payload:{},freeExercises:[],groupExercises:{},removedDefaultExercises:{}}); setShowActivityPicker(false); }}
                style={{padding:"12px 14px",borderRadius:10,border:`1px solid ${BORDER}`,background:"transparent",color:T1,fontSize:14,fontWeight:600,cursor:"pointer",textAlign:"left"}}>Workout — Lower Body</button>
              {Object.entries(customWorkouts).map(([id,cw])=>(
                <button key={id} onClick={()=>{ updateEntry({type:"custom",customWorkoutId:id,includeCali:cw.includeCali,checked:{},payload:{},freeExercises:[],groupExercises:{},removedDefaultExercises:{}}); setShowActivityPicker(false); }}
                  style={{padding:"12px 14px",borderRadius:10,border:`1px solid ${BORDERA}`,background:"rgba(13,148,136,0.06)",color:TEALL,fontSize:14,fontWeight:600,cursor:"pointer",textAlign:"left"}}>
                  {cw.name} <span style={{fontSize:10,color:T3,fontWeight:400}}>· custom</span>
                </button>
              ))}
              <button onClick={()=>setShowCustomBuilder(true)} style={{padding:"12px 14px",borderRadius:10,border:`1px dashed ${BORDERA}`,background:"transparent",color:TEAL,fontSize:13,fontWeight:700,cursor:"pointer",textAlign:"left"}}>+ New Custom Workout</button>
              <button onClick={()=>{ updateEntry({type:"run",checked:{},payload:{},freeExercises:[]}); setShowActivityPicker(false); }}
                style={{padding:"12px 14px",borderRadius:10,border:`1px solid ${BORDER}`,background:"transparent",color:T1,fontSize:14,fontWeight:600,cursor:"pointer",textAlign:"left"}}>Run</button>
              <button onClick={()=>{ updateEntry({type:"rest-full",completed:false,payload:{},freeExercises:[]}); setShowActivityPicker(false); }}
                style={{padding:"12px 14px",borderRadius:10,border:`1px solid ${BORDER}`,background:"transparent",color:T1,fontSize:14,fontWeight:600,cursor:"pointer",textAlign:"left"}}>Rest</button>
            </div>
          </div>
        )}

        {showCustomBuilder&&(
          <CustomWorkoutBuilder onCancel={()=>setShowCustomBuilder(false)} recentCustomExercises={recentCustomExercises} onAddRecentExercise={onAddRecentExercise}
            onSave={(wk)=>{ const id=`cw_${Date.now()}`; onSaveCustomWorkout(id,wk); updateEntry({type:"custom",customWorkoutId:id,includeCali:wk.includeCali,checked:{},payload:{},freeExercises:[],groupExercises:{},removedDefaultExercises:{}}); setShowCustomBuilder(false); setShowActivityPicker(false); }}/>
        )}

        {!showActivityPicker&&entry.type&&(
          <>
            <button onClick={()=>setShowActivityPicker(true)} style={{background:"none",border:"none",color:T3,fontSize:11,cursor:"pointer",marginBottom:14,padding:0,fontWeight:600}}>↻ Change activity</button>

            {(entry.type==="workout"||entry.type==="custom")&&<ProgressBar done={doneCount} total={itemKeys.length}/>}

            {entry.type==="rest-full"&&<RestDayInput payload={entry.payload||{}} onChangeField={setPayloadField}/>}
            {entry.type==="run"&&<RunBlock phase={phase} payload={entry.payload||{}} onChangeField={setPayloadField} checked={checked} onCheck={toggleChecked}/>}

            {entry.type==="workout"&&(
              <div>
                {caliIncluded?(
                  <CaliSection phase={phase} payload={entry.payload||{}} onChangeField={setPayloadField} checked={checked} onCheck={toggleChecked} onRemove={toggleCali}/>
                ):(
                  <button onClick={toggleCali} style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px dashed ${BORDERA}`,background:"transparent",color:TEAL,fontSize:12,fontWeight:700,cursor:"pointer",marginBottom:14,textAlign:"left"}}>+ Add calisthenics block</button>
                )}
                <GroupPicker activeGroups={entry.workoutKind==="upper"?activeUpperGroups:activeLowerGroups} onToggleGroup={entry.workoutKind==="upper"?toggleUpperGroup:toggleLowerGroup}/>
                <div style={{fontSize:9,color:T3,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Strength — {entry.workoutKind==="upper"?"Upper Body":"Lower Body"}</div>
                {(entry.workoutKind==="upper"?activeUpperGroups:activeLowerGroups).map(g=>(
                  <MuscleGroup key={g} groupName={g}
                    exercises={MUSCLE_LIBRARY[g].exercises.filter((_,i)=>!removedDefaults[`${g}-${i}`])}
                    extraExercises={groupExercises[g]||[]}
                    phase={phase} payload={entry.payload||{}} onChangeField={setPayloadField}
                    checked={checked} onCheck={toggleChecked}
                    customExNames={customExNames} onCustomExName={onCustomExName}
                    exHistory={exHistory} onUpdateHistory={onUpdateHistory}
                    onRemoveGroup={entry.workoutKind==="upper"?removeUpperGroup:removeLowerGroup}
                    onAddExercise={handleAddGroupExercise}
                    onRemoveExercise={handleRemoveGroupExercise}
                    recentCustomExercises={recentCustomExercises}
                    onAddRecentExercise={onAddRecentExercise}
                  />
                ))}
                {/* Global free exercises */}
                {freeExercises.map(f=>(
                  <FreeExRow key={f.key} name={f.name} exKey={f.key} payload={entry.payload||{}} onChangeField={setPayloadField}
                    checked={!!checked[f.key]} onCheck={toggleChecked} onRemove={()=>removeFreeExercise(f.key)}/>
                ))}
                <CreateExerciseBox onAdd={addFreeExercise} recentExercises={recentCustomExercises}/>
              </div>
            )}

            {entry.type==="custom"&&customWorkouts[entry.customWorkoutId]&&(
              <div>
                {customWorkouts[entry.customWorkoutId].note&&(
                  <div style={{background:"rgba(13,148,136,0.06)",border:`1px solid ${BORDER}`,borderRadius:10,padding:"12px 14px",marginBottom:14}}>
                    <p style={{fontSize:12,color:T2,fontStyle:"italic",margin:0,lineHeight:1.6}}>{customWorkouts[entry.customWorkoutId].note}</p>
                  </div>
                )}
                {caliIncluded?(
                  <CaliSection phase={phase} payload={entry.payload||{}} onChangeField={setPayloadField} checked={checked} onCheck={toggleChecked} onRemove={toggleCali}/>
                ):(
                  <button onClick={toggleCali} style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px dashed ${BORDERA}`,background:"transparent",color:TEAL,fontSize:12,fontWeight:700,cursor:"pointer",marginBottom:14,textAlign:"left"}}>+ Add calisthenics block</button>
                )}
                {(customWorkouts[entry.customWorkoutId].groups||[]).map(g=>(
                  <MuscleGroup key={g} groupName={g}
                    exercises={MUSCLE_LIBRARY[g].exercises.filter((_,i)=>!removedDefaults[`${g}-${i}`])}
                    extraExercises={groupExercises[g]||[]}
                    phase={phase} payload={entry.payload||{}} onChangeField={setPayloadField}
                    checked={checked} onCheck={toggleChecked}
                    customExNames={customExNames} onCustomExName={onCustomExName}
                    exHistory={exHistory} onUpdateHistory={onUpdateHistory}
                    onRemoveGroup={()=>{}}
                    onAddExercise={handleAddGroupExercise}
                    onRemoveExercise={handleRemoveGroupExercise}
                    recentCustomExercises={recentCustomExercises}
                    onAddRecentExercise={onAddRecentExercise}
                  />
                ))}
                {(customWorkouts[entry.customWorkoutId].customItems||[]).map((item,i)=>{
                  const fk=`free-${i}`;
                  return (
                    <div key={fk} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:10,marginBottom:8}}>
                      <Tick on={!!checked[fk]} onToggle={()=>toggleChecked(fk)}/>
                      <span style={{fontSize:14,color:T1,fontWeight:500}}>{item.name}</span>
                    </div>
                  );
                })}
                {freeExercises.map(f=>(
                  <FreeExRow key={f.key} name={f.name} exKey={f.key} payload={entry.payload||{}} onChangeField={setPayloadField}
                    checked={!!checked[f.key]} onCheck={toggleChecked} onRemove={()=>removeFreeExercise(f.key)}/>
                ))}
                <CreateExerciseBox onAdd={addFreeExercise} recentExercises={recentCustomExercises}/>
              </div>
            )}

            {entry.type==="rest-full"?(
              <button onClick={handleFinish} style={{width:"100%",marginTop:22,padding:"15px",borderRadius:12,border:`1px solid ${BORDER}`,cursor:"pointer",background:"transparent",color:T3,fontSize:14,fontWeight:700}}>Mark Rest Day Done ✓</button>
            ):(
              <button onClick={handleFinish} style={{width:"100%",marginTop:22,padding:"15px",borderRadius:12,border:`1px solid ${allDone?TEAL:BORDER}`,cursor:"pointer",fontSize:15,fontWeight:900,transition:"all 0.35s",background:allDone?TEAL:"transparent",color:allDone?"#fff":T3,letterSpacing:0.3,boxShadow:allDone?`0 0 20px rgba(13,148,136,0.3)`:"none"}}>
                {allDone?"✓  Finish Session":"Finish Session"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ═══ BODY SCREEN ═══ */
function BodyScreen({scans,onSave}) {
  const [form,setForm]=useState({date:todayIso(),weight:"",leanMass:"",bodyFatPct:"",bioAge:"",bwiScore:"",caloricDemand:""});
  const [saved2,setSaved2]=useState(false);
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const handleSave=()=>{ if(!form.weight)return; onSave({...form,ts:Date.now()}); setSaved2(true); setTimeout(()=>setSaved2(false),2000); };
  const sorted=[...scans].sort((a,b)=>a.ts-b.ts);
  const first=sorted[0],last=sorted[sorted.length-1];
  const metrics=[["weight","Weight (kg)"],["leanMass","Lean Mass (kg)"],["bodyFatPct","Body Fat %"],["bioAge","Bio Age"],["bwiScore","BWI Score"],["caloricDemand","Caloric Demand"]];
  return (
    <div style={{padding:"52px 20px 20px"}}>
      <div style={{fontSize:9,color:T3,letterSpacing:2.5,textTransform:"uppercase",marginBottom:6}}>Pillar Performance</div>
      <h1 style={{fontSize:24,fontWeight:900,margin:"0 0 24px",letterSpacing:-0.8,color:T1}}>Body Tracking</h1>
      <div style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:14,padding:"18px 16px",marginBottom:20}}>
        <div style={{fontSize:9,color:TEAL,fontWeight:700,letterSpacing:1.5,marginBottom:14}}>NEW SCAN ENTRY</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          {[["date","Date","text","2026-05-15"],["weight","Weight (kg)","number","74.0"],["leanMass","Lean Mass (kg)","number","68.5"],["bodyFatPct","Body Fat %","number","7.4"],["bioAge","Bio Age","number","28"],["bwiScore","BWI Score","number","9.0"],["caloricDemand","Caloric Demand","number","2847"]].map(([key,lbl,type,ph])=>(
            <div key={key}>
              <div style={{fontSize:9,color:T3,marginBottom:4,letterSpacing:0.8}}>{lbl.toUpperCase()}</div>
              <input type={type} placeholder={ph} value={form[key]} onChange={e=>f(key,e.target.value)}
                style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${BORDER}`,borderRadius:6,padding:"8px 10px",color:T1,fontSize:13,fontWeight:600,boxSizing:"border-box"}}/>
            </div>
          ))}
        </div>
        <button onClick={handleSave} style={{width:"100%",padding:"11px",borderRadius:8,border:"none",cursor:"pointer",background:saved2?TEAL:"rgba(13,148,136,0.2)",color:saved2?"#fff":TEALL,fontWeight:700,fontSize:13,transition:"all 0.2s"}}>
          {saved2?"✓ Saved":"Save Scan"}
        </button>
      </div>
      {sorted.length>=2&&(
        <div style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:14,padding:"16px",marginBottom:16}}>
          <div style={{fontSize:9,color:TEAL,fontWeight:700,letterSpacing:1.5,marginBottom:12}}>PROGRESS SINCE START</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {metrics.map(([k,lbl])=>{ const a=parseFloat(first[k]),b=parseFloat(last[k]); if(!a||!b)return null; const d=(b-a).toFixed(1); return (
              <div key={k} style={{background:"rgba(13,148,136,0.06)",borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontSize:9,color:T3,marginBottom:4}}>{lbl.split(" ")[0].toUpperCase()}</div>
                <div style={{fontSize:18,fontWeight:900,color:TEALL}}>{d>0?"+":""}{d}</div>
                <div style={{fontSize:9,color:T3}}>{a} → {b}</div>
              </div>
            ); })}
          </div>
        </div>
      )}
      {sorted.length===0&&<div style={{textAlign:"center",padding:"32px",color:T3,fontSize:13}}>No scans yet. Log your first scan above.</div>}
      {[...sorted].reverse().map((s,i,arr)=>(
        <div key={s.ts} style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:12,padding:"14px 16px",marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <span style={{fontSize:12,fontWeight:700,color:T1}}>{s.date}</span>
            {i===arr.length-1&&<span style={{fontSize:9,color:T3,background:"rgba(255,255,255,0.06)",padding:"2px 8px",borderRadius:4}}>START</span>}
            {i===0&&arr.length>1&&<span style={{fontSize:9,color:TEALL,background:"rgba(13,148,136,0.15)",padding:"2px 8px",borderRadius:4}}>LATEST</span>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
            {metrics.map(([k,lbl])=>s[k]?(<div key={k}><div style={{fontSize:8,color:T3,marginBottom:2}}>{lbl.split(" ")[0].toUpperCase()}</div><div style={{fontSize:13,fontWeight:700,color:T1}}>{s[k]}</div></div>):null)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══ REVIEW SCREEN ═══ */
function ReviewScreen({entries}) {
  const today=todayIso();
  const last14=Array.from({length:14},(_,i)=>addDays(today,-i));
  let wakeTimes=[],cals=[],steps=[];
  last14.forEach(iso=>{ const e=entries[iso]; if(!e)return; if(e.wakeTime)wakeTimes.push(e.wakeTime); if(e.prevCalories)cals.push(parseInt(e.prevCalories)||0); if(e.prevSteps)steps.push(parseInt(e.prevSteps)||0); });
  const avgCals=cals.length?Math.round(cals.reduce((a,b)=>a+b,0)/cals.length):null;
  const avgSteps=steps.length?Math.round(steps.reduce((a,b)=>a+b,0)/steps.length):null;
  const avgWake=wakeTimes.length?wakeTimes[wakeTimes.length-1]:null;
  const allDates=Object.keys(entries);
  const totalDays=allDates.filter(d=>entries[d]?.completed).length;
  const workoutDays=allDates.filter(d=>entries[d]?.completed&&(entries[d].type==="workout"||entries[d].type==="custom")).length;
  const runDays=allDates.filter(d=>entries[d]?.completed&&entries[d].type==="run").length;
  const restDays=allDates.filter(d=>entries[d]?.completed&&(entries[d].type==="rest-full"||entries[d].type==="rest-active")).length;
  return (
    <div style={{padding:"52px 20px 20px"}}>
      <div style={{fontSize:9,color:T3,letterSpacing:2.5,textTransform:"uppercase",marginBottom:6}}>Pillar Performance</div>
      <h1 style={{fontSize:24,fontWeight:900,margin:"0 0 24px",letterSpacing:-0.8,color:T1}}>Program Review</h1>
      <div style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:14,padding:"16px",marginBottom:16}}>
        <div style={{fontSize:9,color:TEAL,fontWeight:700,letterSpacing:1.5,marginBottom:14}}>14-DAY AVERAGES</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {[["Wake Time",avgWake||"—"],["Avg Steps",avgSteps?avgSteps.toLocaleString():"—"],["Avg Calories",avgCals?avgCals.toLocaleString():"—"]].map(([lbl,val])=>(
            <div key={lbl} style={{background:"rgba(13,148,136,0.06)",borderRadius:10,padding:"12px 10px"}}>
              <div style={{fontSize:8,color:T3,marginBottom:5}}>{lbl.toUpperCase()}</div>
              <div style={{fontSize:16,fontWeight:900,color:val==="—"?T3:TEALL}}>{val}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{position:"relative",background:"linear-gradient(155deg,rgba(13,148,136,0.18),rgba(13,148,136,0.03))",border:`1px solid ${BORDERA}`,borderRadius:18,padding:"24px 20px",marginBottom:16,overflow:"hidden"}}>
        <div style={{position:"absolute",top:-40,right:-40,width:140,height:140,borderRadius:"50%",background:"rgba(45,212,191,0.12)",filter:"blur(30px)"}}/>
        <div style={{fontSize:9,color:TEAL,fontWeight:700,letterSpacing:2,marginBottom:4}}>SINCE YOU STARTED</div>
        <div style={{fontSize:48,fontWeight:900,color:T1,letterSpacing:-2,lineHeight:1,marginBottom:18}}>
          {totalDays}<span style={{fontSize:16,color:T2,fontWeight:600,marginLeft:8}}>total days logged</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          {[{label:"Workout",val:workoutDays,col:TEALL},{label:"Run",val:runDays,col:"#a78bfa"},{label:"Rest",val:restDays,col:"#ffffff"}].map(s=>(
            <div key={s.label} style={{textAlign:"center"}}>
              <div style={{fontSize:28,fontWeight:900,color:s.col,lineHeight:1}}>{s.val}</div>
              <div style={{fontSize:9,color:T2,letterSpacing:1,marginTop:4}}>{s.label.toUpperCase()} DAYS</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════════════ */

export default function App() {
  const {state,update,loaded}=useAppStorage();
  const {programStart,entries,exHistory,customExNames,customWorkouts,recentCustomExercises,scans,view}=state;
  const [quote]=useState(()=>QUOTES[Math.floor(Math.random()*QUOTES.length)]);
  const [focusedDate,setFocusedDate]=useState(null);

  const setView=v=>update({view:v});
  const handleUpdateEntry=(iso,patch)=>update(prev=>({...prev,entries:{...prev.entries,[iso]:{...(prev.entries[iso]||{}),...patch}}}));
  const handleUpdateHistory=(key,patch)=>update(prev=>({...prev,exHistory:{...prev.exHistory,[key]:{...(prev.exHistory[key]||{}),...patch}}}));
  const handleCustomExName=(key,name)=>update(prev=>({...prev,customExNames:{...prev.customExNames,[key]:name}}));
  const handleSaveCustomWorkout=(id,wk)=>update(prev=>({...prev,customWorkouts:{...prev.customWorkouts,[id]:wk}}));
  const handleSaveScan=(scan)=>update({scans:[...scans,scan]});
  const handleAddRecentExercise=(name)=>update(prev=>{
    const existing=(prev.recentCustomExercises||[]).filter(n=>n.toLowerCase()!==name.toLowerCase());
    return {...prev,recentCustomExercises:[name,...existing].slice(0,3)};
  });

  const NAV=[{icon:"⊞",label:"Calendar",val:"calendar"},{icon:"◎",label:"Body",val:"body"},{icon:"↗",label:"Review",val:"review"}];

  if(!loaded) return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:TEAL,fontSize:13,letterSpacing:2}}>LOADING...</div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:BG,color:T1,fontFamily:"'SF Pro Text',-apple-system,BlinkMacSystemFont,sans-serif",maxWidth:480,margin:"0 auto",paddingBottom:view==="day"?20:90}}>
      <style>{`
        input[type=number]::-webkit-inner-spin-button{opacity:0.2}
        input:focus,textarea:focus{outline:none;border-color:${TEAL}!important}
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box}
        @media print{.no-print{display:none}}
      `}</style>

      {view==="calendar"&&<CalendarScreen entries={entries} programStart={programStart} onOpenDay={iso=>{setFocusedDate(iso);setView("day");}} quote={quote}/>}
      {view==="body"&&<BodyScreen scans={scans} onSave={handleSaveScan}/>}
      {view==="review"&&<ReviewScreen entries={entries}/>}
      {view==="day"&&focusedDate&&(
        <DayScreen iso={focusedDate} programStart={programStart} entries={entries}
          onUpdateEntry={handleUpdateEntry} exHistory={exHistory} onUpdateHistory={handleUpdateHistory}
          customExNames={customExNames} onCustomExName={handleCustomExName}
          customWorkouts={customWorkouts} onSaveCustomWorkout={handleSaveCustomWorkout}
          recentCustomExercises={recentCustomExercises} onAddRecentExercise={handleAddRecentExercise}
          onBack={()=>{setView("calendar");setFocusedDate(null);}}/>
      )}

      {view!=="day"&&(
        <div className="no-print" style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"rgba(10,10,10,0.97)",borderTop:`1px solid ${BORDER}`,padding:"12px 20px 28px",backdropFilter:"blur(24px)",display:"flex",justifyContent:"space-around"}}>
          {NAV.map(t=>(
            <button key={t.val} onClick={()=>setView(t.val)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,color:view===t.val?TEALL:T3,transition:"color 0.2s"}}>
              <span style={{fontSize:20}}>{t.icon}</span>
              <span style={{fontSize:8,fontWeight:700,letterSpacing:1}}>{t.label.toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
