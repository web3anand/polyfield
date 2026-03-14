import { Link } from "wouter";
import { ArrowLeft, FileText, Mail, Globe, Twitter, AlertTriangle } from "lucide-react";

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

export default function Terms() {
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
              <FileText className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Terms of Service</h1>
              <p className="text-xs text-zinc-700 font-mono mt-0.5">Last updated: January 23, 2026</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Notice */}
        <div className="mb-8 p-4 rounded-2xl" style={METALLIC_BORDER}>
          <p className="text-zinc-600 text-xs font-mono text-center tracking-widest">
            PLEASE READ THESE TERMS OF SERVICE CAREFULLY BEFORE USING POLYFIELD.
          </p>
        </div>

        <Section num="1" title="Acceptance of Terms">
          <p>By accessing or using PolyField ("the App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the App.</p>
          <p className="mt-3">We reserve the right to modify these Terms at any time. Such modifications will be effective immediately upon posting. Your continued use of the App after modifications constitutes acceptance.</p>
        </Section>

        <Section num="2" title="Eligibility">
          <p className="mb-3">You must be at least 18 years old to use our services. By using the App, you represent and warrant that:</p>
          <ul className="list-disc list-inside space-y-1 mb-4">
            <li>You are at least 18 years of age</li>
            <li>You have the legal capacity to enter into these Terms</li>
            <li>You are not prohibited from using the App under applicable laws</li>
            <li>You are responsible for ensuring compliance with your local laws</li>
          </ul>
          <div className="rounded-xl p-3 mt-1" style={METALLIC_BORDER}>
            <p className="text-zinc-600 text-xs">Prediction markets may be restricted or prohibited in certain jurisdictions. You are solely responsible for determining whether your use of the App is legal in your jurisdiction.</p>
          </div>
        </Section>

        <Section num="3" title="Description of Services">
          <p className="mb-3">PolyField provides an interface to interact with Polymarket's prediction market platform. Our services include:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Viewing prediction markets and their current prices</li>
            <li>Placing trades on prediction market outcomes</li>
            <li>Managing your cryptocurrency wallet</li>
            <li>Viewing transaction history and positions</li>
            <li>Portfolio tracking and analytics</li>
          </ul>
          <p className="mt-3">We are an interface provider and do not operate the underlying prediction markets or blockchain networks.</p>
        </Section>

        <Section num="4" title="User Accounts">
          <div className="space-y-4">
            <div>
              <p className="text-zinc-300 font-medium mb-2 text-xs">4.1 Account Creation</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>You may create an account using supported authentication methods</li>
                <li>You must provide accurate and complete information</li>
                <li>You are responsible for maintaining the confidentiality of your account</li>
              </ul>
            </div>
            <div>
              <p className="text-zinc-300 font-medium mb-2 text-xs">4.2 Account Security</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>You are responsible for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use</li>
                <li>We are not liable for losses due to unauthorized account access</li>
              </ul>
            </div>
            <div>
              <p className="text-zinc-300 font-medium mb-2 text-xs">4.3 Account Termination</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>You may delete your account at any time</li>
                <li>We may suspend or terminate accounts that violate these Terms</li>
              </ul>
            </div>
          </div>
        </Section>

        <Section num="5" title="Wallet and Transactions">
          <p className="mb-3">By using our wallet services, you acknowledge and agree that:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>You are solely responsible for securing your wallet and private keys</li>
            <li>All blockchain transactions are irreversible and cannot be cancelled</li>
            <li>We are not responsible for any loss of funds</li>
            <li>Transaction fees (gas) are your responsibility</li>
            <li>We do not have access to your private keys and cannot recover lost funds</li>
            <li>We do not provide financial, investment, or trading advice</li>
          </ul>
        </Section>

        <Section num="6" title="Risk Disclosure">
          <div className="rounded-xl p-3 mb-4 flex items-start gap-2.5" style={{
            background: "linear-gradient(#080808, #080808) padding-box, linear-gradient(135deg, rgba(248,113,113,0.3) 0%, rgba(248,113,113,0.05) 100%) border-box",
            border: "1px solid transparent",
          }}>
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-500 text-xs font-medium">
              IMPORTANT: Trading on prediction markets involves significant risk, including the potential loss of your entire investment.
            </p>
          </div>
          <p className="mb-3">By using PolyField, you acknowledge that:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Market prices can be volatile and unpredictable</li>
            <li>Past performance does not guarantee future results</li>
            <li>You should only trade with funds you can afford to lose</li>
            <li>We make no guarantees about the accuracy of market information</li>
            <li>Prediction market outcomes are determined by real-world events outside our control</li>
            <li>Cryptocurrency values can fluctuate significantly</li>
          </ul>
        </Section>

        <Section num="7" title="Prohibited Activities">
          <p className="mb-3">You agree not to:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Use the App for any illegal purpose</li>
            <li>Engage in market manipulation or fraudulent activities</li>
            <li>Attempt to hack, disrupt, or compromise our systems</li>
            <li>Create multiple accounts for abusive purposes</li>
            <li>Use automated systems, bots, or scripts without authorization</li>
            <li>Circumvent geographic restrictions or access controls</li>
            <li>Impersonate others or provide false information</li>
            <li>Violate any applicable laws or regulations</li>
          </ul>
        </Section>

        <Section num="8" title="Intellectual Property">
          <p>All content, features, and functionality of the App are owned by PolyField and are protected by international copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.</p>
        </Section>

        <Section num="9" title="User Content">
          <p>You retain ownership of content you submit to the App. By submitting content, you grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute such content in connection with providing our services.</p>
        </Section>

        <Section num="10" title="Third-Party Services">
          <p className="mb-3">The App integrates with third-party services including:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Polymarket (prediction markets)</li>
            <li>Polygon blockchain network</li>
            <li>Privy (authentication)</li>
            <li>Google Play Services</li>
          </ul>
          <p className="mt-3">Your use of these services is subject to their respective terms and policies.</p>
        </Section>

        <Section num="11" title="Disclaimer of Warranties">
          <div className="rounded-xl p-4" style={METALLIC_BORDER}>
            <p className="font-mono text-xs text-zinc-500 mb-2">THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, INCLUDING:</p>
            <ul className="list-disc list-inside space-y-1 font-mono text-xs text-zinc-600">
              <li>MERCHANTABILITY</li>
              <li>FITNESS FOR A PARTICULAR PURPOSE</li>
              <li>NON-INFRINGEMENT</li>
              <li>ACCURACY OF INFORMATION</li>
            </ul>
            <p className="mt-3 font-mono text-xs text-zinc-400 font-semibold">YOUR USE OF THE APP IS AT YOUR SOLE RISK.</p>
          </div>
        </Section>

        <Section num="12" title="Limitation of Liability">
          <div className="rounded-xl p-4" style={METALLIC_BORDER}>
            <p className="font-mono text-xs text-zinc-500 mb-2">TO THE MAXIMUM EXTENT PERMITTED BY LAW, POLYFIELD SHALL NOT BE LIABLE FOR:</p>
            <ul className="list-disc list-inside space-y-1 font-mono text-xs text-zinc-600">
              <li>ANY INDIRECT, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES</li>
              <li>LOSS OF PROFITS, DATA, OR OTHER INTANGIBLE LOSSES</li>
              <li>DAMAGES RESULTING FROM YOUR USE OR INABILITY TO USE THE APP</li>
              <li>LOSSES FROM MARKET FLUCTUATIONS OR TRADING ACTIVITIES</li>
            </ul>
            <p className="mt-3 font-mono text-xs text-zinc-500">IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED $100.</p>
          </div>
        </Section>

        <Section num="13" title="Indemnification">
          <p>You agree to indemnify and hold harmless PolyField, its officers, directors, employees, agents, and affiliates from any claims, damages, losses, liabilities, costs, or expenses arising from your use of the App, your violation of these Terms, or your violation of any applicable laws.</p>
        </Section>

        <Section num="14" title="Termination">
          <p className="mb-3">We reserve the right to suspend or terminate your account at any time, with or without cause, with or without notice.</p>
          <p>Upon termination, your right to use the App will immediately cease. Provisions that should survive termination will remain in effect.</p>
        </Section>

        <Section num="15" title="Governing Law & Dispute Resolution">
          <p className="mb-3">These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.</p>
          <p>Any disputes shall be resolved through good faith negotiation, or if negotiation fails, binding arbitration. You waive any right to participate in class action lawsuits.</p>
        </Section>

        <Section num="16" title="Severability & Entire Agreement">
          <p>If any provision of these Terms is found to be unenforceable, the remaining provisions shall remain in full force and effect. These Terms, together with our Privacy Policy, constitute the entire agreement between you and PolyField.</p>
        </Section>

        <Section num="17" title="Contact Us">
          <p className="mb-4">If you have any questions about these Terms, please contact us:</p>
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
