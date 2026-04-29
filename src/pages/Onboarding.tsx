import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Heart, Mail, ArrowRight, ArrowLeft, Sparkles, Users, Zap, Calendar, ChevronDown } from "lucide-react";

/* ─── Types ───────────────────────────────────────────────────────────────── */
type Step = "splash" | "onb1" | "onb2" | "onb3" | "auth" | "profile" | "dob" | "gender" | "interests" | "review";

type FormState = {
  name: string; partnerName: string; email: string;
  phone: string; dob: string; gender: "Male"|"Female"|"Other"|"";
  interests: string[]; password: string; confirm: string;
};

const DEFAULT: FormState = {
  name: "", partnerName: "", email: "", phone: "",
  dob: "", gender: "", interests: [], password: "", confirm: "",
};

const STEP_ORDER: Step[] = ["splash","onb1","onb2","onb3","auth","profile","dob","gender","interests","review"];
const next = (s: Step): Step => STEP_ORDER[Math.min(STEP_ORDER.indexOf(s)+1, STEP_ORDER.length-1)];
const prev = (s: Step): Step => STEP_ORDER[Math.max(STEP_ORDER.indexOf(s)-1, 0)];

const INTERESTS = ["Books","Music","Movies","Photography","Cooking","Art","Hiking","Gaming","Travel","Tech","Dancing","Fitness"];

/* ─── Floating hearts background ─────────────────────────────────────────── */
function FloatingHearts() {
  const hearts = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    size: 10 + Math.random() * 20,
    left: Math.random() * 100,
    delay: Math.random() * 8,
    duration: 6 + Math.random() * 8,
    opacity: 0.04 + Math.random() * 0.08,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {hearts.map(h => (
        <motion.div
          key={h.id}
          className="absolute text-rose-400"
          style={{ left: `${h.left}%`, bottom: "-10%", opacity: h.opacity }}
          animate={{ y: [0, -window.innerHeight * 1.2], rotate: [0, 20, -20, 0] }}
          transition={{ duration: h.duration, delay: h.delay, repeat: Infinity, ease: "linear" }}
        >
          <Heart style={{ width: h.size, height: h.size }} fill="currentColor" />
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Slide variants ─────────────────────────────────────────────────────── */
const slide = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -40 },
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as number[] },
};

/* ─── Progress bar ────────────────────────────────────────────────────────── */
function Progress({ step }: { step: Step }) {
  const idx = STEP_ORDER.indexOf(step);
  const pct = ((idx) / (STEP_ORDER.length - 1)) * 100;
  if (idx < 1) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-rose-100">
      <motion.div
        className="h-full bg-gradient-to-r from-rose-400 to-fuchsia-500"
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  );
}

/* ─── Pill badge ─────────────────────────────────────────────────────────── */
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold px-3 py-1 rounded-full">
      {children}
    </span>
  );
}

/* ─── Primary button ─────────────────────────────────────────────────────── */
function Btn({ children, onClick, disabled, type = "button" }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: "button"|"submit";
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.01 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-base transition-all ${
        disabled
          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
          : "bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white shadow-lg shadow-rose-200 hover:shadow-rose-300"
      }`}
    >
      {children}
    </motion.button>
  );
}

/* ─── Ghost button ────────────────────────────────────────────────────────── */
function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-medium transition">
      {children}
    </button>
  );
}

/* ─── Input ──────────────────────────────────────────────────────────────── */
function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest">{label}</label>
      <input
        {...props}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 placeholder:text-gray-400 outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-100 transition text-sm"
      />
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function Onboarding() {
  const [step, setStep]   = useState<Step>("splash");
  const [data, setData]   = useState<FormState>(DEFAULT);
  const [err,  setErr]    = useState<string|null>(null);
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const set = (k: keyof FormState, v: any) => setData(d => ({ ...d, [k]: v }));
  const goNext = () => setStep(s => next(s));
  const goBack = () => setStep(s => prev(s));

  // Auto-advance from splash
  useEffect(() => {
    const t = setTimeout(() => setStep("onb1"), 1800);
    return () => clearTimeout(t);
  }, []);

  const toggleInterest = (i: string) =>
    set("interests", data.interests.includes(i)
      ? data.interests.filter(x => x !== i)
      : [...data.interests, i]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (data.password !== data.confirm) { setErr("Passwords don't match"); return; }
    try {
      await register({
        name: data.name, email: data.email,
        password: data.password, password_confirmation: data.confirm,
        phone: data.phone || undefined,
        gender: (data.gender || undefined) as any,
        dob: data.dob || undefined,
      });
      navigate("/games");
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong");
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfbf9] relative">
      <FloatingHearts />
      <Progress step={step} />

      {/* ── Logo ──────────────────────────────────────────────────────────── */}
      {step !== "splash" && (
        <div className="fixed top-5 left-6 z-40 flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-rose-500 to-fuchsia-600 grid place-items-center shadow-md">
            <Heart className="w-4 h-4 text-white" fill="white" />
          </div>
          <span className="font-bold text-gray-900 tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
            LoveyDovey
          </span>
        </div>
      )}

      <AnimatePresence mode="wait">

        {/* ════════════════════════════════════════════════════════════════
            SPLASH
        ════════════════════════════════════════════════════════════════ */}
        {step === "splash" && (
          <motion.div key="splash"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 14, stiffness: 200 }}
              className="flex flex-col items-center gap-4">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-rose-500 to-fuchsia-600 grid place-items-center shadow-2xl shadow-rose-300">
                <Heart className="w-10 h-10 text-white" fill="white" />
              </div>
              <h1 className="text-4xl font-black text-gray-900" style={{ fontFamily: "'Georgia', serif" }}>
                LoveyDovey
              </h1>
              <p className="text-gray-500 text-sm">Games for Love & Laughter</p>
            </motion.div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            ONBOARDING SLIDES  (full-screen editorial layout)
        ════════════════════════════════════════════════════════════════ */}
        {(step === "onb1" || step === "onb2" || step === "onb3") && (
          <motion.div key={step} {...slide}
            className="min-h-screen grid md:grid-cols-2">

            {/* Left — visual */}
            <div className={`relative flex items-center justify-center overflow-hidden min-h-[45vh] md:min-h-screen ${
              step === "onb1" ? "bg-gradient-to-br from-rose-500 via-pink-600 to-fuchsia-700" :
              step === "onb2" ? "bg-gradient-to-br from-violet-600 via-fuchsia-600 to-rose-500" :
                               "bg-gradient-to-br from-orange-400 via-rose-500 to-pink-600"
            }`}>
              <div className="absolute top-0 left-0 w-72 h-72 rounded-full bg-white/10 blur-3xl -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-black/15 blur-3xl translate-x-1/3 translate-y-1/3" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.12),transparent_60%)]" />

              <motion.div key={step} initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.6 }}
                className="relative z-10 px-6 text-center w-full max-w-xs mx-auto">

                {step === "onb1" && (
                  <div className="space-y-5">
                    <svg viewBox="0 0 300 260" className="w-full drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="90" y="10" width="120" height="200" rx="20" fill="white" fillOpacity="0.18" stroke="white" strokeOpacity="0.4" strokeWidth="1.5"/>
                      <rect x="98" y="26" width="104" height="168" rx="14" fill="white" fillOpacity="0.12"/>
                      <rect x="98" y="26" width="104" height="32" rx="14" fill="white" fillOpacity="0.2"/>
                      <text x="150" y="46" fontSize="9" fill="white" fontWeight="700" textAnchor="middle">LoveyDovey</text>
                      <path d="M150 115 C150 115 132 96 123 105 C114 114 118 128 150 152 C182 128 186 114 177 105 C168 96 150 115 150 115Z" fill="#fb7185" opacity="0.9"/>
                      <g transform="rotate(-10 55 140)">
                        <rect x="18" y="100" width="68" height="90" rx="12" fill="white" fillOpacity="0.95"/>
                        <rect x="18" y="100" width="68" height="26" rx="12" fill="#fda4af"/>
                        <rect x="18" y="112" width="68" height="6" fill="#fda4af"/>
                        <text x="52" y="112" fontSize="8" fill="white" fontWeight="800" textAnchor="middle">TRUTH</text>
                        <text x="52" y="136" fontSize="7" fill="#6b7280" textAnchor="middle">What is your</text>
                        <text x="52" y="147" fontSize="7" fill="#6b7280" textAnchor="middle">love language?</text>
                        <text x="52" y="172" fontSize="12" textAnchor="middle">❤️</text>
                      </g>
                      <g transform="rotate(10 245 135)">
                        <rect x="214" y="92" width="68" height="90" rx="12" fill="white" fillOpacity="0.95"/>
                        <rect x="214" y="92" width="68" height="26" rx="12" fill="#c084fc"/>
                        <rect x="214" y="104" width="68" height="6" fill="#c084fc"/>
                        <text x="248" y="104" fontSize="8" fill="white" fontWeight="800" textAnchor="middle">DARE</text>
                        <text x="248" y="130" fontSize="7" fill="#6b7280" textAnchor="middle">Whisper your</text>
                        <text x="248" y="141" fontSize="7" fill="#6b7280" textAnchor="middle">fav memory</text>
                        <text x="248" y="165" fontSize="12" textAnchor="middle">✨</text>
                      </g>
                      <text x="68" y="58" fontSize="14" fill="white" fillOpacity="0.7">✨</text>
                      <text x="232" y="72" fontSize="10" fill="white" fillOpacity="0.5">⭐</text>
                      <text x="148" y="232" fontSize="11" fill="white" fillOpacity="0.5">💕</text>
                    </svg>
                    <div className="flex justify-center gap-2 flex-wrap">
                      {["Truth or Dare","Spice Dice","Emoji Chat"].map(t => (
                        <span key={t} className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/30">{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {step === "onb2" && (
                  <div className="space-y-5">
                    <svg viewBox="0 0 300 260" className="w-full drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="15" y="10" width="270" height="240" rx="22" fill="white" fillOpacity="0.15" stroke="white" strokeOpacity="0.25" strokeWidth="1"/>
                      <rect x="28" y="24" width="244" height="66" rx="14" fill="white" fillOpacity="0.2"/>
                      <text x="44" y="44" fontSize="9" fill="white" fillOpacity="0.65" fontWeight="600">WEEKLY XP</text>
                      <text x="44" y="64" fontSize="24" fill="white" fontWeight="800">398 XP</text>
                      <rect x="44" y="72" width="180" height="7" rx="3.5" fill="white" fillOpacity="0.2"/>
                      <rect x="44" y="72" width="136" height="7" rx="3.5" fill="white"/>
                      <text x="232" y="80" fontSize="8" fill="white" fillOpacity="0.7" fontWeight="600">Lvl 3</text>
                      <rect x="28" y="102" width="114" height="80" rx="14" fill="white" fillOpacity="0.2"/>
                      <text x="48" y="132" fontSize="28">🔥</text>
                      <text x="82" y="132" fontSize="22" fill="white" fontWeight="800">7</text>
                      <text x="44" y="152" fontSize="9" fill="white" fontWeight="600">Day Streak</text>
                      <text x="44" y="166" fontSize="8" fill="white" fillOpacity="0.55">Keep it going!</text>
                      <rect x="154" y="102" width="118" height="80" rx="14" fill="white" fillOpacity="0.2"/>
                      <text x="170" y="122" fontSize="8" fill="white" fillOpacity="0.65" fontWeight="600">TOP COUPLES</text>
                      <text x="170" y="140" fontSize="9" fill="white" fontWeight="700">👑 You &amp; Partner</text>
                      <text x="170" y="156" fontSize="8" fill="white" fillOpacity="0.6">2. Amor &amp; Joy</text>
                      <text x="170" y="170" fontSize="8" fill="white" fillOpacity="0.4">3. Tom &amp; Alex</text>
                      <rect x="28" y="194" width="244" height="44" rx="12" fill="white" fillOpacity="0.2"/>
                      <text x="44" y="213" fontSize="10" fill="white" fillOpacity="0.8">🎯  Daily Challenge</text>
                      <text x="44" y="228" fontSize="9" fill="white" fontWeight="700">Complete today for +50 XP!</text>
                      <rect x="222" y="202" width="40" height="20" rx="8" fill="white" fillOpacity="0.3"/>
                      <text x="242" y="215" fontSize="8" fill="white" fontWeight="700" textAnchor="middle">Play →</text>
                    </svg>
                    <div className="flex justify-center gap-3">
                      {[["🔥","Streaks"],["⭐","XP & Levels"],["🏆","Ranks"]].map(([e,l]) => (
                        <div key={l} className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 text-center border border-white/20">
                          <div className="text-lg">{e}</div>
                          <div className="text-[10px] font-semibold text-white/85 mt-0.5">{l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step === "onb3" && (
                  <div className="space-y-5">
                    <svg viewBox="0 0 300 260" className="w-full drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="15" y="10" width="270" height="240" rx="22" fill="white" fillOpacity="0.15" stroke="white" strokeOpacity="0.25" strokeWidth="1"/>
                      <text x="32" y="38" fontSize="12" fill="white" fontWeight="800">🎉  Game Night</text>
                      <rect x="200" y="22" width="72" height="20" rx="8" fill="white" fillOpacity="0.2"/>
                      <circle cx="212" cy="32" r="4" fill="#4ade80"/>
                      <text x="220" y="36" fontSize="8" fill="white" fontWeight="600">5 online</text>
                      <circle cx="40"  cy="72" r="18" fill="#fb7185"/><text x="40"  y="77" fontSize="11" fill="white" fontWeight="700" textAnchor="middle">P</text>
                      <circle cx="82"  cy="72" r="18" fill="#a78bfa"/><text x="82"  y="77" fontSize="11" fill="white" fontWeight="700" textAnchor="middle">L</text>
                      <circle cx="124" cy="72" r="18" fill="#34d399"/><text x="124" y="77" fontSize="11" fill="white" fontWeight="700" textAnchor="middle">A</text>
                      <circle cx="166" cy="72" r="18" fill="#fbbf24"/><text x="166" y="77" fontSize="11" fill="white" fontWeight="700" textAnchor="middle">M</text>
                      <circle cx="208" cy="72" r="18" fill="#60a5fa"/><text x="208" y="77" fontSize="11" fill="white" fontWeight="700" textAnchor="middle">J</text>
                      <rect x="28" y="102" width="114" height="62" rx="14" fill="white" fillOpacity="0.2"/>
                      <text x="44" y="126" fontSize="18">🔥</text>
                      <text x="70" y="126" fontSize="11" fill="white" fontWeight="700">Hot Seat</text>
                      <text x="70" y="141" fontSize="8" fill="white" fillOpacity="0.6">Spicy vibes</text>
                      <rect x="32" y="150" width="54" height="10" rx="4" fill="#4ade80" fillOpacity="0.4"/>
                      <text x="59" y="158" fontSize="7" fill="white" textAnchor="middle">● Live now</text>
                      <rect x="154" y="102" width="114" height="62" rx="14" fill="white" fillOpacity="0.2"/>
                      <text x="170" y="126" fontSize="18">🤔</text>
                      <text x="196" y="126" fontSize="11" fill="white" fontWeight="700">WYR</text>
                      <text x="196" y="141" fontSize="8" fill="white" fillOpacity="0.6">Chaotic fun</text>
                      <rect x="28" y="176" width="244" height="60" rx="14" fill="white" fillOpacity="0.15"/>
                      <text x="44" y="196" fontSize="8" fill="white" fillOpacity="0.65" fontWeight="600">💬  PARTY CHAT</text>
                      <rect x="44" y="203" width="168" height="18" rx="8" fill="white" fillOpacity="0.2"/>
                      <text x="52" y="216" fontSize="8" fill="white">"omg this is hilarious 😂🔥"</text>
                      <rect x="44" y="226" width="90" height="4" rx="2" fill="white" fillOpacity="0.15"/>
                    </svg>
                    <div className="flex justify-center gap-2 flex-wrap">
                      {["Hot Seat","Would You Rather","Charades","Trivia"].map(t => (
                        <span key={t} className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/30">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Right — copy + CTA */}
            <div className="flex flex-col justify-center px-8 md:px-16 py-16 md:py-24">
              <div className="max-w-md">
                <Pill>
                  {step === "onb1" && <><Sparkles className="w-3 h-3" /> AI-Powered Games</>}
                  {step === "onb2" && <><Zap className="w-3 h-3" /> Streak & XP System</>}
                  {step === "onb3" && <><Users className="w-3 h-3" /> Group Party Mode</>}
                </Pill>

                <h1 className="mt-5 text-4xl md:text-5xl font-black text-gray-900 leading-[1.1] tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
                  {step === "onb1" && <>Games that bring you <em className="text-rose-500 not-italic">closer.</em></>}
                  {step === "onb2" && <>Every day a new <em className="text-fuchsia-500 not-italic">reason to play.</em></>}
                  {step === "onb3" && <>Your party, <em className="text-rose-500 not-italic">amplified.</em></>}
                </h1>

                <p className="mt-4 text-gray-500 text-base leading-relaxed">
                  {step === "onb1" && "AI picks the perfect games for you and your partner — from sweet truth or dare to spicy dares. No awkward silences, just fun."}
                  {step === "onb2" && "Build streaks, earn XP, climb leaderboards. Daily challenges keep the connection alive even when life gets busy."}
                  {step === "onb3" && "Invite your crew, let the AI host — Hot Seat, Charades, Would You Rather and more. Up to 10 players, zero prep."}
                </p>

                <div className="mt-10 space-y-3">
                  <Btn onClick={goNext}>
                    {step === "onb3" ? "Get Started" : "Continue"} <ArrowRight className="w-4 h-4" />
                  </Btn>
                  <div className="flex items-center justify-between">
                    {step !== "onb1"
                      ? <GhostBtn onClick={goBack}><ArrowLeft className="w-4 h-4" /> Back</GhostBtn>
                      : <div />
                    }
                    <GhostBtn onClick={() => setStep("auth")}>Skip intro</GhostBtn>
                  </div>
                </div>

                {/* Step dots */}
                <div className="flex gap-1.5 mt-8">
                  {["onb1","onb2","onb3"].map(s => (
                    <button key={s} onClick={() => setStep(s as Step)}
                      className={`h-1.5 rounded-full transition-all ${s === step ? "w-8 bg-rose-500" : "w-2 bg-gray-200"}`} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            AUTH GATE
        ════════════════════════════════════════════════════════════════ */}
        {step === "auth" && (
          <motion.div key="auth" {...slide} className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12">
            <div className="w-full max-w-sm">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
                  Join the fun
                </h2>
                <p className="text-gray-500 mt-2 text-sm">Create your account to start playing</p>
              </div>

              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  onClick={goNext}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 bg-white hover:border-rose-200 hover:bg-rose-50/50 transition-all shadow-sm">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-fuchsia-600 grid place-items-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900 text-sm">Continue with Email</div>
                    <div className="text-xs text-gray-400 mt-0.5">Set up your profile in 2 minutes</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  onClick={() => {}}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 transition-all opacity-60 cursor-not-allowed">
                  <div className="h-10 w-10 rounded-xl bg-gray-200 grid place-items-center flex-shrink-0">
                    <span className="text-lg">📱</span>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-500 text-sm">Continue with Phone</div>
                    <div className="text-xs text-gray-400 mt-0.5">Coming soon</div>
                  </div>
                  <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Soon</span>
                </motion.button>
              </div>

              <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
                By continuing you agree to our{" "}
                <span className="text-gray-600 underline cursor-pointer">Terms</span> &{" "}
                <span className="text-gray-600 underline cursor-pointer">Privacy Policy</span>
              </p>

              <div className="text-center mt-4">
                <span className="text-sm text-gray-500">Already have an account? </span>
                <Link to="/signin" className="text-rose-600 font-semibold text-sm hover:text-rose-700">Sign in</Link>
              </div>

              <GhostBtn onClick={goBack}>
                <div className="flex items-center gap-1.5 justify-center w-full mt-6 text-gray-400">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </div>
              </GhostBtn>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            PROFILE
        ════════════════════════════════════════════════════════════════ */}
        {step === "profile" && (
          <motion.div key="profile" {...slide} className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12">
            <div className="w-full max-w-sm">
              <GhostBtn onClick={goBack}><ArrowLeft className="w-4 h-4" /> Back</GhostBtn>
              <div className="mt-6 mb-8">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
                  Who's playing?
                </h2>
                <p className="text-gray-400 text-sm mt-1.5">Tell us who you are and who you'll be playing with</p>
              </div>

              <div className="space-y-4">
                <Input label="Your Name" value={data.name} onChange={e => set("name", e.target.value)} placeholder="Alex" />
                <Input label="Email" type="email" value={data.email} onChange={e => set("email", e.target.value)} placeholder="you@example.com" />
                <div className="relative">
                  <Input label="Partner / Friend's Name (optional)" value={data.partnerName} onChange={e => set("partnerName", e.target.value)} placeholder="Maya" />
                  <div className="absolute right-4 top-[38px] text-rose-400"><Heart className="w-4 h-4" /></div>
                </div>
              </div>

              <div className="mt-8">
                <Btn onClick={goNext} disabled={!data.name.trim() || !data.email.trim()}>
                  Continue <ArrowRight className="w-4 h-4" />
                </Btn>
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            DOB
        ════════════════════════════════════════════════════════════════ */}
        {step === "dob" && (
          <motion.div key="dob" {...slide} className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12">
            <div className="w-full max-w-sm">
              <GhostBtn onClick={goBack}><ArrowLeft className="w-4 h-4" /> Back</GhostBtn>
              <div className="mt-6 mb-8">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
                  How old are you?
                </h2>
                <p className="text-gray-400 text-sm mt-1.5">We use this to personalise your experience</p>
              </div>

              <div className="relative">
                <div className="absolute left-4 top-[46px] text-gray-400"><Calendar className="w-4 h-4" /></div>
                <Input label="Date of Birth" type="date" value={data.dob} onChange={e => set("dob", e.target.value)} />
              </div>

              <div className="mt-8">
                <Btn onClick={goNext} disabled={!data.dob}>
                  Continue <ArrowRight className="w-4 h-4" />
                </Btn>
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            GENDER
        ════════════════════════════════════════════════════════════════ */}
        {step === "gender" && (
          <motion.div key="gender" {...slide} className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12">
            <div className="w-full max-w-sm">
              <GhostBtn onClick={goBack}><ArrowLeft className="w-4 h-4" /> Back</GhostBtn>
              <div className="mt-6 mb-8">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
                  How do you identify?
                </h2>
                <p className="text-gray-400 text-sm mt-1.5">This helps us personalise game prompts for you</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { v: "Male",   emoji: "👨", label: "Male"   },
                  { v: "Female", emoji: "👩", label: "Female" },
                  { v: "Other",  emoji: "🏳️‍🌈", label: "Other"  },
                ].map(({ v, emoji, label }) => (
                  <motion.button
                    key={v}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => set("gender", v)}
                    className={`flex flex-col items-center gap-2 py-6 rounded-2xl border-2 transition-all ${
                      data.gender === v
                        ? "border-rose-400 bg-rose-50 shadow-md shadow-rose-100"
                        : "border-gray-100 bg-white hover:border-gray-200"
                    }`}>
                    <span className="text-3xl">{emoji}</span>
                    <span className={`text-sm font-semibold ${data.gender === v ? "text-rose-600" : "text-gray-700"}`}>{label}</span>
                  </motion.button>
                ))}
              </div>

              <div className="mt-8">
                <Btn onClick={goNext} disabled={!data.gender}>
                  Continue <ArrowRight className="w-4 h-4" />
                </Btn>
                <div className="text-center mt-3">
                  <GhostBtn onClick={goNext}>Skip for now</GhostBtn>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            INTERESTS
        ════════════════════════════════════════════════════════════════ */}
        {step === "interests" && (
          <motion.div key="interests" {...slide} className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12">
            <div className="w-full max-w-sm">
              <GhostBtn onClick={goBack}><ArrowLeft className="w-4 h-4" /> Back</GhostBtn>
              <div className="mt-6 mb-6">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
                  What do you love?
                </h2>
                <p className="text-gray-400 text-sm mt-1.5">Pick any interests to get tailored game prompts</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(i => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    onClick={() => toggleInterest(i)}
                    className={`px-4 py-2.5 rounded-full text-sm font-semibold border-2 transition-all ${
                      data.interests.includes(i)
                        ? "bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white border-transparent shadow-md"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                    }`}>
                    {i}
                  </motion.button>
                ))}
              </div>

              {data.interests.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-4 text-xs text-rose-500 font-medium">
                  {data.interests.length} selected ✓
                </motion.div>
              )}

              <div className="mt-8 space-y-3">
                <Btn onClick={goNext}>
                  {data.interests.length > 0 ? "Continue" : "Skip"} <ArrowRight className="w-4 h-4" />
                </Btn>
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            REVIEW / CREATE ACCOUNT
        ════════════════════════════════════════════════════════════════ */}
        {step === "review" && (
          <motion.div key="review" {...slide} className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12">
            <div className="w-full max-w-sm">
              <GhostBtn onClick={goBack}><ArrowLeft className="w-4 h-4" /> Back</GhostBtn>
              <div className="mt-6 mb-6">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
                  Almost there!
                </h2>
                <p className="text-gray-400 text-sm mt-1.5">Set your password to create your account</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                {/* Summary pill */}
                <div className="flex items-center gap-3 p-3 bg-rose-50 rounded-xl border border-rose-100">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-400 to-fuchsia-500 grid place-items-center text-white font-bold text-sm flex-shrink-0">
                    {data.name[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{data.name || "Your name"}</div>
                    <div className="text-xs text-gray-400">{data.email}</div>
                  </div>
                  <button type="button" onClick={() => setStep("profile")}
                    className="ml-auto text-xs text-fuchsia-600 font-medium hover:underline">Edit</button>
                </div>

                <Input label="Password" type="password" value={data.password} onChange={e => set("password", e.target.value)} placeholder="Min. 8 characters" />
                <Input label="Confirm Password" type="password" value={data.confirm} onChange={e => set("confirm", e.target.value)} placeholder="Repeat password" />

                {err && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    {err}
                  </motion.div>
                )}

                <Btn type="submit" disabled={loading || !data.password || !data.confirm}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                      Creating account…
                    </span>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Create My Account</>
                  )}
                </Btn>

                <p className="text-center text-xs text-gray-400 leading-relaxed">
                  By creating an account you agree to our Terms & Privacy Policy
                </p>
              </form>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}