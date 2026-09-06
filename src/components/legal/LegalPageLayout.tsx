import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ArrowLeft } from 'lucide-react';
import Footer from '../Footer';

export type LegalSectionMeta = { id: string; title: string };

export default function LegalPageLayout({
  title,
  lastUpdated,
  sections,
  children,
}: {
  title: string;
  lastUpdated: string;
  sections: LegalSectionMeta[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-rose-50 via-pink-50 to-white dark:from-[#0b0b12] dark:via-[#100c17] dark:to-[#0b0b12]">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 grid place-items-center text-white">
            <Heart className="w-5 h-5" />
          </div>
          <span className="font-display font-semibold text-gray-800 dark:text-gray-100 tracking-tight">
            LoveyDovey
          </span>
        </Link>
        <Link
          to="/"
          className="rounded-xl border dark:border-gray-700 px-3 py-2 text-sm flex items-center gap-2 text-gray-800 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back home
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-6 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-white dark:bg-gray-900 shadow-xl border border-rose-100 dark:border-gray-800 p-6 md:p-10"
        >
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last updated: {lastUpdated}</p>

          <nav className="mb-10 rounded-2xl border border-rose-100 dark:border-gray-800 bg-rose-50/60 dark:bg-gray-800/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              On this page
            </div>
            <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-sm text-fuchsia-600 dark:text-fuchsia-400 hover:underline"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-10">{children}</div>
        </motion.div>
      </div>

      <Footer variant="simple" />
    </div>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{title}</h2>
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{children}</div>
    </section>
  );
}
