import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShinyText } from "@/components/shiny-text";
import { ArrowLeft, Shield, Mail, Globe, Twitter } from "lucide-react";

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

export default function Privacy() {
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
                            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-fluid-2xl sm:text-fluid-3xl md:text-fluid-4xl font-bold text-foreground">
                                <ShinyText>Privacy Policy</ShinyText>
                            </h1>
                            <p className="text-fluid-xs sm:text-fluid-sm text-muted-foreground mt-1">Last updated: January 23, 2026</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-fluid-sm py-fluid-md max-w-4xl">
                <div className="text-fluid-xs sm:text-fluid-sm text-muted-foreground space-y-1 leading-relaxed">

                    <Section num="1" title="Introduction">
                        <p className="text-muted-foreground leading-relaxed">
                            Welcome to PolyField ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-3">
                            By using PolyField, you agree to the collection and use of information in accordance with this policy.
                        </p>
                    </Section>

                    <Section num="2" title="Information We Collect">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-fluid-sm sm:text-fluid-base font-semibold text-foreground mb-2">2.1 Information You Provide</h3>
                                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                    <li>Account information (username, email address, profile picture)</li>
                                    <li>Wallet addresses associated with your account</li>
                                    <li>Transaction history and trading activity</li>
                                    <li>Communications with our support team</li>
                                    <li><strong>Camera and Photos:</strong> We access your camera or photo library only when you explicitly choose to set or update your profile picture.</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-fluid-sm sm:text-fluid-base font-semibold text-foreground mb-2">2.2 Automatically Collected Information</h3>
                                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                    <li>Device information (device type, operating system, unique device identifiers)</li>
                                    <li>Usage data (app features accessed, time spent, crash reports)</li>
                                    <li>IP address and general location data</li>
                                    <li>Log data and analytics</li>
                                </ul>
                            </div>
                        </div>
                    </Section>

                    <Section num="3" title="How We Use Your Information">
                        <p className="text-muted-foreground mb-3">We use the information we collect to:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>Provide and maintain our services</li>
                            <li>Process your transactions and manage your account</li>
                            <li>Send you important updates and notifications</li>
                            <li>Improve our app and develop new features</li>
                            <li>Detect and prevent fraud and security issues</li>
                            <li>Comply with legal obligations</li>
                            <li>Respond to your inquiries and provide customer support</li>
                        </ul>
                    </Section>

                    <Section num="4" title="Data Sharing and Disclosure">
                        <p className="text-foreground font-semibold mb-3">We do not sell your personal information.</p>
                        <p className="text-muted-foreground mb-3">We may share your information with:</p>
                        <ul className="text-muted-foreground space-y-2">
                            <li><strong className="text-foreground">Service Providers:</strong> Privy (authentication), Polygon blockchain, Polymarket (market data)</li>
                            <li><strong className="text-foreground">Legal Requirements:</strong> When required by law, court order, or governmental authority</li>
                            <li><strong className="text-foreground">Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                            <li><strong className="text-foreground">With Your Consent:</strong> When you have given us explicit permission</li>
                        </ul>
                    </Section>

                    <Section num="5" title="Data Security">
                        <p className="text-muted-foreground mb-3">We implement industry-standard security measures including:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
                            <li>Encryption of data in transit using HTTPS/TLS</li>
                            <li>Secure authentication via Privy</li>
                            <li>Hardware-backed encryption for wallet private keys</li>
                            <li>Regular security audits and monitoring</li>
                        </ul>
                        <div className="p-3 sm:p-4 bg-primary/10 border border-primary/20">
                            <p className="text-primary font-medium text-fluid-xs sm:text-fluid-sm">
                                Your wallet private keys are secured using hardware-backed encryption and never leave your device. We cannot access your private keys.
                            </p>
                        </div>
                    </Section>

                    <Section num="6" title="Data Retention">
                        <p className="text-muted-foreground">
                            We retain your personal information for as long as your account is active or as needed to provide you services. You may request deletion of your account and associated data at any time by contacting us.
                        </p>
                    </Section>

                    <Section num="7" title="Your Rights">
                        <p className="text-muted-foreground mb-3">You have the right to:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>Access and export your personal data</li>
                            <li>Correct inaccurate information</li>
                            <li>Delete your account and associated data</li>
                            <li>Opt out of marketing communications</li>
                            <li>Withdraw consent for data processing</li>
                        </ul>
                        <p className="text-muted-foreground mt-3">
                            To exercise these rights, contact us at <a href="mailto:polyfield.predict@gmail.com" className="text-primary hover:underline">polyfield.predict@gmail.com</a>
                        </p>
                    </Section>

                    <Section num="8" title="Third-Party Services">
                        <p className="text-muted-foreground mb-3">Third-party services we use include:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>Google Play Services</li>
                            <li>Privy Authentication</li>
                            <li>Polygon Network</li>
                            <li>Polymarket API</li>
                        </ul>
                    </Section>

                    <Section num="9" title="Children's Privacy">
                        <p className="text-muted-foreground">
                            Our services are not intended for users under 18 years of age. We do not knowingly collect personal information from children.
                        </p>
                    </Section>

                    <Section num="10" title="International Data Transfers">
                        <p className="text-muted-foreground">
                            Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place.
                        </p>
                    </Section>

                    <Section num="11" title="Changes to This Policy">
                        <p className="text-muted-foreground">
                            We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy and updating the "Last updated" date. Your continued use constitutes acceptance.
                        </p>
                    </Section>

                    <Section num="12" title="Contact Us">
                        <p className="text-muted-foreground mb-4">If you have any questions about this Privacy Policy, please contact us:</p>
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
