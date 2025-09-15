import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useAuth } from '../context/AuthContext';

import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Mail,
  Phone,
  Calendar as CalIcon,
} from "lucide-react";

/* ---------- Shell / Layout ---------- */

const Page = ({ children }: { children: React.ReactNode }) => (
  <div className="fixed inset-0 bg-gradient-to-b from-rose-50 via-pink-50 to-white overflow-auto">
    <main className="min-h-full w-full px-4 md:px-8 py-4">{children}</main>
  </div>
);

const TopNav = () => (
  <div className="w-full">
    <div className="max-w-6xl mx-auto flex items-center gap-3 px-6 py-5">
      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 grid place-items-center text-white">
        <Heart className="w-5 h-5" />
      </div>
      <span className="font-semibold text-gray-800 tracking-tight">LoveyDovey</span>
    </div>
  </div>
);

/* ---------- Shared Card Shell (equal height) ---------- */

const CardShell = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-3xl bg-white shadow-xl border border-rose-100 p-6 md:p-8 h-full flex flex-col ${className}`}
  >
    {children}
  </div>
);

/* ---------- Reusable UI ---------- */

const Header = ({
  title,
  onBack,
}: {
  title?: string;
  onBack?: () => void;
}) => (
  <div className="flex items-center gap-3 mb-6">
    {onBack ? (
      <button
        onClick={onBack}
        className="h-9 w-9 rounded-xl bg-gray-100 hover:bg-gray-200 grid place-items-center transition"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
    ) : null}
    <h1 className="font-display text-xl md:text-2xl font-semibold text-gray-900">
      {title ?? ""}
    </h1>
  </div>
);

const NextBtn = ({ children, onClick, disabled }: any) => (
  <button
    disabled={disabled}
    onClick={onClick}
    className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium text-white transition shadow-sm ${
      disabled
        ? "bg-gray-300"
        : "bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:brightness-[1.03]"
    }`}
  >
    {children}
    <ChevronRight className="w-5 h-5" />
  </button>
);

const SkipBtn = ({ onClick }: any) => (
  <button onClick={onClick} className="text-gray-500 hover:text-gray-700 text-sm">
    Skip
  </button>
);

const StepDots = ({ idx, total }: { idx: number; total: number }) => (
  <div className="flex items-center justify-center gap-1.5 mt-2" aria-hidden>
    {Array.from({ length: total }).map((_, i) => (
      <span
        key={i}
        className={`h-1.5 rounded-full ${
          i === idx ? "w-6 bg-fuchsia-600" : "w-2 bg-gray-300"
        }`}
      />
    ))}
  </div>
);

/* ---------- Left Hero Card (persists on all steps) ---------- */

const HeroCard = () => (
  <CardShell>
    <h2 className="font-display text-3xl md:text-4xl font-extrabold text-gray-900 text-center">
      Games for Love & Fun
    </h2>
    <p className="text-gray-600 mt-3 text-center max-w-2xl mx-auto">
      Generate playful challenges, quizzes and prompts for couples or groups.
      Build your profile and start playing in seconds with the power of AI.
    </p>
    <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-700/80">
      <div className="text-center">• Real-time group lobbies</div>
      <div className="text-center">• Personalized game packs</div>
      <div className="text-center">• Private couple mode</div>
    </div>
    <img
      src="/images/onb-4.png"
      alt="Couple playing a game together"
      className=" object-cover w-25 h-20 md:h-64"
    />
    <p className="text-xs text-gray-400 text-center mt-auto pt-6">
      © {new Date().getFullYear()} LoveyDovey
    </p>
  </CardShell>
);

/* ---------- Wizard State ---------- */

const STEPS = {
  SPLASH: 0,
  ONB_1: 1,
  ONB_2: 2,
  ONB_3: 3,
  AUTH_GATE: 4,
  PHONE: 5,
  OTP: 6,
  PROFILE: 7,
  DOB: 8,
  GENDER: 9,
  INTERESTS: 10,
  REVIEW: 11,
  EMAIL_LOGIN: 12,
} as const;

type FormState = {
  name: string;
  partnerName: string;
  email: string;
  phone: string;
  otp: string;
  dob: string; // YYYY-MM-DD
  gender: "Male" | "Female" | "Other" | "";
  interests: string[];
  avatarUrl?: string;
};

const defaultState: FormState = {
  name: "",
  partnerName: "",
  email: "",
  phone: "",
  otp: "",
  dob: "",
  gender: "",
  interests: [],
};

/* ---------- App ---------- */

function Onboarding() {
  const [step, setStep] = useState<(typeof STEPS)[keyof typeof STEPS]>(STEPS.SPLASH);
  const [data, setData] = useState<FormState>(defaultState);
  const [isLoading, setLoading] = useState(false);
const { register, loading } = useAuth();
const navigate = useNavigate();
const [password, setPassword] = useState('');
const [confirm, setConfirm] = useState('');
const [err, setErr] = useState<string|null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setStep(STEPS.ONB_1), 900);
    return () => clearTimeout(t);
  }, []);

  const go = (s: number) => setStep(s);
  const back = () => setStep(Math.max(0, step - 1) as (typeof STEPS)[keyof typeof STEPS]);

  const addOrRemoveInterest = (i: string) =>
    setData((d) => {
      const has = d.interests.includes(i);
      return {
        ...d,
        interests: has ? d.interests.filter((x) => x !== i) : [...d.interests, i],
      };
    });

  const canContinueProfile =
    data.name.trim().length > 1 && data.partnerName.trim().length > 0;
  const canContinuePhone = /^\+?[0-9\-\s]{7,15}$/.test(data.phone);
  const canContinueOtp = data.otp.trim().length === 6;
  const canContinueDob = !!data.dob;
  const canContinueGender = !!data.gender;

  const interests = [
    "Books",
    "Music",
    "Movies",
    "Photography",
    "Cooking",
    "Art",
    "Hiking",
    "Gaming",
    "Swimming",
    "Tech",
  ];

  const variants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  };

  // Mock async
  const sendOtp = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    go(STEPS.OTP);
  };
  const verifyOtp = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    go(STEPS.PROFILE);
  };

  return (
    <Page>
      <TopNav />

      {/* Equal-height two-column layout */}
      <div className="w-full max-w-6xl mx-auto grid md:grid-cols-2 gap-6 items-stretch px-6 py-6">
        {/* LEFT: hero card persists */}
        <div className="h-full">
          <HeroCard />
        </div>

        {/* RIGHT: all steps wrapped in CardShell so heights match */}
        <div className="w-full max-w-2xl mx-auto md:mx-0 h-full">
          <AnimatePresence mode="wait">
            {/* Splash */}
            {step === STEPS.SPLASH && (
              <motion.div key="splash" {...variants}>
                <CardShell>
                  <div className="flex flex-col items-center text-center justify-center flex-1">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-600 grid place-items-center text-white shadow-lg mb-4">
                      <Heart className="w-7 h-7" />
                    </div>
                    <h1 className="font-display text-2xl font-semibold text-gray-900">
                      LoveyDovey
                    </h1>
                    <p className="text-gray-500 mt-2">Games for Love & Fun</p>
                  </div>
                </CardShell>
              </motion.div>
            )}

            {/* Onboarding slides */}
            {step >= STEPS.ONB_1 && step <= STEPS.ONB_3 && (
              <motion.div key={`onb-${step}`} {...variants}>
                <CardShell>
                  {/* <Header title="Welcome" /> */}
                  <div className="text-center space-y-6">
                    <div className="h-40 md:h-56 rounded-2xl bg-gradient-to-br from-rose-100 to-fuchsia-100 grid place-items-center">
                      {step === STEPS.ONB_1 && (
                      <img src="/images/onb-1.png" className="w-40 h-50 text-fuchsia-600 rounded-md" />
                      )}
                      {step === STEPS.ONB_2 && (
                      <img src="/images/onb-2.png" className="w-40 h-50 text-fuchsia-600 rounded-md" />
                      )}
                      {step === STEPS.ONB_3 && (
                      <img src="/images/onb-3.png" className="w-40 h-50 text-fuchsia-600 rounded-md" />
                      )}
                    </div>

                    {step === STEPS.ONB_1 && (
                      <>
                        <h2 className="text-2xl font-bold text-gray-900 font-display">
                          Find your perfect match
                        </h2>
                        <p className="text-gray-600 max-w-md mx-auto font-display">
                          AI picks tailored games to spark deeper conversations and
                          laughter.
                        </p>
                      </>
                    )}
                    {step === STEPS.ONB_2 && (
                      <>
                        <h2 className="text-2xl font-bold text-gray-900 font-display">
                          Dating better than ever
                        </h2>
                        <p className="text-gray-600 max-w-md mx-auto font-display">
                          Daily prompts, streaks and shared wins keep the vibe going.
                        </p>
                      </>
                    )}
                    {step === STEPS.ONB_3 && (
                      <>
                        <h2 className="text-2xl font-bold text-gray-900 font-display">
                          Group nights made easy
                        </h2>
                        <p className="text-gray-600 max-w-md mx-auto font-display">
                          Invite friends, let the AI host, and enjoy the show.
                        </p>
                      </>
                    )}

                    <NextBtn
                      onClick={() =>
                        go(step < STEPS.ONB_3 ? step + 1 : STEPS.AUTH_GATE)
                      }
                    >
                      Next
                    </NextBtn>

                    <div className="mt-3 flex items-center justify-between">
                      <SkipBtn onClick={() => go(STEPS.AUTH_GATE)} />
                      <StepDots idx={step - STEPS.ONB_1} total={3} />
                    </div>
                  </div>
                </CardShell>
              </motion.div>
            )}

            {/* Auth gate */}
            {step === STEPS.AUTH_GATE && (
              <motion.div key="auth" {...variants}>
                <CardShell>
                  <Header title="Sign up to Continue" onBack={back} />
                  <div className="space-y-4">
                    <button
                      onClick={() => go(STEPS.EMAIL_LOGIN)}
                      className="w-full border rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-gray-50 font-display"
                    >
                      <Mail className="w-5 h-5 text-fuchsia-600" /> Continue with Email
                    </button>
                    <button
                      onClick={() => go(STEPS.PHONE)}
                      className="w-full border rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-gray-50 font-display"
                    >
                      <Phone className="w-5 h-5 text-fuchsia-600" /> Continue with Phone
                      Number
                    </button>
                    <div className="text-xs text-gray-500 pt-2 font-display">
                      By continuing you agree to our Terms & Privacy.
                    </div>
                    {/* //Already have an account? Sign in */}
                    <div className="text-sm text-gray-600 pt-2 font-display">
                      Already have an account?{" "}
                      <Link to="/signin" className="text-fuchsia-600">
                        Sign in
                      </Link>
                    </div>
                    </div>
                </CardShell>
              </motion.div>
            )}

            {/* Email login */}
            {step === STEPS.EMAIL_LOGIN && (
              <motion.div key="email" {...variants}>
                <CardShell>
                  <Header title="Log in with Email" onBack={back} />
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      go(STEPS.PROFILE);
                    }}
                  >
                    <label className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={data.email}
                      onChange={(e) =>
                        setData((d) => ({ ...d, email: e.target.value }))
                      }
                      className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
                      placeholder="you@example.com"
                    />
                    <NextBtn>Continue</NextBtn>
                  </form>
                </CardShell>
              </motion.div>
            )}

            {/* Phone */}
            {step === STEPS.PHONE && (
              <motion.div key="phone" {...variants}>
                <CardShell>
                  <Header title="Enter Phone Number" onBack={back} />
                  <div className="space-y-4">
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-400">
                        <Phone className="w-5 h-5" />
                      </span>
                      <input
                        inputMode="tel"
                        value={data.phone}
                        onChange={(e) =>
                          setData((d) => ({ ...d, phone: e.target.value }))
                        }
                        placeholder="+234 701 234 5678"
                        className="w-full rounded-xl border pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
                      />
                    </div>
                    <NextBtn disabled={!canContinuePhone} onClick={sendOtp}>
                      {isLoading ? "Sending…" : "Continue"}
                    </NextBtn>
                  </div>
                </CardShell>
              </motion.div>
            )}

            {/* OTP */}
            {step === STEPS.OTP && (
              <motion.div key="otp" {...variants}>
                <CardShell>
                  <Header title="Enter Verification Code" onBack={back} />
                  <div className="space-y-4">
                    <div className="grid grid-cols-6 gap-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <input
                          key={i}
                          maxLength={1}
                          value={data.otp[i] || ""}
                          onChange={(e) => {
                            const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 1);
                            setData((d) => ({
                              ...d,
                              otp: (d.otp.substring(0, i) + v + d.otp.substring(i + 1)).padEnd(
                                6,
                                " "
                              ),
                            }));
                          }}
                          className="h-12 rounded-xl border text-center text-lg focus:ring-2 focus:ring-fuchsia-500"
                        />
                      ))}
                    </div>
                    <NextBtn disabled={!canContinueOtp} onClick={verifyOtp}>
                      {isLoading ? "Verifying…" : "Verify"}
                    </NextBtn>
                  </div>
                </CardShell>
              </motion.div>
            )}

            {/* Profile */}
            {step === STEPS.PROFILE && (
              <motion.div key="profile" {...variants}>
                <CardShell>
                  <Header title="Add Profile Details" onBack={back} />
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Your Name
                        </label>
                        <input
                          value={data.name}
                          onChange={(e) =>
                            setData((d) => ({ ...d, name: e.target.value }))
                          }
                          className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-fuchsia-500"
                          placeholder="Alex"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Partner's Name
                        </label>
                        <input
                          value={data.partnerName}
                          onChange={(e) =>
                            setData((d) => ({ ...d, partnerName: e.target.value }))
                          }
                          className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-fuchsia-500"
                          placeholder="Maya"
                        />
                      </div>
                    </div>
                    <NextBtn
                      disabled={!canContinueProfile}
                      onClick={() => go(STEPS.DOB)}
                    >
                      Continue
                    </NextBtn>
                  </div>
                </CardShell>
              </motion.div>
            )}

            {/* DOB */}
            {step === STEPS.DOB && (
              <motion.div key="dob" {...variants}>
                <CardShell>
                  <Header title="Date of Birth" onBack={back} />
                  <div className="space-y-4">
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-400">
                        <CalIcon className="w-5 h-5" />
                      </span>
                      <input
                        type="date"
                        value={data.dob}
                        onChange={(e) =>
                          setData((d) => ({ ...d, dob: e.target.value }))
                        }
                        className="w-full rounded-xl border pl-11 pr-4 py-3 focus:ring-2 focus:ring-fuchsia-500"
                      />
                    </div>
                    <NextBtn
                      disabled={!canContinueDob}
                      onClick={() => go(STEPS.GENDER)}
                    >
                      Select
                    </NextBtn>
                  </div>
                </CardShell>
              </motion.div>
            )}

            {/* Gender */}
            {step === STEPS.GENDER && (
              <motion.div key="gender" {...variants}>
                <CardShell>
                  <Header title="Select Gender" onBack={back} />
                  <div className="grid grid-cols-3 gap-3">
                    {["Male", "Female", "Other"].map((g) => (
                      <button
                        key={g}
                        onClick={() => setData((d) => ({ ...d, gender: g as any }))}
                        className={`rounded-2xl border px-4 py-6 text-center hover:bg-gray-50 ${
                          data.gender === g
                            ? "border-fuchsia-500 ring-2 ring-fuchsia-200"
                            : ""
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  <div className="mt-6">
                    <NextBtn
                      disabled={!canContinueGender}
                      onClick={() => go(STEPS.INTERESTS)}
                    >
                      Continue
                    </NextBtn>
                  </div>
                </CardShell>
              </motion.div>
            )}

            {/* Interests */}
            {step === STEPS.INTERESTS && (
              <motion.div key="interests" {...variants}>
                <CardShell>
                  <Header title="Select your Interests" onBack={back} />
                  <div className="flex flex-wrap gap-2">
                    {interests.map((i) => (
                      <button
                        key={i}
                        onClick={() => addOrRemoveInterest(i)}
                        className={`px-4 py-2 rounded-full border transition ${
                          data.interests.includes(i)
                            ? "bg-fuchsia-50 border-fuchsia-400 text-fuchsia-700"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                  <div className="mt-6">
                    <NextBtn onClick={() => go(STEPS.REVIEW)}>Continue</NextBtn>
                  </div>
                </CardShell>
              </motion.div>
            )}

            {/* Review */}
              {step === STEPS.REVIEW && (
                <motion.div key="review" {...variants}>
                  <CardShell>
                    <Header title="Review & Create Account" onBack={back} />
                    <form
                      className="space-y-4 flex-1"
                        onSubmit={async (e) => {
                            e.preventDefault();
                            setErr(null);
                            try {
                            await register({
                                name: data.name,
                                email: data.email,
                                password,
                                password_confirmation: confirm,
                                phone: data.phone || undefined,
                                gender: (data.gender || undefined) as any,
                                dob: data.dob || undefined,
                            });
                            navigate('/games');
                            } catch (e:any) {
                            setErr(e.message);
                            }
                        }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <LabeledInput
                          label="Name"
                          value={data.name}
                          onChange={(v) => setData((d) => ({ ...d, name: v }))}
                          required
                          autoComplete="name"
                        />
                        <LabeledInput
                          label="Partner"
                          value={data.partnerName}
                          onChange={(v) => setData((d) => ({ ...d, partnerName: v }))}
                          autoComplete="name"
                        />
                        <LabeledInput
                          label="Email"
                          type="email"
                          value={data.email}
                          onChange={(v) => setData((d) => ({ ...d, email: v }))}
                          autoComplete="email"
                        />
                        <LabeledInput label="Password" type="password" value={password} onChange={setPassword} />
                        <LabeledInput label="Confirm Password" type="password" value={confirm} onChange={setConfirm} />
                        <LabeledInput
                          label="Phone"
                          type="tel"
                          value={data.phone}
                          onChange={(v) => setData((d) => ({ ...d, phone: v }))}
                          autoComplete="tel"
                        />
                        <LabeledInput
                          label="DOB"
                          type="date"
                          value={data.dob}
                          onChange={(v) => setData((d) => ({ ...d, dob: v }))}
                        />
                        <LabeledSelect
                          label="Gender"
                          value={data.gender}
                          onChange={(v) => setData((d) => ({ ...d, gender: v as any }))}
                          options={["Male", "Female", "Other"]}
                        />
                        <div className="md:col-span-2">
                          <LabeledInput
                            label="Interests (comma separated)"
                            value={data.interests.join(", ")}
                            onChange={(v) =>
                              setData((d) => ({
                                ...d,
                                interests: v
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              }))
                            }
                            placeholder="Books, Music, Cooking"
                          />
                        </div>
                      </div>
                    {err && <div className="text-sm text-red-600">{err}</div>}

                      {/* Submit */}
                    <NextBtn>{loading ? 'Creating…' : 'Create Account'}</NextBtn>
                    </form>
                  </CardShell>
                </motion.div>
              )}
          </AnimatePresence>
        </div>
      </div>
    </Page>
  );
}

export default Onboarding;

/* ---------- Helpers ---------- */

function LabeledInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-fuchsia-500"
      />
    </div>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-fuchsia-500 bg-white"
      >
        <option value="" disabled>
          Select…
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}