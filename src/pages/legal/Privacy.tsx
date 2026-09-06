import LegalPageLayout, { LegalSection } from '../../components/legal/LegalPageLayout';

const SECTIONS = [
  { id: 'intro', title: '1. The Short Version' },
  { id: 'what-we-collect', title: '2. Information We Collect' },
  { id: 'how-we-use', title: '3. How We Use Your Information' },
  { id: 'third-parties', title: '4. Third-Party Services' },
  { id: 'cookies', title: '5. Cookies & Local Storage' },
  { id: 'retention', title: '6. How Long We Keep Data' },
  { id: 'your-rights', title: '7. Your Rights & Choices' },
  { id: 'age', title: '8. Age Requirement' },
  { id: 'security', title: '9. Security' },
  { id: 'changes', title: '10. Changes to This Policy' },
  { id: 'contact', title: '11. Contact Us' },
];

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="September 6, 2026" sections={SECTIONS}>
      <LegalSection id="intro" title="1. The Short Version">
        <p>
          LoveyDovey ("LoveyDovey," "we," "us," or "our") is a real-time games platform for couples and
          friends. This policy explains what information we collect when you use the app, why we collect
          it, and the choices you have. We built LoveyDovey to help people connect — not to collect data
          for its own sake, and we do not sell your personal information to third parties, ever.
        </p>
        <p>
          LoveyDovey is currently operated independently and is not yet a formally registered company. If
          that changes, we'll update this policy to reflect the new operating entity.
        </p>
      </LegalSection>

      <LegalSection id="what-we-collect" title="2. Information We Collect">
        <p>We collect the information you'd expect from a game app that supports accounts and friends:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <b>Account information:</b> your email address, display name, password (stored as a secure
            hash, never in plain text), and optional profile details like gender, date of birth, and an
            uploaded avatar.
          </li>
          <li>
            <b>Game activity:</b> which games you play, when you play them, XP earned, streaks, and
            outcomes of individual game sessions (for example, prompts shown, rounds played, or scores).
          </li>
          <li>
            <b>Game session history:</b> a record of completed sessions tied to your account, used to show
            your history, stats, and progress over time.
          </li>
          <li>
            <b>Social data:</b> your partner or friend connections, friend requests, and lightweight
            activity you choose to share with friends (like "completed a game" or "hit a streak milestone").
          </li>
          <li>
            <b>Device & usage information:</b> basic technical data such as IP address, browser type, and
            general usage patterns, mainly for keeping the app secure and working correctly.
          </li>
          <li>
            <b>Payment information:</b> if you subscribe to a paid tier, billing is handled entirely by
            Stripe — we do not store your card details on our own servers.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="how-we-use" title="3. How We Use Your Information">
        <p>We use the information above to:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Create and maintain your account, and let you sign in securely.</li>
          <li>Run the actual gameplay — matching you with a partner or lobby, syncing turns in real time, and scoring games.</li>
          <li>Show you your XP, streaks, leaderboard position, and game history.</li>
          <li>Let you find, add, and play with friends, and show relevant activity in your friend feed.</li>
          <li>Send you account-related emails (like password resets) and, if you opt in, product updates and reminders.</li>
          <li>Detect abuse, prevent fraud, and keep the platform safe for adults using it as intended.</li>
          <li>Process payments for Plus subscriptions, once billing is live.</li>
        </ul>
        <p>We do not use your data to build advertising profiles, and we do not sell it to data brokers or advertisers.</p>
      </LegalSection>

      <LegalSection id="third-parties" title="4. Third-Party Services">
        <p>We rely on a small number of trusted third-party services to run LoveyDovey. Each only receives the data it needs to do its job:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <b>Pusher</b> — powers our real-time features (live game sync, chat, presence, and
            notifications). Pusher sees connection metadata and the real-time messages we send through it,
            but doesn't have access to your account credentials.
          </li>
          <li>
            <b>Stripe</b> — will process payments for Plus subscriptions once billing goes live. Stripe
            handles your card details directly; we only receive confirmation that a payment succeeded and
            basic subscription status.
          </li>
        </ul>
        <p>
          We may use additional infrastructure providers (for example, hosting or email delivery) that
          process data on our behalf under confidentiality obligations, but none of them are permitted to
          use your data for their own purposes.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="5. Cookies & Local Storage">
        <p>
          LoveyDovey uses browser local storage (not third-party tracking cookies) to keep you signed in,
          remember your theme preference (light/dark), and store small conveniences like a dismissed
          banner. This data stays on your device and is used only by the app itself.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="6. How Long We Keep Data">
        <p>
          We keep your account and game data for as long as your account is active, so your history,
          streaks, and friendships stay intact. If you delete your account, we remove your personal
          information within a reasonable period, except where we're required to retain certain records
          (for example, payment records) for legal or accounting purposes.
        </p>
      </LegalSection>

      <LegalSection id="your-rights" title="7. Your Rights & Choices">
        <p>You're in control of your data. At any time, you can:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><b>Access</b> the personal information we hold about you.</li>
          <li><b>Correct</b> inaccurate profile information directly in Settings.</li>
          <li><b>Delete your account</b> from Settings — this removes your profile and personal data from our active systems.</li>
          <li><b>Opt out</b> of non-essential emails (like feature announcements) from your notification preferences.</li>
        </ul>
        <p>
          If you'd like help with any of the above, or have a question we haven't answered here, reach out
          at <a href="mailto:hello@loveydovey.app" className="text-fuchsia-600 dark:text-fuchsia-400 hover:underline">hello@loveydovey.app</a>.
        </p>
      </LegalSection>

      <LegalSection id="age" title="8. Age Requirement">
        <p>
          LoveyDovey includes Erotic and Spicy game categories intended strictly for adults. The app is
          only for users who are 18 years of age or older, and we do not knowingly collect information from
          anyone under 18. If we learn that we've collected data from someone underage, we'll delete it
          promptly.
        </p>
      </LegalSection>

      <LegalSection id="security" title="9. Security">
        <p>
          We use industry-standard measures to protect your information, including encrypted password
          storage and secure connections (HTTPS) for all traffic. No system is perfectly secure, but we
          work to keep your data safe and will notify affected users in the event of a significant breach,
          as required by law.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="10. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time as LoveyDovey grows — for example, if we add
          a new feature or formalize our business structure. We'll update the "Last updated" date above
          when we do, and for significant changes, we'll make a reasonable effort to let you know in the
          app.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="11. Contact Us">
        <p>
          Questions, concerns, or requests about your data? Email us at{' '}
          <a href="mailto:hello@loveydovey.app" className="text-fuchsia-600 dark:text-fuchsia-400 hover:underline">hello@loveydovey.app</a>{' '}
          — we read every message.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
