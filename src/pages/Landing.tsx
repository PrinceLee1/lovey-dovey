import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Sparkles, Users, Shield, MessageSquare, Gamepad2, ArrowRight } from "lucide-react";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";

const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function Landing() {
  const {user} = useAuth();
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-pink-50 to-white text-gray-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-rose-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="h-9 w-9 rounded-xl grid place-items-center text-white bg-gradient-to-br from-pink-500 to-fuchsia-600">
              <Heart className="w-5 h-5" />
            </div>
            <span className="font-semibold tracking-tight">LoveyDovey</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm">
            <a href="#features" className="hover:text-fuchsia-600">Features</a>
            <a href="#how" className="hover:text-fuchsia-600">How it works</a>
            <a href="#faq" className="hover:text-fuchsia-600">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link to="/games" className="hidden sm:inline-block px-4 py-2 rounded-xl border hover:bg-gray-50">
                Dashboard
              </Link>
            ) : (
              <>
              <Link to="/signin" className="hidden sm:inline-block px-4 py-2 rounded-xl border hover:bg-gray-50">
                Sign in
              </Link>
              <Link
                to="/onboarding"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:brightness-105 shadow-sm"
              >
                Get started <ArrowRight className="w-4 h-4" />
              </Link>
              </>

              
            )}

          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 h-72 w-72 bg-fuchsia-300/30 blur-3xl rounded-full" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 bg-pink-300/30 blur-3xl rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-16 pb-10 md:pt-24 md:pb-16 grid lg:grid-cols-2 gap-10 items-center">
          <motion.div {...fade} transition={{ duration: 0.5 }} className="space-y-6">
            <h1 className="font-display text-4xl md:text-5xl font-extrabold leading-tight">
              Playful AI games for couples & friends
            </h1>
            <p className="text-lg text-gray-600 max-w-xl">
              Spark deeper conversations, laughter, and connection with curated games and prompts—solo date night, or
              bring a group into a live lobby. Streaks, XP, and leaderboards keep it fun.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/onboarding"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:brightness-105 shadow"
              >
                Start free <Sparkles className="w-4 h-4" />
              </Link>
              <a href="#features" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border hover:bg-gray-50">
                Explore features
              </a>
            </div>

            <div className="flex items-center gap-6 pt-4 text-sm text-gray-600">
              <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-fuchsia-600" /> Privacy-first</div>
              <div className="flex items-center gap-2"><Users className="w-4 h-4 text-fuchsia-600" /> Couples & groups</div>
              <div className="flex items-center gap-2"><Gamepad2 className="w-4 h-4 text-fuchsia-600" /> New games weekly</div>
            </div>
          </motion.div>

          {/* Mock preview cards */}
          <motion.div
            {...fade}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="relative"
          >
            <div className="grid gap-5">
              <div className="rounded-3xl bg-white shadow-xl border border-rose-100 p-6">
                {/* <div className="text-sm font-medium text-gray-500 mb-2">Onboarding</div> */}
                <div className="h-40 md:h-56 rounded-2xl bg-gradient-to-br from-rose-100 to-fuchsia-100 grid place-items-center">
                  <img src="/images/onb-5.png" alt="Onboarding screen" className="object-fill w-55 h-50 md:h-64" />
                </div>
                <p className="mt-4 font-semibold">Find your perfect match</p>
                <p className="text-sm text-gray-600">AI-tailored games to spark connection.</p>
              </div>

              <div className="rounded-3xl bg-white shadow-xl border border-rose-100 p-6">
                <div className="text-sm font-medium text-gray-500 mb-2">Dashboard</div>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-600 grid place-items-center text-white">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">Daily Challenge</div>
                    <div className="text-sm text-gray-600">+50 XP if completed</div>
                  </div>
                  <button className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50">Play</button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social proof / badges */}
      <section className="max-w-7xl mx-auto px-6 py-6">
        <div className="rounded-2xl border border-rose-100 bg-white p-4 text-center text-sm text-gray-600">
          Loved by long-distance couples, roommates, and game-night hosts.
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-14 md:py-20">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl md:text-4xl font-bold">Everything you need to keep it fun</h2>
          <p className="text-gray-600 mt-3">Beautiful UI, live lobbies, and games designed to bring people closer.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Feature
            icon={<Sparkles className="w-5 h-5" />}
            title="AI-generated games"
            body="Fresh Truth-or-Dare, Charades prompts, emoji challenges, memory match, and more—no repeats."
          />
          <Feature
            icon={<Users className="w-5 h-5" />}
            title="Partner linking"
            body="Pair up, share history automatically, and earn couple streaks together."
          />
          <Feature
            icon={<Gamepad2 className="w-5 h-5" />}
            title="Live group lobbies"
            body="Create a lobby, invite friends, chat in real-time, and play team trivia or charades."
          />
          <Feature
            icon={<Shield className="w-5 h-5" />}
            title="Privacy by default"
            body="You control your data. Private couple mode keeps your moments just yours."
          />
          <Feature
            icon={<MessageSquare className="w-5 h-5" />}
            title="Daily challenges"
            body="Quick bite-size games you can play anytime. Keep the streak alive for bonus XP."
          />
          <Feature
            icon={<Heart className="w-5 h-5" />}
            title="Streaks & leaderboards"
            body="Stay motivated with XP, weekly streaks, and friendly competition."
          />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-7xl mx-auto px-6 py-14 md:py-20">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl md:text-4xl font-bold">How it works</h2>
          <p className="text-gray-600 mt-3">Three steps and you’re playing in under a minute.</p>
        </div>

        <ol className="grid md:grid-cols-3 gap-6">
          <Step n="1" title="Create your account" body="Fast onboarding with email or phone." />
          <Step n="2" title="Link your partner or friends" body="Share an invite code or join a lobby." />
          <Step n="3" title="Play & earn XP" body="Start a challenge, keep your streak, and climb the board." />
        </ol>

        <div className="text-center mt-10">
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:brightness-105 shadow"
          >
            Try it free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-6 py-14 md:py-20">
        <div className="grid md:grid-cols-3 gap-6">
          <Testimonial quote="Date night saved. We actually talk—and laugh—a lot more." author="Amara & Tunde" />
          <Testimonial quote="The group lobbies are a riot. Weekly trivia is now a tradition." author="Liam & Friends" />
          <Testimonial quote="Streaks keep us consistent, even long-distance." author="Maya & Alex" />
        </div>
      </section>

      {/* CTA band */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="rounded-3xl bg-gradient-to-r from-fuchsia-600 to-pink-500 text-white p-8 md:p-12 flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold">Ready to play together?</h3>
            <p className="text-white/90">Join free. No credit card required.</p>
          </div>
          <div className="flex gap-3">

            {/* if logged in, go to dashboard */}
            {user ? (
              <Link to="/dashboard" className="px-5 py-3 rounded-xl bg-white text-fuchsia-700 hover:brightness-95">
                Dashboard
              </Link>
            ) : (
              <>
              <Link to="/onboarding" className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20">
                Get started
              </Link>
              <Link to="/signin" className="px-5 py-3 rounded-xl bg-white text-fuchsia-700 hover:brightness-95">
                Sign in
              </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-5xl mx-auto px-6 pb-10 md:pb-16">
        <h3 className="font-display text-2xl font-bold mb-6">FAQ</h3>
        <div className="divide-y divide-rose-100 rounded-2xl border border-rose-100 bg-white">
          <FAQ q="Is it free?" a="Yes. You can play core games for free. We’ll add optional packs later." />
          <FAQ q="Can we play with friends?" a="Yep! Create a lobby, invite friends, and run trivia or charades in real-time." />
          <FAQ q="Do we need to be in the same place?" a="No—play from anywhere. Voice or video is optional; chat is built-in." />
          <FAQ q="Is our data private?" a="We take privacy seriously. Private couple mode keeps shared history between you two." />
        </div>
      </section>

      <Footer variant="simple" />
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-3xl bg-white border border-rose-100 shadow-sm p-6">
      <div className="h-10 w-10 rounded-xl grid place-items-center text-white bg-gradient-to-br from-pink-500 to-fuchsia-600">
        {icon}
      </div>
      <div className="mt-4 font-semibold">{title}</div>
      <p className="text-sm text-gray-600 mt-1">{body}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="rounded-3xl bg-white border border-rose-100 shadow-sm p-6">
      <div className="h-8 w-8 rounded-full bg-fuchsia-600 text-white grid place-items-center font-semibold">{n}</div>
      <div className="mt-3 font-semibold">{title}</div>
      <p className="text-sm text-gray-600">{body}</p>
    </li>
  );
}

function Testimonial({ quote, author }: { quote: string; author: string }) {
  return (
    <div className="rounded-3xl bg-white border border-rose-100 shadow-sm p-6">
      <p className="text-gray-800 text-lg leading-relaxed">“{quote}”</p>
      <div className="mt-3 text-sm text-gray-600">— {author}</div>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <details className="p-5 open:bg-rose-50/40">
      <summary className="cursor-pointer list-none font-medium flex items-center justify-between">
        <span>{q}</span>
        <span className="text-gray-400">+</span>
      </summary>
      <p className="text-sm text-gray-600 mt-3">{a}</p>
    </details>
  );
}
