import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy' }

export default function PrivacyPage() {
    return (
        <div className="min-h-full bg-snow">
            <header className="border-b border-mist">
                <div className="max-w-[720px] mx-auto px-6 py-4">
                    <Link href="/" className="flex items-center w-fit">
                        {/* next/image doesn't optimize SVG (it needs
                            dangerouslyAllowSVG), so a plain img is correct
                            for the logo. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/logos/logo-color.svg"
                            alt="Stackboard"
                            className="h-5 w-auto"
                        />
                    </Link>
                </div>
            </header>

            <main className="max-w-[720px] mx-auto px-6 py-10 flex flex-col gap-6">
                <div>
                    <Link
                        href="/boards"
                        className="text-sm text-electric-blue hover:underline"
                    >
                        &larr; Back to Stackboard
                    </Link>
                    <h1 className="text-[16px] font-medium tracking-[-0.2px] mt-2">
                        Privacy Policy
                    </h1>
                    <p className="text-sm text-fog mt-1">
                        Last updated 2026-08-02
                    </p>
                </div>

                <section className="card-surface flex flex-col gap-3 text-sm text-smoke leading-relaxed">
                    <h2 className="eyebrow">Data we collect</h2>
                    <p>
                        Stackboard stores the account information you provide
                        (name, email, and a hashed password), the boards, cards,
                        and comments you create, and board membership and
                        invitation records needed to run the product.
                    </p>
                </section>

                <section className="card-surface flex flex-col gap-3 text-sm text-smoke leading-relaxed">
                    <h2 className="eyebrow">How we use it</h2>
                    <p>
                        Your data is used solely to operate Stackboard:
                        authenticating you, displaying boards to their members,
                        and sending invitation emails you request. We do not
                        sell your data or use it for advertising.
                    </p>
                </section>

                <section className="card-surface flex flex-col gap-3 text-sm text-smoke leading-relaxed">
                    <h2 className="eyebrow">Passwords &amp; sessions</h2>
                    <p>
                        Passwords are hashed with scrypt and never stored in
                        plain text. Sessions are stored server-side and can be
                        revoked at any time by logging out.
                    </p>
                </section>

                <section className="card-surface flex flex-col gap-3 text-sm text-smoke leading-relaxed">
                    <h2 className="eyebrow">Your choices</h2>
                    <p>
                        You can update your name and password from{' '}
                        <Link
                            href="/boards/account"
                            className="text-electric-blue hover:underline"
                        >
                            Account settings
                        </Link>
                        . To delete your account or export your data, contact
                        the board owner or reach out via the project repository.
                    </p>
                </section>

                <section className="card-surface flex flex-col gap-3 text-sm text-smoke leading-relaxed">
                    <h2 className="eyebrow">Contact</h2>
                    <p>
                        Questions about this policy can be raised as an issue on
                        the{' '}
                        <a
                            href="https://github.com/creativoma/stackboard"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-electric-blue hover:underline"
                        >
                            Stackboard GitHub repository
                        </a>
                        .
                    </p>
                </section>
            </main>
        </div>
    )
}
