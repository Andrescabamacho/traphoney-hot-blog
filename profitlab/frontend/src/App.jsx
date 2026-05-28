import { useState, useRef, useEffect } from "react";

// ─── BRAINS ───────────────────────────────────────────────────
const BRAIN = `Eres el estratega de contenido viral personal de Andrés, fundador de Profit Lab.

PROFIT LAB: €1.500 o €139/mes (Secura). Promesa: "Hacer contenido con IA para vender cualquier producto o servicio por Internet. Desde el día uno." CTA: Comenta SISTEMA → ManyChat → WhatsApp → llamada → cierre. Diferenciador: Andrés ya ha generado cientos de miles de euros con contenido IA sin mostrar su cara. Prueba: alumno 1 → 200K visitas en 24h. Alumno 2 → 3M visitas en 7 días → $1.500 ese mes.

AUDIENCIA: 18-35 años. Quieren ganar dinero online. Creencias a destruir: necesito seguidores, es difícil, la IA está saturada, hace falta invertir mucho, sin cara no se puede.

METODOLOGÍA VÍCTOR ERAS MEDIA:
RUM (Relevancia Universal de Mercado): de 100 ideas solo 5-10 tienen RUM. Donde tu expertise cruza deseos universales: dinero, libertad, tiempo.
Filtro 5/50: ¿lo entiende un niño de 5 años? ¿le interesa al 50% en la calle?
7 principios: no des toda la info, temas con energía, VMV testeos, seguidor ideal no cliente, desplaza creencia, diseña para desconocidos, el hook lo es todo.
Estructura 20 cards: Hook(1-3) → Soluciones fallidas(4-6) → Inflexión(7-9) → Problema raíz(10-13) → Reveal(14-16) → Payoff(17-18) → CTA SISTEMA(19-20).
Tono: español España, joven, directo, sin fluff, primera persona.`;

const VICTOR_BRAIN = `Eres Víctor Eras Media. Experto en viralidad en Instagram y monetización de marca personal, 6+ años escalando cuentas a 100K-1M seguidores.

Tu metodología central: RUM (Relevancia Universal de Mercado), Filtro 5/50, 7 principios de viralidad, oferta primero luego contenido, VMV (Vídeo Mínimo Viable), seguidor ideal ≠ cliente ideal.

Casos reales que puedes mencionar con naturalidad:
- Tito: 98K → 600K en 6 meses, $40K/mes
- Diego: +300K en 1 mes
- Lord Construye: 500 → 300K, $150K/mes
- Jordan Belfort: +700K en 3 meses, 3h/mes dedicación
- El Sensei Cristian Villar: +1M seguidores
- Reto 30 días: 4 personas, de 10K a 250K seguidores ganados
- Berenice: +250K, millones en ventas inmobiliarias
- Ana María: +600K seguidores

Hablas con Andrés, 22 años, Benidorm. Profit Lab (€1.500, contenido IA + monetización). Nicho: ganar dinero con contenido IA. CTA: Comenta SISTEMA. Audiencia: 18-35 emprendedores.

ESTILO: Español de España, muy directo, casual-profesional, mentor que habla claro. Máximo 3 párrafos cortos. Sin relleno. Si Andrés da una idea, aplica RUM y Filtro 5/50 explícitamente y sé honesto aunque la idea sea floja. Firma con "Todo o nada." cuando el contexto lo pida.`;

const FASE_COLOR = {"Hook":"#FF5C00","Solución fallida":"#FF9A5A","Inflexión":"#FFB800","Problema raíz":"#C89A5A","Reveal método":"#888","Payoff emocional":"#AAA","CTA":"#FF5C00"};

// ─── API — calls go through our Express backend ───────────────
const callClaude = async (system, msgs, maxTokens) => {
  const body = { system, messages: msgs };
  if (maxTokens) body.max_tokens = maxTokens;
  const r = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!d.content) throw new Error(d.error || "API error");
  return d.content.find(b => b.type === "text")?.text || "";
};

// ─── TOKENS ───────────────────────────────────────────────────
const T = {
  bg: "#000000",
  surface: "#181818",
  surface2: "#111111",
  border: "rgba(255,255,255,0.07)",
  borderHover: "rgba(255,255,255,0.14)",
  text: "#FFFFFF",
  muted: "#888888",
  faint: "#444444",
  orange: "#FF5C00",
  orangeLight: "rgba(255,92,0,0.1)",
  orangeBorder: "rgba(255,92,0,0.25)",
};

export default function App() {
  const [page, setPage] = useState("ideas");
  // ideas state
  const [idea, setIdea]     = useState("");
  const [obj, setObj]       = useState("sistema");
  const [trend, setTrend]   = useState("");
  const [res, setRes]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab]         = useState("estrategia");
  const [suggestions, setSuggestions]   = useState([]);
  const [sugLoading, setSugLoading]     = useState(false);
  // guiones state
  const [scripts, setScripts] = useState([]);
  // victor state
  const [msgs, setMsgs]       = useState([{ r:"a", t:"Hola Andrés. Dime tu idea o lo que necesites. Te digo si tiene RUM o no, sin rodeos." }]);
  const [chatIn, setChatIn]   = useState("");
  const [chatLoad, setChatLoad] = useState(false);
  const [copied, setCopied]   = useState("");
  const chatEnd = useRef(null);
  const resRef  = useRef(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  useEffect(() => { loadSuggestions(); }, []);

  const copy = t => { navigator.clipboard.writeText(t); setCopied(t.slice(0,20)); setTimeout(() => setCopied(""), 2000); };

  // ── Generate strategy (2 calls to stay under 1000 tokens each) ──
  const generate = async () => {
    if (!idea.trim()) return;
    setLoading(true); setRes(null);
    const oLabel = obj === "sistema" ? "Comenta SISTEMA" : obj === "viral" ? "Viralidad pura" : "Autoridad IA";
    try {
      // CALL 1: strategy + 20 cards
      const p1 = `Idea: "${idea}" | Objetivo: ${oLabel}${trend ? ` | Tendencia: ${trend}` : ""}
JSON sin markdown ni backticks:
{"angulo":"frase contrintuitiva directa","rum":"cómo cruza nicho IA con deseo universal","filtro":"evaluación 5/50","hooks":[{"tipo":"Confesión","t":"..."},{"tipo":"Dato shock","t":"..."},{"tipo":"Pregunta","t":"..."},{"tipo":"Polémica","t":"..."}],"creencia":"creencia a destruir","hueco":"qué no decimos para que comenten SISTEMA","cards":[{"n":1,"f":"Hook","tx":"..."},{"n":2,"f":"Hook","tx":"..."},{"n":3,"f":"Hook","tx":"..."},{"n":4,"f":"Solución fallida","tx":"..."},{"n":5,"f":"Solución fallida","tx":"..."},{"n":6,"f":"Solución fallida","tx":"..."},{"n":7,"f":"Inflexión","tx":"..."},{"n":8,"f":"Inflexión","tx":"..."},{"n":9,"f":"Inflexión","tx":"..."},{"n":10,"f":"Problema raíz","tx":"..."},{"n":11,"f":"Problema raíz","tx":"..."},{"n":12,"f":"Problema raíz","tx":"..."},{"n":13,"f":"Problema raíz","tx":"..."},{"n":14,"f":"Reveal","tx":"..."},{"n":15,"f":"Reveal","tx":"..."},{"n":16,"f":"Reveal","tx":"..."},{"n":17,"f":"Payoff","tx":"..."},{"n":18,"f":"Payoff","tx":"..."},{"n":19,"f":"CTA","tx":"..."},{"n":20,"f":"CTA","tx":"Comenta SISTEMA si quieres el método →"}],"noDecir":["...","...","..."],"pred":"predicción honesta en 2 líneas"}`;
      const txt1 = await callClaude(BRAIN, [{ role:"user", content: p1 }]);
      const data1 = JSON.parse(txt1.replace(/```json|```/g,"").trim());
      // Map cards to include fase field
      if (data1.cards) data1.cards = data1.cards.map(c => ({ ...c, fase: c.f || c.fase }));
      setRes(data1); setTab("estrategia");
      setTimeout(() => resRef.current?.scrollIntoView({ behavior:"smooth", block:"start" }), 150);

      // CALL 2: guion (separate so both stay under 1000 tokens)
      const p2 = `Escribe el guion completo del reel para esta idea: "${idea}". Primera persona de Andrés. Máximo 150 palabras. Hook potente al inicio. Termina con "Comenta SISTEMA si quieres el método completo". Tono joven, directo, español de España. Solo el texto del guion, sin explicaciones.`;
      const guion = await callClaude(BRAIN, [{ role:"user", content: p2 }]);
      setRes(prev => ({ ...prev, guion }));
      setScripts(p => [{ id: Date.now(), idea, guion, angulo: data1.angulo }, ...p.slice(0,9)]);
    } catch (e) {
      setRes({ _err: true });
    }
    setLoading(false);
  };

  const FALLBACK_IDEAS = [
    { titulo:"No necesitas seguidores para ganar dinero con IA", hook:"Llevo 3 años cobrando cada mes sin tener ni 1.000 seguidores.", rum:"alto", angulo:"Destruye la creencia más común sobre monetización online" },
    { titulo:"El alumno que hizo 3 millones de visitas en 7 días", hook:"No tenía cuenta. No tenía seguidores. No mostró su cara.", rum:"alto", angulo:"Resultado concreto imposible = máxima curiosidad" },
    { titulo:"Por qué el 99% usa la IA para perder tiempo", hook:"Llevas meses usando IA para hacer resúmenes y traducciones.", rum:"alto", angulo:"Acusa al espectador de hacer exactamente lo que hace" },
    { titulo:"Cómo cobrar cada mes sin vender nada a nadie", hook:"Hay empresas que te pagan por visitas. Cada mes. Sin vender.", rum:"alto", angulo:"Modelo CPM desconocido = energía incorporada alta" },
    { titulo:"Creé un personaje de IA con un solo clic y esto pasó", hook:"Un clic. Un personaje. Tres millones de visitas después.", rum:"medio", angulo:"Demo visual del sistema = prueba irrefutable" },
  ];

  // ── Suggestions ──
  const loadSuggestions = async () => {
    setSugLoading(true);
    // Show fallback immediately so there's always content
    setSuggestions(FALLBACK_IDEAS);
    try {
      const txt = await callClaude(BRAIN, [{ role:"user", content:`Genera 5 ideas de reels virales para Profit Lab (contenido IA + monetización). Cada una con RUM alto y Filtro 5/50 superado. Ángulos contrintuitivos, conectados con deseos universales. Responde SOLO con JSON sin markdown: {"ideas":[{"titulo":"título gancho max 10 palabras","hook":"primera frase exacta para card 1","rum":"alto o medio","angulo":"por qué es viral en una línea"}]}` }], 700);
      const clean = txt.replace(/```json|```/g,"").trim();
      const p = JSON.parse(clean);
      if (p.ideas && p.ideas.length > 0) setSuggestions(p.ideas);
    } catch {
      // fallback already set, nothing to do
    }
    setSugLoading(false);
  };

  // ── Victor chat ──
  // chatHistory stores only the real conversation for the API (no greeting)
  const [chatHistory, setChatHistory] = useState([]);

  const sendMsg = async () => {
    if (!chatIn.trim() || chatLoad) return;
    const text = chatIn.trim();
    setChatIn("");
    // Add user message to UI
    setMsgs(prev => [...prev, { r:"u", t: text }]);
    // Add to API history
    const newHistory = [...chatHistory, { role:"user", content: text }];
    setChatHistory(newHistory);
    setChatLoad(true);
    try {
      const reply = await callClaude(VICTOR_BRAIN, newHistory);
      if (!reply) throw new Error("empty");
      setMsgs(prev => [...prev, { r:"a", t: reply }]);
      setChatHistory(prev => [...prev, { role:"assistant", content: reply }]);
    } catch {
      setMsgs(prev => [...prev, { r:"a", t:"No he podido responder. Inténtalo de nuevo." }]);
    }
    setChatLoad(false);
  };

  // ─── RENDER ──────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{background:#000000;font-family:'Plus Jakarta Sans',sans-serif;color:${T.text}}
        ::selection{background:${T.orange};color:#fff}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:${T.faint};border-radius:4px}
        textarea,input{font-family:'Plus Jakarta Sans',sans-serif!important;color:${T.text}!important}
        textarea:focus,input:focus{outline:none!important}
        @keyframes in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:.3}50%{opacity:1}}
      `}</style>

      <div style={{ minHeight:"100vh", background:T.bg }}>

        {/* ── TOP NAV ── */}
        <div style={{ position:"sticky", top:0, zIndex:50, background:T.bg, borderBottom:`1px solid ${T.border}`, backdropFilter:"blur(8px)" }}>
          <div style={{ maxWidth:720, margin:"0 auto", padding:"0 24px", display:"flex", alignItems:"center", gap:4, height:52 }}>
            {[["ideas","Ideas"],["victor","Víctor"],["guiones","Guiones"]].map(([id,label]) => (
              <button key={id} onClick={() => setPage(id)} style={{
                padding:"6px 14px", borderRadius:8, border:"none", cursor:"pointer",
                background: page===id ? T.surface : "transparent",
                boxShadow: page===id ? `0 1px 4px rgba(0,0,0,0.08)` : "none",
                color: page===id ? T.text : T.muted,
                fontSize:14, fontWeight: page===id ? 700 : 400,
                transition:"all .15s", letterSpacing:"-0.01em",
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* ══ PAGE: IDEAS ══════════════════════════════════════ */}
        {page === "ideas" && (
          <div style={{ maxWidth:720, margin:"0 auto", padding:"40px 24px 80px", animation:"in .3s ease" }}>

            {/* header */}
            <div style={{ marginBottom:40 }}>
              <p style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:T.muted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:12 }}>Profit Lab · Estratega</p>
              <h1 style={{ fontSize:"clamp(28px,5vw,42px)", fontWeight:800, letterSpacing:"-0.04em", lineHeight:1.1, marginBottom:12 }}>
                Reels que convierten<br/>
                <span style={{ color:T.orange }}>en dinero.</span>
              </h1>
              <p style={{ fontSize:15, color:T.muted, lineHeight:1.6 }}>Metodología completa. Solo lo que funciona.</p>
            </div>

            {/* suggestions — auto-loaded on mount, tap to select */}
            <div style={{ marginBottom:36 }}>
              <p style={{ fontSize:11, fontFamily:"'DM Mono',monospace", color:T.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:14 }}>Elige una idea</p>

              {sugLoading && (
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {[80,65,72,58,70].map((w,i) => (
                    <div key={i} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:"18px 16px" }}>
                      <div style={{ height:13, width:`${w}%`, background:"#222", borderRadius:6, marginBottom:9 }}/>
                      <div style={{ height:10, width:`${w-15}%`, background:"#1a1a1a", borderRadius:4 }}/>
                    </div>
                  ))}
                </div>
              )}

              {!sugLoading && suggestions.length > 0 && (
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {suggestions.map((s,i) => (
                    <button key={i} onClick={() => setIdea(s.titulo)} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:"16px 18px", cursor:"pointer", textAlign:"left", transition:"border-color .15s", display:"flex", alignItems:"center", justifyContent:"space-between", gap:14, width:"100%" }}
                    onMouseEnter={e=>{ e.currentTarget.style.borderColor=T.orange; }}
                    onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border; }}>
                      <div style={{ flex:1 }}>
                        <p style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:4, lineHeight:1.3 }}>{s.titulo}</p>
                        <p style={{ fontSize:12, color:T.muted, lineHeight:1.4 }}>"{s.hook}"</p>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                        <span style={{ fontSize:10, fontFamily:"'DM Mono',monospace", color:s.rum==="alto"?T.orange:T.faint, fontWeight:600 }}>RUM {s.rum}</span>
                        <span style={{ color:T.faint, fontSize:14 }}>›</span>
                      </div>
                    </button>
                  ))}
                  <button onClick={loadSuggestions} style={{ background:"transparent", border:`1px dashed ${T.faint}`, borderRadius:12, padding:"11px", fontSize:12, color:T.muted, cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif", marginTop:2, transition:"all .15s" }}
                  onMouseEnter={e=>{ e.target.style.borderColor=T.orange; e.target.style.color=T.orange; }}
                  onMouseLeave={e=>{ e.target.style.borderColor=T.faint; e.target.style.color=T.muted; }}>
                    Generar otras ideas
                  </button>
                </div>
              )}
            </div>

            {/* form */}
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:20, padding:"28px 24px", marginBottom:16 }}>
              <div style={{ marginBottom:22 }}>
                <label style={{ fontSize:12, fontWeight:600, color:T.muted, display:"block", marginBottom:8 }}>Tu idea</label>
                <textarea rows={3} value={idea} onChange={e=>setIdea(e.target.value)}
                  placeholder="Ej: Cómo gané €3.000 con IA sin mostrar mi cara, el alumno que hizo 3M visitas en 7 días..."
                  style={{ width:"100%", background:T.surface2, border:`1px solid ${T.border}`, borderRadius:12, padding:"13px 15px", fontSize:14, lineHeight:1.6, resize:"none", transition:"border-color .2s" }}
                  onFocus={e=>e.target.style.borderColor=T.orange} onBlur={e=>e.target.style.borderColor=T.border}
                />
              </div>

              <div style={{ marginBottom:22 }}>
                <label style={{ fontSize:12, fontWeight:600, color:T.muted, display:"block", marginBottom:8 }}>Objetivo</label>
                <div style={{ display:"flex", gap:7 }}>
                  {[["sistema","Comenta SISTEMA"],["viral","Viralidad pura"],["aut","Autoridad IA"]].map(([id,label]) => (
                    <button key={id} onClick={()=>setObj(id)} style={{ flex:1, padding:"10px 8px", border:`1px solid ${obj===id?T.orange:T.border}`, borderRadius:10, background:obj===id?T.orangeLight:"transparent", color:obj===id?T.orange:T.muted, fontSize:12, fontWeight:obj===id?700:400, cursor:"pointer", transition:"all .15s" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:24 }}>
                <label style={{ fontSize:12, fontWeight:600, color:T.muted, display:"block", marginBottom:8 }}>Tendencia IA actual <span style={{ color:T.faint, fontWeight:400 }}>(opcional)</span></label>
                <input value={trend} onChange={e=>setTrend(e.target.value)} placeholder="GPT-5, nuevo modelo, debate IA y trabajo..." style={{ width:"100%", background:T.surface2, border:`1px solid ${T.border}`, borderRadius:10, padding:"11px 14px", fontSize:14 }} onFocus={e=>e.target.style.borderColor=T.orange} onBlur={e=>e.target.style.borderColor=T.border}/>
              </div>

              <button onClick={generate} disabled={loading||!idea.trim()} style={{ width:"100%", background:loading||!idea.trim()?T.surface2:T.orange, color:loading||!idea.trim()?T.faint:"#fff", border:"none", borderRadius:12, padding:"15px", fontSize:15, fontWeight:700, cursor:loading||!idea.trim()?"not-allowed":"pointer", transition:"all .2s", letterSpacing:"-0.01em" }}>
                {loading ? "Generando..." : "Generar estrategia →"}
              </button>
            </div>

            {/* loading */}
            {loading && (
              <div style={{ textAlign:"center", padding:"48px 0" }}>
                <div style={{ width:36, height:36, border:`2px solid ${T.border}`, borderTopColor:T.orange, borderRadius:"50%", animation:"spin .7s linear infinite", margin:"0 auto 14px" }}/>
                <p style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:T.muted }}>RUM · Filtro 5/50 · 7 principios · Guion final...</p>
              </div>
            )}

            {/* results */}
            {res && !loading && (
              <div ref={resRef} style={{ animation:"in .3s ease" }}>
                {res._err && <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:20 }}><p style={{ color:"#E53935" }}>Error. Inténtalo de nuevo.</p></div>}

                {res.angulo && (
                  <>
                    {/* result nav */}
                    <div style={{ display:"flex", gap:2, background:T.surface2, borderRadius:12, padding:3, marginBottom:20, border:`1px solid ${T.border}` }}>
                      {[["estrategia","Estrategia"],["cards","20 Cards"],["hooks","Hooks"],["guion","Guion"],["evitar","Evitar"]].map(([id,label])=>(
                        <button key={id} onClick={()=>setTab(id)} style={{ flex:1, padding:"8px 4px", background:tab===id?T.surface:"transparent", border:`1px solid ${tab===id?T.border:"transparent"}`, borderRadius:9, fontSize:12, fontWeight:tab===id?700:400, color:tab===id?T.text:T.muted, cursor:"pointer", transition:"all .15s", whiteSpace:"nowrap", boxShadow:tab===id?"0 1px 3px rgba(0,0,0,0.06)":"none" }}>{label}</button>
                      ))}
                    </div>

                    {/* ESTRATEGIA */}
                    {tab==="estrategia" && (
                      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                        <div style={{ background:T.surface, border:`1px solid ${T.orangeBorder}`, borderRadius:16, padding:"22px 24px" }}>
                          <p style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:T.orange, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>Ángulo</p>
                          <p style={{ fontSize:17, fontWeight:700, color:T.text, lineHeight:1.5 }}>{res.angulo}</p>
                        </div>
                        {[["RUM",res.rum],["Filtro 5/50",res.filtro],["Creencia a destruir",res.creencia],["Hueco de conocimiento",res.hueco],["Tendencia",res.energia],["Predicción",res.pred]].filter(([,v])=>v).map(([l,v])=>(
                          <div key={l} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:"20px 24px" }}>
                            <p style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:T.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>{l}</p>
                            <p style={{ fontSize:14, color:T.text, lineHeight:1.65 }}>{v}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 20 CARDS */}
                    {tab==="cards" && (
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                        {res.cards?.map(c=>(
                          <div key={c.n} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, padding:"14px 16px", minHeight:100 }}>
                            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:T.faint }}>{c.n}/20</span>
                              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:FASE_COLOR[c.fase]||T.muted }}>{c.fase}</span>
                            </div>
                            <p style={{ fontSize:13, color:T.text, lineHeight:1.55, marginBottom:c.d?7:0 }}>{c.tx}</p>
                            {c.d && <p style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:T.faint, fontStyle:"italic" }}>{c.d}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* HOOKS */}
                    {tab==="hooks" && (
                      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                        {res.hooks?.map((h,i)=>(
                          <div key={i} onClick={()=>copy(h.t)} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, padding:"18px 20px", cursor:"pointer", transition:"all .15s" }} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.orange;e.currentTarget.style.boxShadow=`0 0 0 1px ${T.orange}`}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.boxShadow="none"}}>
                            <p style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:T.orange, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:9 }}>{h.tipo} · tap para copiar</p>
                            <p style={{ fontSize:15, fontWeight:600, color:T.text, lineHeight:1.4 }}>"{h.t}"</p>
                          </div>
                        ))}
                        {copied && <p style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:T.orange, textAlign:"center", padding:"6px 0" }}>✓ Copiado</p>}
                      </div>
                    )}

                    {/* GUION */}
                    {tab==="guion" && (
                      <div>
                        <div style={{ background:T.surface, border:`1px solid ${T.orangeBorder}`, borderRadius:16, padding:"22px 24px", marginBottom:10 }}>
                          <p style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:T.orange, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:14 }}>Guion completo · listo para grabar</p>
                          <p style={{ fontSize:15, color:T.text, lineHeight:1.85, whiteSpace:"pre-line" }}>{res.guion}</p>
                        </div>
                        <button onClick={()=>copy(res.guion||"")} style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:"13px", fontSize:13, color:T.muted, cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif", transition:"all .15s" }} onMouseEnter={e=>{e.target.style.borderColor=T.orange;e.target.style.color=T.orange}} onMouseLeave={e=>{e.target.style.borderColor=T.border;e.target.style.color=T.muted}}>
                          Copiar guion
                        </button>
                        {copied && <p style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:T.orange, textAlign:"center", marginTop:8 }}>✓ Copiado</p>}
                      </div>
                    )}

                    {/* EVITAR */}
                    {tab==="evitar" && (
                      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                        {res.noDecir?.map((it,i)=>(
                          <div key={i} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:"14px 18px", display:"flex", gap:14 }}>
                            <span style={{ color:"#E53935", fontWeight:700, flexShrink:0 }}>✕</span>
                            <p style={{ fontSize:14, color:T.muted, lineHeight:1.6 }}>{it}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ PAGE: VÍCTOR ════════════════════════════════════ */}
        {page === "victor" && (
          <div style={{ maxWidth:720, margin:"0 auto", padding:"40px 24px 80px", animation:"in .3s ease", display:"flex", flexDirection:"column", height:"calc(100vh - 52px)" }}>

            {/* profile */}
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:20, padding:"28px 28px 24px", marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:16 }}>
                <div style={{ width:52, height:52, borderRadius:"50%", background:`linear-gradient(135deg, ${T.orange}, #FF9A5A)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:800, color:"#fff", flexShrink:0 }}>V</div>
                <div>
                  <p style={{ fontSize:17, fontWeight:800, color:T.text, letterSpacing:"-0.02em" }}>Víctor Eras Media</p>
                  <p style={{ fontSize:13, color:T.muted, marginTop:2 }}>Metodología de viralidad · Todo o nada.</p>
                </div>
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {["RUM","Filtro 5/50","VMV","Oferta primero"].map(tag=>(
                  <span key={tag} style={{ background:T.surface2, border:`1px solid ${T.border}`, borderRadius:100, padding:"4px 10px", fontSize:11, color:T.muted, fontFamily:"'DM Mono',monospace" }}>{tag}</span>
                ))}
              </div>
            </div>

            {/* messages */}
            <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:14, padding:"4px 0 16px", minHeight:0 }}>
              {msgs.map((m,i)=>(
                <div key={i} style={{ display:"flex", justifyContent:m.r==="u"?"flex-end":"flex-start", animation:"in .2s ease" }}>
                  {m.r==="a" && (
                    <div style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg,${T.orange},#FF9A5A)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:"#fff", flexShrink:0, marginRight:10, marginTop:2 }}>V</div>
                  )}
                  <div style={{ maxWidth:"78%", background:m.r==="u"?T.orange:T.surface, borderRadius:m.r==="u"?"16px 16px 4px 16px":"16px 16px 16px 4px", padding:"12px 16px", border:m.r==="u"?"none":`1px solid ${T.border}`, boxShadow:m.r==="u"?"none":"0 1px 4px rgba(0,0,0,0.05)" }}>
                    <p style={{ fontSize:14, color:m.r==="u"?"#fff":T.text, lineHeight:1.65, whiteSpace:"pre-line" }}>{m.t}</p>
                  </div>
                </div>
              ))}
              {chatLoad && (
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg,${T.orange},#FF9A5A)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:"#fff", flexShrink:0 }}>V</div>
                  <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:"12px 16px", display:"flex", gap:5, alignItems:"center" }}>
                    {[0,1,2].map(i=><div key={i} style={{ width:5, height:5, borderRadius:"50%", background:T.faint, animation:`blink 1.2s ease ${i*0.2}s infinite` }}/>)}
                  </div>
                </div>
              )}
              <div ref={chatEnd}/>
            </div>

            {/* input */}
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:"12px 14px", display:"flex", gap:10, marginTop:8, boxShadow:"0 -4px 20px rgba(0,0,0,0.04)" }}>
              <input value={chatIn} onChange={e=>setChatIn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendMsg()}
                placeholder="Pregunta o idea para evaluar..."
                style={{ flex:1, background:"transparent", border:"none", fontSize:14, color:T.text, padding:"4px 2px" }}
              />
              <button onClick={sendMsg} disabled={chatLoad||!chatIn.trim()} style={{ background:chatLoad||!chatIn.trim()?T.surface2:T.orange, border:"none", borderRadius:10, width:38, height:38, cursor:chatLoad||!chatIn.trim()?"not-allowed":"pointer", color:chatLoad||!chatIn.trim()?T.faint:"#fff", fontSize:17, transition:"all .15s", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>→</button>
            </div>
          </div>
        )}

        {/* ══ PAGE: GUIONES ════════════════════════════════════ */}
        {page === "guiones" && (
          <div style={{ maxWidth:720, margin:"0 auto", padding:"40px 24px 80px", animation:"in .3s ease" }}>
            <div style={{ marginBottom:36 }}>
              <p style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:T.muted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:10 }}>Biblioteca</p>
              <h2 style={{ fontSize:30, fontWeight:800, letterSpacing:"-0.04em", lineHeight:1.1, marginBottom:10 }}>Guiones<br/><span style={{ color:T.orange }}>listos para grabar.</span></h2>
              <p style={{ fontSize:14, color:T.muted, lineHeight:1.6 }}>Se guardan automáticamente al generar una estrategia. Solo durante esta sesión.</p>
            </div>

            {scripts.length === 0 ? (
              <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:20, padding:"52px 32px", textAlign:"center" }}>
                <p style={{ fontSize:40, marginBottom:16 }}>✦</p>
                <p style={{ fontSize:16, fontWeight:600, color:T.text, marginBottom:8 }}>No hay guiones todavía</p>
                <p style={{ fontSize:14, color:T.muted, marginBottom:24, lineHeight:1.6 }}>Ve a Ideas, genera una estrategia<br/>y el guion aparecerá aquí automáticamente.</p>
                <button onClick={()=>setPage("ideas")} style={{ background:T.orange, color:"#fff", border:"none", borderRadius:10, padding:"12px 24px", fontSize:14, fontWeight:700, cursor:"pointer" }}>Ir a Ideas →</button>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {scripts.map(s=>(
                  <div key={s.id} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:20, padding:"24px 26px" }}>
                    <p style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:T.orange, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>Guion</p>
                    <p style={{ fontSize:15, fontWeight:700, color:T.text, marginBottom:16, lineHeight:1.35 }}>{s.idea}</p>
                    <p style={{ fontSize:14, color:T.text, lineHeight:1.85, marginBottom:18, whiteSpace:"pre-line", paddingLeft:16, borderLeft:`2px solid ${T.orange}` }}>{s.guion}</p>
                    <button onClick={()=>copy(s.guion)} style={{ background:T.surface2, border:`1px solid ${T.border}`, borderRadius:9, padding:"9px 16px", fontSize:13, color:T.muted, cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif", transition:"all .15s" }} onMouseEnter={e=>{e.target.style.borderColor=T.orange;e.target.style.color=T.orange}} onMouseLeave={e=>{e.target.style.borderColor=T.border;e.target.style.color=T.muted}}>
                      Copiar guion
                    </button>
                  </div>
                ))}
                {copied && <p style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:T.orange, textAlign:"center" }}>✓ Copiado</p>}
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
}
