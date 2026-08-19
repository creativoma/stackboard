import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Metadata } from 'next'
import { Button } from '@/app/_components/button'
import { renderMarkdownLite } from '@/lib/markdown'

export const metadata: Metadata = { title: "What's new" }

type ChangelogSection = { heading: string; items: string[] }
type ChangelogRelease = { title: string; sections: ChangelogSection[] }

function parseChangelog(source: string): ChangelogRelease[] {
    const releases: ChangelogRelease[] = []
    let currentRelease: ChangelogRelease | null = null
    let currentSection: ChangelogSection | null = null

    for (const line of source.split('\n')) {
        const releaseMatch = line.match(/^##\s+(.+)$/)
        const sectionMatch = line.match(/^###\s+(.+)$/)
        const itemMatch = line.match(/^-\s+(.+)$/)

        if (releaseMatch) {
            currentRelease = { title: releaseMatch[1].trim(), sections: [] }
            releases.push(currentRelease)
            currentSection = null
        } else if (sectionMatch && currentRelease) {
            currentSection = { heading: sectionMatch[1].trim(), items: [] }
            currentRelease.sections.push(currentSection)
        } else if (itemMatch && currentSection) {
            currentSection.items.push(itemMatch[1].trim())
        } else if (currentSection && line.trim() !== '') {
            // Hard-wrapped bullets continue on indented lines — fold them
            // back into the item, or every wrapped entry loses its tail.
            const items = currentSection.items
            if (items.length > 0) {
                items[items.length - 1] += ` ${line.trim()}`
            }
        }
    }

    // An empty release heading (e.g. a fresh "[Unreleased]") has no card.
    return releases.filter((release) =>
        release.sections.some((section) => section.items.length > 0)
    )
}

/** "[0.3.1] - 2026-08-19" → "0.3.1 — 2026-08-19", "[Unreleased]" → "Unreleased" */
function releaseLabel(title: string): string {
    return title
        .replace(/^\[([^\]]+)\]\s*(?:-\s*)?/, '$1 — ')
        .replace(/ — $/, '')
}

export default async function ChangelogPage() {
    const source = await readFile(
        path.join(process.cwd(), 'CHANGELOG.md'),
        'utf-8'
    )
    const releases = parseChangelog(source)

    return (
        <div className="flex flex-col gap-6 max-w-[720px]">
            <div>
                <Button href="/boards" variant="ghost">
                    &larr; Boards
                </Button>
                <h1 className="text-[16px] font-medium tracking-[-0.2px] mt-1">
                    What&apos;s new
                </h1>
            </div>

            <div className="flex flex-col gap-8">
                {releases.map((release) => (
                    <section
                        key={release.title}
                        aria-labelledby={`release-${release.title}`}
                        className="card-surface"
                    >
                        <h2
                            id={`release-${release.title}`}
                            className="text-base font-medium mb-3"
                        >
                            {releaseLabel(release.title)}
                        </h2>
                        <div className="flex flex-col gap-4">
                            {release.sections.map((section) => (
                                <div key={section.heading}>
                                    <h3 className="eyebrow mb-2">
                                        {section.heading}
                                    </h3>
                                    <ul className="flex flex-col gap-1.5 list-disc pl-4 text-sm text-[var(--color-smoke)]">
                                        {section.items.map((item, i) => (
                                            <li
                                                key={i}
                                                // Safe: renderMarkdownLite
                                                // HTML-escapes the whole line
                                                // before adding formatting.
                                                dangerouslySetInnerHTML={{
                                                    __html: renderMarkdownLite(
                                                        item
                                                    ),
                                                }}
                                            />
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    )
}

export const dynamic = 'force-dynamic'
