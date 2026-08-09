import { Nav } from './components/Nav'
import { Hero } from './components/Hero'
import { Features } from './components/Features'
import { Updates } from './components/Updates'
import { Stack } from './components/Stack'
import { Footer } from './components/Footer'

export default function App() {
    return (
        <div className="min-h-screen flex flex-col bg-snow">
            <Nav />
            <main className="flex-1">
                <Hero />
                <Features />
                <Updates />
                <Stack />
            </main>
            <Footer />
        </div>
    )
}
