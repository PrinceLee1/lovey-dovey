import LegalPageLayout, { LegalSection } from '../../components/legal/LegalPageLayout';

const SECTIONS = [
  { id: 'acceptance', title: '1. Acceptance of Terms' },
  { id: 'eligibility', title: '2. Eligibility' },
  { id: 'account', title: '3. Your Account' },
  { id: 'acceptable-use', title: '4. Acceptable Use' },
  { id: 'content', title: '5. Game Content & AI-Generated Material' },
  { id: 'payments', title: '6. Payments & Subscriptions' },
  { id: 'termination', title: '7. Termination' },
  { id: 'disclaimers', title: '8. Disclaimers & Limitation of Liability' },
  { id: 'changes', title: '9. Changes to These Terms' },
  { id: 'contact', title: '10. Contact Us' },
];

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated="September 6, 2026" sections={SECTIONS}>
      <LegalSection id="acceptance" title="1. Acceptance of Terms">
        <p>
          These Terms of Service ("Terms") govern your use of LoveyDovey, a real-time games platform for
          couples and friends (the "App"). By creating an account or otherwise using the App, you agree to
          these Terms. If you don't agree, please don't use LoveyDovey.
        </p>
        <p>
          LoveyDovey is currently operated independently and is not yet a formally registered company.
          References to "we," "us," or "LoveyDovey" mean the individual(s) operating the App.
        </p>
      </LegalSection>

      <LegalSection id="eligibility" title="2. Eligibility">
        <p>
          <b>LoveyDovey is for adults only — you must be 18 years of age or older to create an account or
          use the App.</b> This is a hard requirement, not a suggestion: the App includes Erotic and Spicy
          game categories with sexual and suggestive content intended exclusively for adults. By using
          LoveyDovey, you confirm that you are at least 18 and that you have the legal capacity to agree to
          these Terms wherever you live.
        </p>
      </LegalSection>

      <LegalSection id="account" title="3. Your Account">
        <p>You're responsible for:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Providing accurate information when you sign up, and keeping it up to date.</li>
          <li>Keeping your password confidential and secure — don't share your account with anyone else.</li>
          <li>All activity that happens under your account, whether or not you personally performed it.</li>
        </ul>
        <p>
          If you believe your account has been compromised, contact us immediately at{' '}
          <a href="mailto:hello@loveydovey.app" className="text-fuchsia-600 dark:text-fuchsia-400 hover:underline">hello@loveydovey.app</a>.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="4. Acceptable Use">
        <p>To keep LoveyDovey safe and enjoyable, you agree not to:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Harass, threaten, or abuse other users, in or out of a game.</li>
          <li>Share sexually explicit content involving anyone who hasn't consented, or that depicts anyone under 18.</li>
          <li>Impersonate another person, or misrepresent your age or identity.</li>
          <li>Use bots, scripts, or automation to interact with the App outside of its normal interface.</li>
          <li>Attempt to access another user's account, or probe, scan, or interfere with the App's security.</li>
          <li>Use the App for any purpose that's illegal where you live.</li>
        </ul>
        <p>
          For a fuller picture of what respectful use looks like, see our{' '}
          <a href="/community-guidelines" className="text-fuchsia-600 dark:text-fuchsia-400 hover:underline">Community Guidelines</a>.
        </p>
      </LegalSection>

      <LegalSection id="content" title="5. Game Content & AI-Generated Material">
        <p>
          Some of LoveyDovey's game prompts, questions, and dares are generated using AI. While we curate
          and tune these systems to keep content appropriate to its category, AI-generated content can
          occasionally be unpredictable, repetitive, or imperfect. Games are meant to be light-hearted —
          you're always free to skip a prompt you're not comfortable with, and no game requires you to say
          or do anything you don't want to.
        </p>
        <p>
          Any content you or another user submits (messages, custom entries, reactions) remains yours, but
          by posting it in the App you grant us a license to store, display, and transmit it as needed to
          operate the relevant feature (for example, showing your chat message to the person you sent it
          to).
        </p>
      </LegalSection>

      <LegalSection id="payments" title="6. Payments & Subscriptions">
        <p>
          LoveyDovey offers an optional paid tier ("Plus") with additional content and features. Payment
          processing for Plus is handled by Stripe and is <b>not yet live</b> — pricing, billing cycles, and
          exact payment terms will be published here once payments go live, and this section will be
          updated accordingly.
        </p>
        <p>Once payments are live, the following will apply:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Subscriptions renew automatically until cancelled; you can cancel at any time from Settings.</li>
          <li>Refunds are considered on a case-by-case basis — contact us if something went wrong with a charge.</li>
          <li>We may change pricing with advance notice; changes won't apply to a billing cycle already in progress.</li>
        </ul>
      </LegalSection>

      <LegalSection id="termination" title="7. Termination">
        <p>
          You can delete your account at any time from Settings. We may suspend or terminate your account
          if you violate these Terms or our Community Guidelines, engage in behavior that harms other
          users, or if required to do so by law. Where practical, we'll let you know why.
        </p>
      </LegalSection>

      <LegalSection id="disclaimers" title="8. Disclaimers & Limitation of Liability">
        <p>
          LoveyDovey is provided "as is" and "as available," without warranties of any kind, express or
          implied. We don't guarantee the App will be uninterrupted, error-free, or perfectly secure — real-time
          features in particular depend on third-party infrastructure (like Pusher) that's outside our
          direct control.
        </p>
        <p>
          To the fullest extent permitted by law, LoveyDovey and its operator(s) are not liable for any
          indirect, incidental, or consequential damages arising from your use of the App, including
          anything that happens between you and another user off-platform. Nothing in these Terms limits
          liability that can't be limited under applicable law.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="9. Changes to These Terms">
        <p>
          We may update these Terms as LoveyDovey evolves — for example, when payments go live or new
          features launch. We'll update the "Last updated" date above whenever we do, and for material
          changes, we'll make a reasonable effort to notify you in the app. Continuing to use LoveyDovey
          after changes take effect means you accept the updated Terms.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="10. Contact Us">
        <p>
          Questions about these Terms? Email{' '}
          <a href="mailto:hello@loveydovey.app" className="text-fuchsia-600 dark:text-fuchsia-400 hover:underline">hello@loveydovey.app</a>.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
