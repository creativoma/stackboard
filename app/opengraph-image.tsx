import { ImageResponse } from 'next/og'
import { BrandMark } from '@/app/_components/brand-mark'

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
                background: 'linear-gradient(105deg, #1868db 0%, #0f4aa3 100%)',
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
                <BrandMark size={72} />
                <div
                    style={{
                        fontSize: 40,
                        fontWeight: 400,
                        letterSpacing: '-1px',
                        color: '#ffffff',
                    }}
                >
                    Stackboard
                </div>
            </div>
            <div
                style={{
                    fontSize: 30,
                    color: 'rgba(255,255,255,0.85)',
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
