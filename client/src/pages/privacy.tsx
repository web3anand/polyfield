import { Link } from "wouter";
import { ArrowLeft, Shield, Mail, Globe, Twitter } from "lucide-react";

const METALLIC_BORDER = {
  background: "linear-gradient(#080808, #080808) padding-box, linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.08) 100%) border-box",
  border: "1px solid transparent",
} as const;

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-3">
        <span className="w-6 h-6 flex items-center justify-center rounded text-[10px] font-mono shrink-0"
          style={{ ...METALLIC_BORDER, color: "#c9a96e" }}>{num}</span>
        {title}
      </h2>
      <div className="rounded-2xl p-5 text-sm text-zinc-500 leading-relaxed" style={METALLIC_BORDER}>
        {children}
      </div>
    </section>
  );
}

export default function Privacy() {
  return (
    <div className="min-h-screen text-white" style={{ background: "#080808", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-3xl mx-auto px-6 py-10">
          <Link href="/">
            <button className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-300 transition-colors mb-8 font-mono tracking-wider">
              <ArrowLeft className="w-3.5 h-3.5" />
              BACK
            </button>
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={METALLIC_BORDER}>
              <Shield className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Privacy Policy</h1>
              <p className="text-xs text-zinc-700 font-mono mt-0.5">Last updated: January 23, 2026</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">

        <Section num="1" title="Introduction">
          <p>Welcome to PolyField ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services.</p>
          <p className="mt-3">By using PolyField, you agree to the collection and use of information in accordance with this policy.</p>
        </Section>

        <Section num="2" title="Information We Collect">
          <div className="space-y-4">
            <div>
              <p className="text-zinc-300 font-medium mb-2 text-xs">2.1 Information You Provide</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Account information (username, email address, profile picture)</li>
                <li>Wallet addresses associated with your account</li>
                <li>Transaction history and trading activity</li>
                <li>Communications with our support team</li>
                <li><span className="text-zinc-400">Camera and Photos:</span> Accessed only when you explicitly set or update your profile picture.</li>
              </ul>
            </div>
            <div>
              <p className="text-zinc-300 font-medium mb-2 text-xs">2.2 Automatically Collected</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Device information (type, OS, unique identifiers)</li>
                <li>Usage data (features accessed, time spent, crash reports)</li>
                <li>IP address and general location data</li>
                <li>Log data and analytics</li>
              </ul>
            </div>
          </div>
        </Section>

        <Section num="3" title="How We Use Your Information">
          <p className="mb-3">We use the information we collect to:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Provide and maintain our services</li>
            <li>Process transactions and manage your account</li>
            <li>Send important updates and notifications</li>
            <li>Improve our app and develop new features</li>
            <li>Detect and prevent fraud and security issues</li>
            <li>Comply with legal obligations</li>
            <li>Respond to inquiries and provide customer support</li>
          </ul>
        </Section>

        <Section num="4" title="Data Sharing and Disclosure">
          <p className="text-zinc-300 font-medium mb-3 text-xs">We do not sell your personal information.</p>
          <p className="mb-3">We may share your information with:</p>
          <ul className="space-y-2">
            <li><span className="text-zinc-400">Service Providers:</span> Privy (authentication), Polygon blockchain, Polymarket (market data)</li>
            <li><span className="text-zinc-400">Legal Requirements:</span> When required by law, court order, or governmental authority</li>
            <li><span className="text-zinc-400">Business Transfers:</span> In connection with a merger, acquisition, or sale of assets</li>
            <li><span className="text-zinc-400">With Your Consent:</span> When you have given explicit permission</li>
          </ul>
        </Section>

        <Section num="5" title="Data Security">
          <p className="mb-3">We implement industry-standard security measures including:</p>
          <ul className="list-disc list-inside space-y-1 mb-4">
            <li>Encryption of data in transit using HTTPS/TLS</li>
            <li>Secure authentication via Privy</li>
            <li>Hardware-backed encryption for wallet private keys</li>
            <li>Regular security audits and monitoring</li>
          </ul>
          <div className="rounded-xl p-3 mt-1" style={{
            background: "linear-gradient(#080808, #080808) padding-box, linear-gradient(135deg, rgba(201,169,110,0.25) 0%, rgba(201,169,110,0.05) 100%) border-box",
            border: "1px solid transparent",
          }}>
            <p className="text-xs font-medium" style={{ color: "#c9a96e" }}>
              Your wallet private keys are secured using hardware-backed encryption and never leave your device. We cannot access your private keys.
            </p>
          </div>
        </Section>

        <Section num="6" title="Data Retention">
          <p>We retain your personal information for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time by contacting us.</p>
        </Section>

        <Section num="7" title="Your Rights">
          <p className="mb-3">You have the right to:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Access and export your personal data</li>
            <li>Correct inaccurate information</li>
            <li>Delete your account and associated data</li>
            <li>Opt out of marketing communications</li>
            <li>Withdraw consent for data processing</li>
          </ul>
          <p className="mt-3">To exercise these rights, contact us at <a href="mailto:polyfield.predict@gmail.com" className="hover:underline" style={{ color: "#c9a96e" }}>polyfield.predict@gmail.com</a></p>
        </Section>

        <Section num="8" title="Third-Party Services">
          <p className="mb-3">Third-party services we use include:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Google Play Services</li>
            <li>Privy Authentication</li>
            <li>Polygon Network</li>
            <li>Polymarket API</li>
          </ul>
        </Section>

        <Section num="9" title="Children's Privacy">
          <p>Our services are not intended for users under 18 years of age. We do not knowingly collect personal information from children.</p>
        </Section>

        <Section num="10" title="International Data Transfers">
          <p>Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place.</p>
        </Section>

        <Section num="11" title="Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy and updating the "Last updated" date. Your continued use constitutes acceptance.</p>
        </Section>

        <Section num="12" title="Contact Us">
          <p className="mb-4">If you have any questions about this Privacy Policy, please contact us:</p>
          <div className="grid sm:grid-cols-3 gap-2">
            <a href="mailto:polyfield.predict@gmail.com"
              className="flex items-center gap-2 p-3 rounded-xl transition-all duration-150 hover:opacity-80"
              style={METALLIC_BORDER}>
              <Mail className="w-4 h-4 text-zinc-600 shrink-0" />
              <span className="text-xs text-zinc-600 truncate">polyfield.predict@gmail.com</span>
            </a>
            <a href="https://twitter.com/polyfielder" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 rounded-xl transition-all duration-150 hover:opacity-80"
              style={METALLIC_BORDER}>
              <Twitter className="w-4 h-4 text-zinc-600" />
              <span className="text-xs text-zinc-600">@polyfielder</span>
            </a>
            <a href="https://polyfield.fun" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 rounded-xl transition-all duration-150 hover:opacity-80"
              style={METALLIC_BORDER}>
              <Globe className="w-4 h-4 text-zinc-600" />
              <span className="text-xs text-zinc-600">polyfield.fun</span>
            </a>
          </div>
        </Section>

        <div className="pt-8" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-center text-xs text-zinc-800 font-mono">© 2026 PolyField. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
