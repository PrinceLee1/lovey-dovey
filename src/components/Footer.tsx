import React from "react";
import { Heart, Twitter, Instagram, Github, Mail } from "lucide-react";
import clsx from "clsx";

type FooterProps = {
  variant?: "simple" | "full";
  className?: string;
};

const YEAR = new Date().getFullYear();

const nav = {
  Product: [
    { label: "Games", href: "/games" },
    { label: "Create Lobby", href: "/lobby" },
    { label: "Pricing", href: "/pricing" },
    { label: "Changelog", href: "/changelog" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Press", href: "/press" },
  ],
  Resources: [
    { label: "Help Center", href: "/help" },
    { label: "Guides", href: "/guides" },
    { label: "Status", href: "/status" },
  ],
  Legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Community Guidelines", href: "/guidelines" },
  ],
};

function Brand() {
  return (
    <a href="/" className="inline-flex items-center gap-2 group">
      <span className="h-8 w-8 rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-600 grid place-items-center text-white shadow-sm">
        <Heart className="w-4 h-4" />
      </span>
      <span className="font-semibold tracking-tight text-gray-900 group-hover:text-gray-950">
        LoveyDovey
      </span>
    </a>
  );
}

function Socials() {
  const Item = ({
    href,
    children,
    label,
  }: {
    href: string;
    children: React.ReactNode;
    label: string;
  }) => (
    <a
      href={href}
      aria-label={label}
      className="h-9 w-9 grid place-items-center rounded-xl border hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition"
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  );

  return (
    <div className="flex items-center gap-2">
      <Item href="https://twitter.com" label="Twitter">
        <Twitter className="w-4 h-4" />
      </Item>
      <Item href="https://instagram.com" label="Instagram">
        <Instagram className="w-4 h-4" />
      </Item>
      <Item href="https://github.com" label="GitHub">
        <Github className="w-4 h-4" />
      </Item>
      <Item href="mailto:hello@lovely.ai" label="Email">
        <Mail className="w-4 h-4" />
      </Item>
    </div>
  );
}

export default function Footer({ variant = "simple", className }: FooterProps) {
  return (
    <footer className={clsx("mt-10", className)}>
      {/* soft gradient divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-rose-200 to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {variant === "full" ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* left: brand + blurb + newsletter */}
            <div className="md:col-span-5">
              <Brand />
              <p className="text-sm text-gray-600 mt-3 max-w-md">
                AI-generated games, lobbies, and playful moments for couples and
                friends. Join in seconds—spark deeper connection every day.
              </p>

              {/* newsletter */}
              <form
                onSubmit={(e) => e.preventDefault()}
                className="mt-4 flex items-center gap-2"
              >
                <input
                  type="email"
                  placeholder="Get tips & updates"
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
                <button
                  className="rounded-xl px-3 py-2 text-sm text-white bg-gradient-to-r from-pink-500 to-fuchsia-600"
                  type="submit"
                >
                  Subscribe
                </button>
              </form>

              <div className="mt-4">
                <Socials />
              </div>
            </div>

            {/* right: link columns */}
            <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-6">
              {Object.entries(nav).map(([group, items]) => (
                <div key={group}>
                  <div className="text-sm font-semibold text-gray-900 mb-2">
                    {group}
                  </div>
                  <ul className="space-y-1.5">
                    {items.map((it) => (
                      <li key={it.label}>
                        <a
                          href={it.href}
                          className="text-sm text-gray-600 hover:text-gray-900"
                        >
                          {it.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* bottom row */}
            <div className="md:col-span-12 border-t mt-6 pt-4 flex flex-col sm:flex-row items-center gap-2 justify-between">
              <p className="text-xs text-gray-500">
                © {YEAR} LoveyDovey. Made with ♥ for couples & friends.
              </p>
              <div className="text-xs text-gray-500">
                <a href="/privacy" className="hover:text-gray-800">
                  Privacy
                </a>{" "}
                ·{" "}
                <a href="/terms" className="hover:text-gray-800">
                  Terms
                </a>{" "}
                ·{" "}
                <a href="/status" className="hover:text-gray-800">
                  Status
                </a>
              </div>
            </div>
          </div>
        ) : (
          // simple variant
          <div className="flex flex-col items-center gap-4 text-center">
            <Brand />
            <div className="text-sm text-gray-600">
              Playful games to spark connection.
            </div>
            <Socials />
            <div className="text-xs text-gray-500">
              © {YEAR} LoveyDovey ·{" "}
              <a href="/privacy" className="hover:text-gray-800">
                Privacy
              </a>{" "}
              ·{" "}
              <a href="/terms" className="hover:text-gray-800">
                Terms
              </a>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
