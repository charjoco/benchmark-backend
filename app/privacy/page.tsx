import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Benchmark",
};

export default function PrivacyPage() {
  return (
    <div style={{ backgroundColor: "#09090b", minHeight: "100vh", padding: "48px 24px 80px" }}>
      <article style={{
        maxWidth: "700px",
        margin: "0 auto",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        fontSize: "16px",
        lineHeight: "1.75",
        color: "#d4d4d8",
      }}>

        {/* Wordmark */}
        <p style={{ fontSize: "11px", letterSpacing: "0.2em", color: "#52525b", marginBottom: "32px", marginTop: 0 }}>
          BENCHMARK
        </p>

        {/* Title */}
        <h1 style={{ fontSize: "28px", fontWeight: 600, color: "#f4f4f5", lineHeight: 1.25, marginBottom: "8px", marginTop: 0 }}>
          Privacy Policy
        </h1>

        {/* Dates */}
        <p style={{ fontSize: "13px", color: "#71717a", marginTop: 0, marginBottom: "40px" }}>
          Effective Date: June 17, 2026 &nbsp;·&nbsp; Last Updated: June 17, 2026
        </p>

        <hr style={{ border: "none", borderTop: "1px solid #27272a", marginBottom: "40px" }} />

        {/* Introduction */}
        <Section heading="Introduction">
          <p>
            Benchmark ("Benchmark," "we," "us," or "our") is a mobile application that helps you discover men's
            apparel from premium brands. This Privacy Policy explains what information we collect, how we use it,
            who we share it with, and the choices you have. Benchmark is operated by Charjo.
          </p>
          <p>
            By creating an account or using Benchmark, you agree to the practices described in this policy.
          </p>
        </Section>

        {/* Information We Collect */}
        <Section heading="Information We Collect">
          <p>
            <strong style={{ color: "#e4e4e7", fontWeight: 600 }}>Account information.</strong>{" "}
            When you create an account, we collect your email address. You also create a password, which is
            securely encrypted (hashed) and stored by our authentication provider; we never have access to your
            plaintext password.
          </p>
          <p>
            <strong style={{ color: "#e4e4e7", fontWeight: 600 }}>Profile and preferences.</strong>{" "}
            To personalize your experience, we collect the preferences you provide, including your clothing
            sizes, preferred brands, style preferences, price preferences, and your default browsing filters
            (such as brands, sizes, colors, and sort order).
          </p>
          <p>
            <strong style={{ color: "#e4e4e7", fontWeight: 600 }}>Saved items.</strong>{" "}
            We store the products you save or favorite so you can return to them.
          </p>
          <p>
            <strong style={{ color: "#e4e4e7", fontWeight: 600 }}>Usage and analytics data.</strong>{" "}
            We collect anonymous information about how the app is used — for example, when the app is opened,
            and which products, brands, articles, and collections are viewed or tapped. This analytics data is
            not linked to your name, email, or account. It is associated only with a randomly generated,
            anonymous identifier.
          </p>
          <p>
            <strong style={{ color: "#e4e4e7", fontWeight: 600 }}>Information collected automatically.</strong>{" "}
            When you use the app, certain technical information is collected automatically, including your app
            version, device type, operating system version, screen size, an anonymous device identifier, and
            IP address. IP addresses are used by our service providers for standard operations such as content
            delivery, security, and approximate (country- or region-level) location.
          </p>
        </Section>

        {/* Information We Do Not Collect */}
        <Section heading="Information We Do Not Collect">
          <p>We want to be clear about what we do not collect. Benchmark does not collect:</p>
          <ul>
            <li>Your precise location or GPS data</li>
            <li>The device advertising identifier (IDFA)</li>
            <li>Your contacts, photos, calendar, camera, microphone, or health data</li>
            <li>Payment or financial information (we do not process purchases — see "Affiliate Links" below)</li>
            <li>Information that tracks you across other companies' apps and websites</li>
          </ul>
        </Section>

        {/* How We Use Your Information */}
        <Section heading="How We Use Your Information">
          <p>We use the information we collect to:</p>
          <ul>
            <li>Create and maintain your account</li>
            <li>Personalize the products and content shown to you</li>
            <li>Save your preferences and favorited items</li>
            <li>Understand how the app is used so we can improve it</li>
            <li>Keep the app secure and prevent abuse</li>
            <li>Send you essential account communications, such as the email used to confirm your account</li>
          </ul>
        </Section>

        {/* Affiliate Links */}
        <Section heading="Affiliate Links">
          <p>
            Benchmark is a discovery app — we do not sell products directly, and no purchases take place
            inside the app. When you choose to shop an item, we direct you to the retailer's own website to
            complete your purchase. We may earn a commission through affiliate links when you make a purchase
            after tapping through from Benchmark, at no additional cost to you.
          </p>
          <p>
            When you visit a retailer's website, that retailer's own privacy policy and practices apply.
            The retailer may collect your IP address and device information and may set its own cookies,
            independently of Benchmark.
          </p>
        </Section>

        {/* How Your Information Is Shared */}
        <Section heading="How Your Information Is Shared">
          <p>We do not sell your personal information.</p>
          <p>
            We share information only with service providers that help us operate Benchmark, and only as
            needed for them to provide their service:
          </p>
          <ul>
            <li>
              <strong style={{ color: "#e4e4e7", fontWeight: 600 }}>Supabase</strong> — provides account
              authentication and securely stores your account information, preferences, and saved items,
              including sending account-related emails such as sign-up confirmations.
            </li>
            <li>
              <strong style={{ color: "#e4e4e7", fontWeight: 600 }}>PostHog</strong> — provides anonymous
              product analytics (the usage data described above). PostHog does not receive your email or
              account identity.
            </li>
            <li>
              <strong style={{ color: "#e4e4e7", fontWeight: 600 }}>Expo</strong> — provides app build and
              over-the-air update infrastructure.
            </li>
            <li>
              <strong style={{ color: "#e4e4e7", fontWeight: 600 }}>Railway and Neon</strong> — provide the
              backend servers and product-catalog database that power the app's content.
            </li>
            <li>
              <strong style={{ color: "#e4e4e7", fontWeight: 600 }}>Anthropic</strong> — used only to help
              categorize products in our catalog. No user information is involved.
            </li>
          </ul>
          <p>These providers may store and process data in the United States.</p>
        </Section>

        {/* Data Retention */}
        <Section heading="Data Retention">
          <p>
            We retain your account information and preferences for as long as your account is active. If
            you delete your account, we delete your associated personal information from our systems, except
            where we are required to retain it by law.
          </p>
        </Section>

        {/* Your Choices and Rights */}
        <Section heading="Your Choices and Rights">
          <ul>
            <li>
              <strong style={{ color: "#e4e4e7", fontWeight: 600 }}>Update your preferences.</strong>{" "}
              You can view and update your sizes, brands, and other preferences at any time within the app.
            </li>
            <li>
              <strong style={{ color: "#e4e4e7", fontWeight: 600 }}>Delete your account.</strong>{" "}
              You can delete your account and associated personal data from within the app's settings. You
              may also contact us at the email below to request deletion.
            </li>
            <li>
              <strong style={{ color: "#e4e4e7", fontWeight: 600 }}>Access and other rights.</strong>{" "}
              Depending on where you live (for example, under the EU's GDPR or California's CCPA), you may
              have the right to access, correct, or delete your personal information, or to object to certain
              processing. To exercise any of these rights, contact us at the email below.
            </li>
          </ul>
        </Section>

        {/* Data Security */}
        <Section heading="Data Security">
          <p>
            We take reasonable measures to protect your information. Passwords are stored in encrypted
            (hashed) form, data is transmitted over encrypted connections, and your login session is stored
            securely on your device. No method of transmission or storage is completely secure, however, and
            we cannot guarantee absolute security.
          </p>
        </Section>

        {/* Children's Privacy */}
        <Section heading="Children's Privacy">
          <p>
            Benchmark is not directed to children under the age of 13 (or the equivalent minimum age in
            your country), and we do not knowingly collect personal information from children. If you believe
            a child has provided us with personal information, please contact us and we will delete it.
          </p>
        </Section>

        {/* International Users */}
        <Section heading="International Users">
          <p>
            Benchmark is operated in the United States, and the information we collect is stored and
            processed in the United States. If you access Benchmark from outside the United States, you
            understand that your information will be transferred to and processed in the United States.
          </p>
        </Section>

        {/* Changes to This Policy */}
        <Section heading="Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. When we do, we will revise the "Last
            Updated" date at the top of this policy. If we make material changes, we will provide notice
            as appropriate.
          </p>
        </Section>

        {/* Contact Us */}
        <Section heading="Contact Us">
          <p>If you have questions about this Privacy Policy or your information, you can contact us at:</p>
          <p style={{ marginTop: "16px" }}>
            Charjo<br />
            <a href="mailto:mohrjd@gmail.com" style={{ color: "#a1a1aa", textDecoration: "underline" }}>
              mohrjd@gmail.com
            </a>
          </p>
        </Section>

      </article>
    </div>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "40px" }}>
      <h2 style={{
        fontSize: "18px",
        fontWeight: 600,
        color: "#f4f4f5",
        marginTop: 0,
        marginBottom: "16px",
        paddingBottom: "8px",
        borderBottom: "1px solid #27272a",
      }}>
        {heading}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {children}
      </div>
    </section>
  );
}
