import { ImageResponse } from 'next/og'

export const alt = 'Stackboard — a focused shared board for one team'
export const size = {
    width: 1200,
    height: 630,
}
export const contentType = 'image/png'

export default function OpengraphImage() {
    return new ImageResponse(
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '80px',
                background: '#0079BF',
                fontFamily: 'sans-serif',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                    marginBottom: 32,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 72,
                        height: 72,
                        borderRadius: 16,
                        background: '#0C66E4',
                        color: '#fff',
                        fontSize: 44,
                        fontWeight: 700,
                    }}
                >
                    S
                </div>
                <div style={{ fontSize: 40, fontWeight: 700, color: '#fff' }}>
                    Stackboard
                </div>
            </div>
            <div
                style={{
                    fontSize: 30,
                    color: 'rgba(255,255,255,0.92)',
                    maxWidth: 900,
                }}
            >
                A focused, Trello-style board for one team managing one shared
                project.
            </div>
        </div>,
        { ...size }
    )
}
