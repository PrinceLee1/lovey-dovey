import LegalPageLayout, { LegalSection } from '../../components/legal/LegalPageLayout';

const SECTIONS = [
  { id: 'values', title: '1. Our Community Values' },
  { id: 'respectful-play', title: '2. Respectful Play' },
  { id: 'harassment', title: '3. No Harassment or Hate Speech' },
  { id: 'adult-content', title: '4. Adult Content Is Opt-In & 18+' },
  { id: 'privacy', title: '5. Respect Other People’s Privacy' },
  { id: 'reporting', title: '6. Reporting Violations' },
  { id: 'consequences', title: '7. Consequences for Violations' },
  { id: 'contact', title: '8. Contact Us' },
];

export default function CommunityGuidelinesPage() {
  return (
    <LegalPageLayout title="Community Guidelines" lastUpdated="September 6, 2026" sections={SECTIONS}>
      <LegalSection id="values" title="1. Our Community Values">
        <p>
          LoveyDovey exists to help couples and friends connect through playful games — not to be a place
          where anyone feels unsafe, disrespected, or pressured. These guidelines describe what we expect
          from everyone using the App, alongside our{' '}
          <a href="/terms" className="text-fuchsia-600 dark:text-fuchsia-400 hover:underline">Terms of Service</a>.
          Where the two overlap, both apply.
        </p>
      </LegalSection>

      <LegalSection id="respectful-play" title="2. Respectful Play">
        <p>
          Games on LoveyDovey work because everyone involved is playing in good faith. That means:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>It's always okay to skip a prompt, dare, or question you're not comfortable with — no explanation needed.</li>
          <li>Consent matters in every game, every round. "No" or "skip" is a complete answer.</li>
          <li>Be a good sport — games are meant to be fun for both people, not a way to embarrass or pressure your partner or friends.</li>
          <li>Use the chat and reaction features the way you'd want them used on you.</li>
        </ul>
      </LegalSection>

      <LegalSection id="harassment" title="3. No Harassment or Hate Speech">
        <p>We have zero tolerance for:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Harassment, bullying, threats, or repeated unwanted contact directed at another user.</li>
          <li>Hate speech or discrimination based on race, ethnicity, religion, gender, sexual orientation, disability, or any other protected characteristic.</li>
          <li>Sexual harassment, including unwanted sexual comments or pressure to engage with Erotic/Spicy content you haven't opted into.</li>
          <li>Impersonating another person or misrepresenting who you are.</li>
        </ul>
        <p>This applies in lobby chats, couple session messages, activity feeds, and anywhere else you can interact with another user.</p>
      </LegalSection>

      <LegalSection id="adult-content" title="4. Adult Content Is Opt-In & 18+">
        <p>
          LoveyDovey's Erotic and Spicy categories exist for consenting adults who choose to engage with
          them. A few ground rules:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>These categories are only for users 18 and older — see our <a href="/terms" className="text-fuchsia-600 dark:text-fuchsia-400 hover:underline">Terms of Service</a> for the full eligibility requirement.</li>
          <li>Never invite someone into Erotic/Spicy content without their clear, enthusiastic agreement.</li>
          <li>Never share screenshots or recordings of a private session with someone outside that session.</li>
          <li>If a partner opts out or asks to switch back to a milder category, respect that immediately.</li>
        </ul>
      </LegalSection>

      <LegalSection id="privacy" title="5. Respect Other People's Privacy">
        <p>
          Don't share another user's private information — real name, location, contact details,
          screenshots of private conversations, or anything from a couple session — without their
          permission. What happens in a private game session between two people should stay between them
          unless both agree otherwise.
        </p>
      </LegalSection>

      <LegalSection id="reporting" title="6. Reporting Violations">
        <p>
          If someone makes you uncomfortable, breaks these guidelines, or you just want to flag something
          that doesn't feel right, use the in-app Feedback option or email us directly at{' '}
          <a href="mailto:hello@loveydovey.app" className="text-fuchsia-600 dark:text-fuchsia-400 hover:underline">hello@loveydovey.app</a>.
          Include as much detail as you're comfortable sharing (what happened, when, and who was involved) —
          it helps us look into it properly. We take every report seriously and review them personally.
        </p>
      </LegalSection>

      <LegalSection id="consequences" title="7. Consequences for Violations">
        <p>Depending on what happened and how serious it is, we may:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Send a warning and ask for the behavior to stop.</li>
          <li>Temporarily restrict access to certain features (like chat or Erotic/Spicy content).</li>
          <li>Suspend or permanently remove the account involved.</li>
          <li>Report illegal activity (like content involving minors) to the relevant authorities.</li>
        </ul>
        <p>We aim to be fair and proportionate, but user safety always comes first.</p>
      </LegalSection>

      <LegalSection id="contact" title="8. Contact Us">
        <p>
          Questions about these guidelines, or need to report something? Reach us at{' '}
          <a href="mailto:hello@loveydovey.app" className="text-fuchsia-600 dark:text-fuchsia-400 hover:underline">hello@loveydovey.app</a>.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
