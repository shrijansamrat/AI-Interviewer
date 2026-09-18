import { useEffect, useState } from 'react'

function App() {
  const [backendStatus, setBackendStatus] = useState('loading')

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/health')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Backend health check failed')
        }

        setBackendStatus('connected')
      })
      .catch(() => {
        setBackendStatus('unavailable')
      })
  }, [])

  const connectionMessage = {
    loading: 'Connecting to backend...',
    connected: 'Backend connected ✓',
    unavailable: 'Backend unavailable',
  }[backendStatus]

  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f7f2] text-[#18332f]">
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6 sm:px-10 lg:px-16">
        <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-[#d7e8c7] blur-2xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-[#f4d7a1] blur-3xl" />
        <header className="relative flex items-center justify-between">
          <a className="text-lg font-bold tracking-tight" href="/">AI<span className="text-[#e06b45]">-</span>Interviewer</a>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${backendStatus === 'connected' ? 'bg-[#d7e8c7] text-[#315c3d]' : backendStatus === 'unavailable' ? 'bg-[#f7d5c8] text-[#a1452c]' : 'border border-[#bed0c3] bg-white/60 text-[#52716a]'}`}>
              {connectionMessage}
            </span>
            <span className="hidden rounded-full border border-[#bed0c3] bg-white/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#52716a] sm:inline-block">Practice with purpose</span>
          </div>
        </header>
        <section className="relative flex flex-1 items-center py-20 lg:py-24">
          <div className="grid w-full items-center gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
            <div className="max-w-2xl">
              <p className="mb-6 flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.22em] text-[#e06b45]"><span className="h-px w-8 bg-[#e06b45]" />Your next opportunity starts here</p>
              <h1 className="max-w-xl text-5xl font-bold leading-[1.02] tracking-[-0.04em] sm:text-7xl">Meet your interview with confidence.</h1>
              <p className="mt-8 max-w-lg text-lg leading-8 text-[#52716a]">AI-powered mock interview platform for technical and HR interview practice.</p>
              <button className="mt-10 rounded-full bg-[#e06b45] px-7 py-4 text-sm font-bold text-white shadow-[0_12px_24px_-12px_rgba(224,107,69,0.8)] transition-transform hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-[#e06b45]/30">Start Interview <span aria-hidden="true" className="ml-3">&#8594;</span></button>
            </div>
            <div className="relative mx-auto w-full max-w-md lg:justify-self-end">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-[#18332f] p-6 text-white shadow-2xl shadow-[#18332f]/20 sm:p-8">
                <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full border-[28px] border-[#e06b45]" />
                <div className="absolute -bottom-16 -left-14 h-44 w-44 rounded-full border-[24px] border-[#c6ddba]" />
                <div className="relative flex h-full flex-col justify-between">
                  <div className="flex items-center justify-between text-sm text-[#c6ddba]"><span>SESSION 01</span><span className="h-2 w-2 rounded-full bg-[#e06b45]" /></div>
                  <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#c6ddba]">Ready when you are</p><p className="mt-4 text-4xl font-bold leading-tight tracking-[-0.03em]">Think clearly.<br />Answer boldly.</p></div>
                  <div className="border-t border-white/20 pt-5 text-sm leading-6 text-[#b5c9c1]">Build your confidence one thoughtful answer at a time.</div>
                </div>
              </div>
              <div className="absolute -bottom-5 -right-4 rounded-2xl border border-[#bed0c3] bg-white px-5 py-4 shadow-xl sm:-right-8"><p className="text-2xl font-bold text-[#18332f]">01</p><p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#52716a]">First step</p></div>
            </div>
          </div>
        </section>
        <footer className="relative flex items-center justify-between border-t border-[#d4dfd4] py-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#789087]"><span>Technical + HR</span><span>Practice. Improve. Succeed.</span></footer>
      </div>
    </main>
  )
}

export default App
