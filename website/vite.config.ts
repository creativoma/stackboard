import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const REPO_ROOT = resolve(import.meta.dirname, '..')
const CHANGELOG_PATH = resolve(REPO_ROOT, 'CHANGELOG.md')
const ROADMAP_PATH = resolve(REPO_ROOT, 'ROADMAP.md')

const VIRTUAL_ID = 'virtual:updates-data'
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_ID

const SHIPPED_COUNT = 4
const NEXT_UP_COUNT = 3

// One entry of a `- **Bold lead.** rest of the sentence…` bullet, possibly
// wrapped across multiple lines with a two-space markdown continuation.
function extractBullets(section: string): string[] {
    const lines = section.split('\n')
    const bullets: string[] = []
    let current: string[] | null = null
    for (const line of lines) {
        if (/^- /.test(line)) {
            if (current) bullets.push(current.join(' ').trim())
            current = [line.replace(/^- /, '')]
        } else if (/^#{1,6} /.test(line) || line.trim() === '') {
            if (current) bullets.push(current.join(' ').trim())
            current = null
        } else if (current) {
            current.push(line.trim())
        }
    }
    if (current) bullets.push(current.join(' ').trim())
    return bullets
}

// A bullet's short summary: its bold lead phrase, or its first sentence.
function bulletTitle(bullet: string): string {
    const bold = /^\*\*([^*]+)\*\*/.exec(bullet)
    const raw = bold ? bold[1] : (bullet.split(/(?<=[.!?])\s/)[0] ?? bullet)
    return raw.replace(/[.:]$/, '').trim()
}

function subsection(block: string, heading: string): string {
    const parts = block.split(/\n(?=#{2,6} )/)
    const match = parts.find((part) => part.startsWith(heading))
    if (!match) return ''
    return match.slice(match.indexOf('\n') + 1)
}

function getShippedItems(count: number): string[] {
    const changelog = readFileSync(CHANGELOG_PATH, 'utf-8')
    const start = changelog.indexOf('\n## [')
    if (start === -1) return []
    const versionBlocks = changelog.slice(start + 1).split(/\n(?=## \[)/)

    const items: string[] = []
    for (const block of versionBlocks) {
        // Only released versions count as shipped — an "[Unreleased]" block
        // describes work on main that no cut release carries yet.
        if (block.startsWith('## [Unreleased]')) continue
        const added = subsection(block, '### Added')
        for (const bullet of extractBullets(added)) {
            items.push(bulletTitle(bullet))
            if (items.length >= count) return items
        }
    }
    return items
}

function getNextUpItems(count: number): string[] {
    const roadmap = readFileSync(ROADMAP_PATH, 'utf-8')
    const nearTerm = subsection(roadmap, '## Near term')
    return extractBullets(nearTerm).slice(0, count).map(bulletTitle)
}

function updatesDataPlugin(): Plugin {
    function generate() {
        const data = {
            shipped: getShippedItems(SHIPPED_COUNT),
            nextUp: getNextUpItems(NEXT_UP_COUNT),
        }
        return `export const SHIPPED = ${JSON.stringify(data.shipped)}\nexport const NEXT_UP = ${JSON.stringify(data.nextUp)}\n`
    }

    return {
        name: 'updates-data',
        resolveId(id) {
            if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID
        },
        load(id) {
            if (id === RESOLVED_VIRTUAL_ID) return generate()
        },
        configureServer(server) {
            const reload = (file: string) => {
                if (file === CHANGELOG_PATH || file === ROADMAP_PATH) {
                    const mod =
                        server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID)
                    if (mod) server.moduleGraph.invalidateModule(mod)
                    server.ws.send({ type: 'full-reload' })
                }
            }
            server.watcher.add([CHANGELOG_PATH, ROADMAP_PATH])
            server.watcher.on('change', reload)
        },
    }
}

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss(), updatesDataPlugin()],
})
