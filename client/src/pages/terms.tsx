import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShinyText } from "@/components/shiny-text";
import { ArrowLeft, FileText, Mail, Globe, Twitter, AlertTriangle } from "lucide-react";

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
    return (
        <section className="mb-6 sm:mb-8">
            <h2 className="text-fluid-lg sm:text-fluid-xl md:text-fluid-2xl font-bold text-foreground mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
                <span className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-primary/10 text-primary text-fluid-xs sm:text-fluid-sm font-bold">{num}</span>
                {title}
            </h2>
            <Card className="p-fluid-card border border-border">{children}</Card>
        </section>
    );
}

export default function Terms() {
    return (
        <div className="min-h-screen bg-background pt-[clamp(48px,40px+2vw,64px)]">
            {/* Header */}
            <div className="border-b border-border bg-card/50">
                <div className="container mx-auto px-fluid-sm py-4 sm:py-6 md:py-8">
                    <Link href="/">
                        <Button variant="ghost" size="sm" className="mb-4 sm:mb-6 text-fluid-xs sm:text-fluid-sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Home
                        </Button>
                    </Link>
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-primary/10 border border-primary/20">
                            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-fluid-2xl sm:text-fluid-3xl md:text-fluid-4xl font-bold text-foreground">
                                <ShinyText>Terms of Service</ShinyText>
                            </h1>
                            <p className="text-fluid-xs sm:text-fluid-sm text-muted-foreground mt-1">Last updated: January 23, 2026</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-fluid-sm py-fluid-md max-w-4xl">
                {/* Warning Banner */}
                <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-chart-3/10 border border-chart-3/30">
                    <p className="text-chart-3 font-medium text-fluid-xs sm:text-fluid-sm text-center">
                        PLEASE READ THESE TERMS OF SERVICE CAREFULLY BEFORE USING POLYFIELD.
                    </p>
                </div>

                <div className="text-fluid-xs sm:text-fluid-sm text-muted-foreground space-y-1 leading-relaxed">

                    <Section num="1" title="Acceptance of Terms">
                        <p className="text-muted-foreground leading-relaxed">
                            By accessing or using PolyField ("the App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the App.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-3">
                            We reserve the right to modify these Terms at any time. Such modifications will be effective immediately upon posting. Your continued use of the App after modifications constitutes acceptance of the updated Terms.
                        </p>
                    </Section>

                    <Section num="2" title="Eligibility">
                        <p className="text-muted-foreground mb-3">You must be at least 18 years old to use our services. By using the App, you represent and warrant that:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>You are at least 18 years of age</li>
                            <li>You have the legal capacity to enter into these Terms</li>
                            <li>You are not prohibited from using the App under applicable laws</li>
                            <li>You are responsible for ensuring compliance with your local laws regarding prediction markets and cryptocurrency</li>
                        </ul>
                        <div className="mt-4 p-3 bg-accent">
                            <p className="text-muted-foreground text-fluid-xs">
                                Prediction markets may be restricted or prohibited in certain jurisdictions. You are solely responsible for determining whether your use of the App is legal in your jurisdiction.
                            </p>
                        </div>
                    </Section>

                    <Section num="3" title="Description of Services">
                        <p className="text-muted-foreground mb-3">PolyField provides a mobile interface to interact with Polymarket's prediction market platform. Our services include:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>Viewing prediction markets and their current prices</li>
                            <li>Placing trades on prediction market outcomes</li>
                            <li>Managing your cryptocurrency wallet</li>
                            <li>Viewing transaction history and positions</li>
                            <li>Portfolio tracking and analytics</li>
                        </ul>
                        <p className="text-muted-foreground mt-3">We are an interface provider and do not operate the underlying prediction markets or blockchain networks.</p>
                    </Section>

                    <Section num="4" title="User Accounts">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-foreground font-semibold mb-2">4.1 Account Creation</h3>
                                <ul className="list-disc list-inside text-muted-foreground space-y-1 text-fluid-xs">
                                    <li>You may create an account using supported authentication methods</li>
                                    <li>You must provide accurate and complete information</li>
                                    <li>You are responsible for maintaining the confidentiality of your account</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-foreground font-semibold mb-2">4.2 Account Security</h3>
                                <ul className="list-disc list-inside text-muted-foreground space-y-1 text-fluid-xs">
                                    <li>You are responsible for all activities under your account</li>
                                    <li>Notify us immediately of any unauthorized use</li>
                                    <li>We are not liable for losses due to unauthorized account access</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-foreground font-semibold mb-2">4.3 Account Termination</h3>
                                <ul className="list-disc list-inside text-muted-foreground space-y-1 text-fluid-xs">
                                    <li>You may delete your account at any time</li>
                                    <li>We may suspend or terminate accounts that violate these Terms</li>
                                </ul>
                            </div>
                        </div>
                    </Section>

                    <Section num="5" title="Wallet and Transactions">
                        <p className="text-muted-foreground mb-3">By using our wallet services, you acknowledge and agree that:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>You are solely responsible for securing your wallet and private keys</li>
                            <li>All blockchain transactions are irreversible and cannot be cancelled</li>
                            <li>We are not responsible for any loss of funds due to user error, hacking, or technical issues</li>
                            <li>Transaction fees (gas) are your responsibility</li>
                            <li>We do not have access to your private keys and cannot recover lost funds</li>
                            <li>We do not provide financial, investment, or trading advice</li>
                        </ul>
                    </Section>

                    <Section num="6" title="Risk Disclosure">
                        <div className="p-3 sm:p-4 bg-destructive/10 border border-destructive/30 mb-4 flex items-start gap-2 sm:gap-3">
                            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-destructive flex-shrink-0 mt-0.5" />
                            <p className="text-destructive font-bold text-fluid-xs sm:text-fluid-sm">
                                IMPORTANT: Trading on prediction markets involves significant risk, including the potential loss of your entire investment.
                            </p>
                        </div>
                        <p className="text-muted-foreground mb-3">By using PolyField, you acknowledge that:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>Market prices can be volatile and unpredictable</li>
                            <li>Past performance does not guarantee future results</li>
                            <li>You should only trade with funds you can afford to lose</li>
                            <li>We make no guarantees about the accuracy of market information</li>
                            <li>Prediction market outcomes are determined by real-world events outside our control</li>
                            <li>Cryptocurrency values can fluctuate significantly</li>
                        </ul>
                    </Section>

                    <Section num="7" title="Prohibited Activities">
                        <p className="text-muted-foreground mb-3">You agree not to:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
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
                        <p className="text-muted-foreground">
                            All content, features, and functionality of the App are owned by PolyField and are protected by international copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.
                        </p>
                    </Section>

                    <Section num="9" title="User Content">
                        <p className="text-muted-foreground">
                            You retain ownership of content you submit to the App (such as profile pictures). By submitting content, you grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute such content in connection with providing our services.
                        </p>
                    </Section>

                    <Section num="10" title="Third-Party Services">
                        <p className="text-muted-foreground mb-3">The App integrates with third-party services including:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>Polymarket (prediction markets)</li>
                            <li>Polygon blockchain network</li>
                            <li>Privy (authentication)</li>
                            <li>Google Play Services</li>
                        </ul>
                        <p className="text-muted-foreground mt-3">Your use of these services is subject to their respective terms and policies.</p>
                    </Section>

                    <Section num="11" title="Disclaimer of Warranties">
                        <div className="p-3 sm:p-4 bg-accent font-mono text-fluid-xs">
                            <p className="text-muted-foreground mb-2">THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, INCLUDING:</p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                <li>MERCHANTABILITY</li>
                                <li>FITNESS FOR A PARTICULAR PURPOSE</li>
                                <li>NON-INFRINGEMENT</li>
                                <li>ACCURACY OF INFORMATION</li>
                            </ul>
                            <p className="mt-3 text-chart-3 font-semibold">YOUR USE OF THE APP IS AT YOUR SOLE RISK.</p>
                        </div>
                    </Section>

                    <Section num="12" title="Limitation of Liability">
                        <div className="p-3 sm:p-4 bg-accent font-mono text-fluid-xs">
                            <p className="text-muted-foreground mb-2">TO THE MAXIMUM EXTENT PERMITTED BY LAW, POLYFIELD SHALL NOT BE LIABLE FOR:</p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                <li>ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES</li>
                                <li>LOSS OF PROFITS, DATA, OR OTHER INTANGIBLE LOSSES</li>
                                <li>DAMAGES RESULTING FROM YOUR USE OR INABILITY TO USE THE APP</li>
                                <li>DAMAGES RESULTING FROM UNAUTHORIZED ACCESS TO YOUR ACCOUNT</li>
                                <li>LOSSES FROM MARKET FLUCTUATIONS OR TRADING ACTIVITIES</li>
                            </ul>
                            <p className="mt-3 text-muted-foreground">IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED $100.</p>
                        </div>
                    </Section>

                    <Section num="13" title="Indemnification">
                        <p className="text-muted-foreground">
                            You agree to indemnify and hold harmless PolyField, its officers, directors, employees, agents, and affiliates from any claims, damages, losses, liabilities, costs, or expenses arising from your use of the App, your violation of these Terms, or your violation of any applicable laws.
                        </p>
                    </Section>

                    <Section num="14" title="Termination">
                        <p className="text-muted-foreground mb-3">We reserve the right to suspend or terminate your account at any time, with or without cause, with or without notice.</p>
                        <p className="text-muted-foreground">Upon termination, your right to use the App will immediately cease, you remain responsible for any pending transactions, and provisions that should survive termination will remain in effect.</p>
                    </Section>

                    <Section num="15" title="Governing Law & Dispute Resolution">
                        <p className="text-muted-foreground mb-3">These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.</p>
                        <p className="text-muted-foreground">Any disputes shall be resolved through good faith negotiation, or if negotiation fails, binding arbitration. You waive any right to participate in class action lawsuits.</p>
                    </Section>

                    <Section num="16" title="Severability & Entire Agreement">
                        <p className="text-muted-foreground">
                            If any provision of these Terms is found to be unenforceable, the remaining provisions shall remain in full force and effect. These Terms, together with our Privacy Policy, constitute the entire agreement between you and PolyField.
                        </p>
                    </Section>

                    <Section num="17" title="Contact Us">
                        <p className="text-muted-foreground mb-4">If you have any questions about these Terms, please contact us:</p>
                        <div className="grid sm:grid-cols-3 gap-2 sm:gap-3">
                            <a href="mailto:polyfield.predict@gmail.com" className="flex items-center gap-2 sm:gap-3 p-3 bg-accent/50 hover:bg-accent transition-colors">
                                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                                <span className="text-muted-foreground text-fluid-xs truncate">polyfield.predict@gmail.com</span>
                            </a>
                            <a href="https://twitter.com/polyfielder" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 sm:gap-3 p-3 bg-accent/50 hover:bg-accent transition-colors">
                                <Twitter className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                                <span className="text-muted-foreground text-fluid-xs">@polyfielder</span>
                            </a>
                            <a href="https://polyfield.fun" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 sm:gap-3 p-3 bg-accent/50 hover:bg-accent transition-colors">
                                <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                                <span className="text-muted-foreground text-fluid-xs">polyfield.fun</span>
                            </a>
                        </div>
                    </Section>

                </div>

                {/* Footer */}
                <div className="mt-12 sm:mt-16 pt-6 sm:pt-8 border-t border-border">
                    <p className="text-center text-fluid-xs text-muted-foreground">© 2026 PolyField. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}
