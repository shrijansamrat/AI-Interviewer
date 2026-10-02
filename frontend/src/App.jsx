import { useState } from 'react'

const API_BASE = 'http://127.0.0.1:8000'
async function apiFetch(url, options = {}, token = null) {
  const headers = {
    ...options.headers,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return fetch(url, {
    ...options,
    headers,
  })
}

function App() {
  const [screen, setScreen] = useState(
    () => localStorage.getItem('access_token') ? 'home' : 'auth',
  )
  const [token, setToken] = useState(
    () => localStorage.getItem('access_token'),
  )
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [role, setRole] = useState('Data Scientist')
  const [experience, setExperience] = useState('Fresher')
  const [interviewType, setInterviewType] = useState('Technical')

  const [interviewId, setInterviewId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [evaluation, setEvaluation] = useState(null)
  const [report, setReport] = useState(null)
  const [history, setHistory] = useState([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [documentContext, setDocumentContext] = useState(null)
  const [documentName, setDocumentName] = useState('')

  const currentQuestion = questions[currentIndex]

  async function handleAuth(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const endpoint =
        authMode === 'login' ? '/api/auth/login' : '/api/auth/register'

      const payload = {
        email: authEmail,
        password: authPassword,
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          typeof data.detail === 'string'
            ? data.detail
            : 'Authentication failed',
        )
      }

      let accessToken = data.access_token

      if (authMode === 'register') {
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        const loginData = await loginResponse.json()

        if (!loginResponse.ok) {
          throw new Error(
            typeof loginData.detail === 'string'
              ? loginData.detail
              : 'Registration succeeded, but login failed. Please log in.',
          )
        }

        accessToken = loginData.access_token
      }

      if (!accessToken) {
        throw new Error('The server did not return an access token.')
      }

      localStorage.setItem('access_token', accessToken)
      setToken(accessToken)

      const userResponse = await apiFetch(
        `${API_BASE}/api/auth/me`,
        {},
        accessToken,
      )

      if (!userResponse.ok) {
        throw new Error('Could not load your account details.')
      }

      const userData = await userResponse.json()
      setUser(userData)
      setAuthEmail('')
      setAuthPassword('')
      setScreen('home')
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  async function loadHistory() {
  setLoading(true)
  setError('')

  try {
    const response = await apiFetch(
  `${API_BASE}/api/interviews/`,
  {},
  token,
)

    if (!response.ok) {
      throw new Error('Could not load interview history')
    }

    const data = await response.json()
    setHistory(data)
    setScreen('history')
  } catch (err) {
    setError(err.message || 'Something went wrong')
  } finally {
    setLoading(false)
  }
}

  async function startInterview() {
    setLoading(true)
    setError('')

    try {
      const createResponse = await apiFetch(
  `${API_BASE}/api/interviews`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role,
      experience,
      interview_type: interviewType,
    }),
  },
  token,
)

      if (!createResponse.ok) {
        throw new Error('Could not create interview')
      }

      const interview = await createResponse.json()

      setInterviewId(interview.id)

      
      const generateResponse = await apiFetch(
  `${API_BASE}/api/interviews/${interview.id}/generate-questions`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      document_context: documentContext,
    }),
  },
  token,
)


      if (!generateResponse.ok) {
        const data = await generateResponse.json()
        throw new Error(data.detail || 'Could not generate questions')
      }


      const questionsResponse = await apiFetch(
        `${API_BASE}/api/interviews/${interview.id}/questions`,
        {},
        token,
      )

      if (!questionsResponse.ok) {
        throw new Error('Could not load interview questions')
      }

      const generatedQuestions = await questionsResponse.json()

      setQuestions(generatedQuestions)
      setCurrentIndex(0)
      setAnswer('')
      setEvaluation(null)
      setScreen('interview')
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }
  async function uploadDocument(file) {
  if (!file) {
    return
  }

  setLoading(true)
  setError('')

  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiFetch(
      `${API_BASE}/api/interviews/documents/parse`,
    {
      method: 'POST',
      body: formData,
    },
    token,
  )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.detail || 'Could not parse the document')
    }

    setDocumentName(data.filename)
    setDocumentContext(data.parsed_context)
    setScreen('document-review')
  } catch (err) {
    setError(err.message || 'Document parsing failed')
  } finally {
    setLoading(false)
  }
}

  async function submitAnswer() {
    if (!answer.trim()) {
      setError('Please enter an answer before submitting.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await apiFetch(
        `${API_BASE}/api/interviews/questions/${currentQuestion.id}/answer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            answer_text: answer,
          }),
        },
        token,
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Could not submit answer')
      }

      const data = await response.json()

      setEvaluation(data.evaluation)
      setScreen('feedback')
    } catch (err) {
      setError(err.message || 'Answer submission failed')
    } finally {
      setLoading(false)
    }
  }

  async function nextQuestion() {
    setError('')
    setAnswer('')
    setEvaluation(null)

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((index) => index + 1)
      setScreen('interview')
      return
    }

    setLoading(true)

    try {
      const response = await apiFetch(
        `${API_BASE}/api/interviews/${interviewId}/results`,
        {},
        token,
)

      if (!response.ok) {
        throw new Error('Could not load interview results')
      }

      const results = await response.json()
      setReport(results)
      setScreen('results')
    } catch (err) {
      setError(err.message || 'Could not load results')
    } finally {
      setLoading(false)
    }
  }
  
  function handleLogout() {
  localStorage.removeItem('access_token')
  setToken(null)
  setUser(null)
  setAccountMenuOpen(false)
  setAuthMode('login')
  setAuthEmail('')
  setAuthPassword('')
  setScreen('auth')
  resetToHome()
}

  function resetToHome() {
    setScreen('home')
    setInterviewId(null)
    setQuestions([])
    setCurrentIndex(0)
    setAnswer('')
    setEvaluation(null)
    setReport(null)
    setError('')
  }

  const progress =
    questions.length > 0
      ? ((currentIndex + 1) / questions.length) * 100
      : 0

  return (
    <main className="min-h-screen bg-[#f5f7f2] text-[#18332f]">
      <div className="relative mx-auto min-h-screen max-w-7xl px-6 py-6 sm:px-10 lg:px-16">
        <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-[#d7e8c7] blur-2xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-[#f4d7a1] blur-3xl" />

    <header className="relative flex items-center justify-between border-b border-[#d4dfd4] pb-5">
      <button
        onClick={resetToHome}
        className="text-lg font-bold tracking-tight"
      >
    AI<span className="text-[#e06b45]">-</span>Interviewer
  </button>

  <div className="flex items-center gap-3">
    <span className="rounded-full bg-[#d7e8c7] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#315c3d]">
      AI Interview Practice
    </span>

    {token && (
      <div className="relative">
        <button
          type="button"
          onClick={() => setAccountMenuOpen(!accountMenuOpen)}
          className="flex items-center gap-2 rounded-full border border-[#d4dfd4] bg-white px-3 py-2 text-sm font-semibold text-[#315c3d] shadow-sm"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d7e8c7] text-xs font-bold">
            {(user?.email || 'U').charAt(0).toUpperCase()}
          </span>
          <span className="max-w-40 truncate">
            {user?.email || 'Account'}
          </span>
          <span>⌄</span>
        </button>

        {accountMenuOpen && (
          <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-[#d4dfd4] bg-white p-3 shadow-xl">
            <p className="break-all px-2 py-2 text-xs text-[#52716a]">
              {user?.email || 'Signed in'}
            </p>
            <div className="my-2 border-t border-[#e5ebe3]" />
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#a1452c] hover:bg-[#fff1ec]"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    )}
  </div>
</header>
        

        {error && (
          <div className="relative mx-auto mt-6 max-w-4xl rounded-2xl border border-[#e7b7a7] bg-[#fff1ec] px-5 py-4 text-sm font-medium text-[#a1452c]">
            {error}
          </div>
        )}


        {screen === 'auth' && (
          <section className="relative mx-auto flex min-h-[75vh] max-w-md items-center py-12">
            <div className="w-full rounded-[2rem] bg-white p-8 shadow-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e06b45]">
                AI Interviewer
              </p>

              <h1 className="mt-4 text-4xl font-bold">
                {authMode === 'login' ? 'Welcome back.' : 'Create account.'}
              </h1>

              <p className="mt-3 text-sm leading-6 text-[#52716a]">
                {authMode === 'login'
                  ? 'Log in to continue your interview preparation.'
                  : 'Register to start your AI interview practice.'}
              </p>

              <form onSubmit={handleAuth} className="mt-8 space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold">Email</span>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full rounded-xl border border-[#cbd8ce] px-4 py-3 outline-none focus:border-[#e06b45]"
                    placeholder="you@example.com"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold">Password</span>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    className="w-full rounded-xl border border-[#cbd8ce] px-4 py-3 outline-none focus:border-[#e06b45]"
                    placeholder="At least 8 characters"
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[#e06b45] px-6 py-4 font-bold text-white transition hover:bg-[#c85b39] disabled:opacity-60"
                >
                  {loading
                    ? 'Please wait...'
                    : authMode === 'login'
                      ? 'Log In'
                      : 'Create Account'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-[#52716a]">
                {authMode === 'login'
                  ? "Don't have an account?"
                  : 'Already have an account?'}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'register' : 'login')
                    setError('')
                  }}
                  className="ml-2 font-bold text-[#e06b45] hover:underline"
                >
                  {authMode === 'login' ? 'Register' : 'Log in'}
                </button>
              </p>
            </div>
          </section>
        )}

        {screen === 'home' && (
          <section className="relative flex min-h-[75vh] items-center py-16">
            <div className="grid w-full items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="max-w-2xl">
                <p className="mb-6 flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.22em] text-[#e06b45]">
                  <span className="h-px w-8 bg-[#e06b45]" />
                  Your next opportunity starts here
                </p>

                <h1 className="text-5xl font-bold leading-[1.02] tracking-[-0.04em] sm:text-7xl">
                  Meet your interview with confidence.
                </h1>

                <p className="mt-8 max-w-lg text-lg leading-8 text-[#52716a]">
                  Practice realistic technical and HR interviews with AI-generated
                  questions and instant answer evaluation.
                </p>

                <button
                  onClick={() => setScreen('setup')}
                  className="mt-10 rounded-full bg-[#e06b45] px-8 py-4 text-sm font-bold text-white shadow-lg transition hover:-translate-y-1"
                >
                  Start Interview
                  <span className="ml-3">→</span>
                </button>
                <button
                  onClick={loadHistory}
                  disabled={loading}
                  className="mt-4 rounded-full border border-[#18332f] px-8 py-4 text-sm font-bold text-[#18332f] transition hover:bg-[#e5eee5] disabled:opacity-60"
>
                  {loading ? 'Loading History...' : 'View Interview History'}
                  <span className="ml-3">→</span>
                </button>
              </div>

              <div className="rounded-[2rem] bg-[#18332f] p-8 text-white shadow-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#c6ddba]">
                  AI-powered practice
                </p>

                <h2 className="mt-5 text-4xl font-bold">
                  Think clearly.
                  <br />
                  Answer boldly.
                </h2>

                <div className="mt-10 space-y-4">
                  {[
                    'Role-specific questions',
                    'AI answer evaluation',
                    'Actionable feedback',
                    'Performance report',
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 border-t border-white/10 pt-4 text-[#d7e8c7]"
                    >
                      <span className="text-[#e06b45]">✓</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

                {screen === 'history' && (
          <section className="relative mx-auto max-w-5xl py-16">
            <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e06b45]">
                  Your progress
                </p>
                <h1 className="mt-3 text-4xl font-bold tracking-tight">
                  Interview History
                </h1>
                <p className="mt-3 text-[#52716a]">
                  Review your previous interview sessions and performance.
                </p>
              </div>

              <button
                onClick={() => setScreen('home')}
                className="rounded-full border border-[#18332f] px-6 py-3 text-sm font-bold text-[#18332f] transition hover:bg-[#e5eee5]"
              >
                ← Back to Home
              </button>
            </div>

            {history.length === 0 ? (
              <div className="rounded-3xl border border-[#d7e3d9] bg-white p-10 text-center shadow-sm">
                <h2 className="text-xl font-bold text-[#18332f]">
                  No interviews yet
                </h2>
                <p className="mt-3 text-[#52716a]">
                  Your completed and ongoing interviews will appear here.
                </p>
                <button
                  onClick={() => setScreen('setup')}
                  className="mt-6 rounded-full bg-[#e06b45] px-7 py-3 font-bold text-white"
                >
                  Start Your First Interview →
                </button>
              </div>
            ) : (
              <div className="grid gap-5">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-[#d7e3d9] bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-[#18332f]">
                          {item.role}
                        </h2>
                        <p className="mt-2 text-sm text-[#52716a]">
                          {item.experience} · {item.interview_type}
                        </p>
                      </div>

                      <span className="rounded-full bg-[#e5eee5] px-4 py-2 text-sm font-semibold capitalize text-[#18332f]">
                        {item.status}
                      </span>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-8 border-t border-[#e5eee5] pt-5">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-[#789087]">
                          Overall Score
                        </p>
                        <p className="mt-1 text-2xl font-bold text-[#18332f]">
                          {item.overall_score ?? 'Not evaluated'}
                          {item.overall_score !== null &&
                            item.overall_score !== undefined
                            ? '/10'
                            : ''}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wider text-[#789087]">
                          Date
                        </p>
                        <p className="mt-1 font-semibold text-[#18332f]">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleDateString()
                            : 'Date unavailable'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {screen === 'setup' && (
          <section className="relative mx-auto max-w-3xl py-16">
            <div className="mb-10">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e06b45]">
                Step 01
              </p>

              <h1 className="mt-3 text-5xl font-bold tracking-tight">
                Set up your interview.
              </h1>

              <p className="mt-4 text-[#52716a]">
                Tell the interviewer what you are preparing for.
              </p>
            </div>

            <div className="space-y-6 rounded-[2rem] bg-white p-8 shadow-xl">
              <label className="block">
                <span className="mb-2 block text-sm font-bold">
                  Target role
                </span>
                <input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-[#cbd8ce] px-4 py-3 outline-none focus:border-[#e06b45]"
                  placeholder="e.g. Data Scientist"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold">
                  Experience level
                </span>
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full rounded-xl border border-[#cbd8ce] bg-white px-4 py-3 outline-none"
                >
                  <option>Fresher</option>
                  <option>0-2 years</option>
                  <option>2-5 years</option>
                  <option>5+ years</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold">
                  Interview type
                </span>
                <select
                  value={interviewType}
                  onChange={(e) => setInterviewType(e.target.value)}
                  className="w-full rounded-xl border border-[#cbd8ce] bg-white px-4 py-3 outline-none"
                >
                  <option>Technical</option>
                  <option>HR</option>
                  <option>Behavioral</option>
                  <option>Mixed</option>
                </select>
              </label>

              <button
                onClick={() => setScreen('document-upload')}
                disabled={loading}
                className="w-full rounded-xl bg-[#e06b45] px-6 py-4 font-bold text-white transition hover:bg-[#c85b39] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Preparing your interview...' : 'Begin Interview →'}
              </button>
            </div>
          </section>
        )}

        {screen === 'document-upload' && (
  <section className="relative mx-auto max-w-3xl py-16">
    <div className="mb-10">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e06b45]">
        Step 02
      </p>

      <h1 className="mt-3 text-5xl font-bold tracking-tight">
        Personalize your interview.
      </h1>

      <p className="mt-4 text-[#52716a]">
        Upload your resume or a job description. This is optional.
      </p>
    </div>

    <div className="rounded-[2rem] bg-white p-8 shadow-xl">
      <div className="rounded-2xl border-2 border-dashed border-[#cbd8ce] bg-[#fafcf9] p-10 text-center">
        <div className="text-5xl">📄</div>

        <h2 className="mt-5 text-2xl font-bold">
          Upload Resume or Job Description
        </h2>

        <p className="mx-auto mt-3 max-w-lg text-[#789087]">
          Upload a PDF, DOCX, or TXT file and AI will extract relevant
          information to personalize your interview.
        </p>

        <label className="mt-8 inline-block cursor-pointer rounded-full bg-[#18332f] px-7 py-3 font-bold text-white transition hover:-translate-y-0.5">
          {loading ? 'AI is analyzing...' : 'Choose File'}

          <input
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            disabled={loading}
            onChange={(e) => uploadDocument(e.target.files?.[0])}
          />
        </label>

        <p className="mt-4 text-xs text-[#789087]">
          PDF, DOCX or TXT · Maximum 5 MB
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <span className="text-sm text-[#789087]">
          Don't have a resume? No problem.
        </span>

        <button
          type="button"
          onClick={startInterview}
          disabled={loading}
          className="rounded-full bg-[#e06b45] px-6 py-3 font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          Skip & Start Interview →
        </button>
      </div>
    </div>
  </section>
)}

{screen === 'document-review' && documentContext && (
  <section className="relative mx-auto max-w-5xl py-16">
    <div className="mb-10">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e06b45]">
        Step 03
      </p>

      <h1 className="mt-3 text-5xl font-bold tracking-tight">
        Review your profile.
      </h1>

      <p className="mt-4 max-w-2xl text-[#52716a]">
        AI extracted the following information from{' '}
        <span className="font-semibold text-[#18332f]">
          {documentName}
        </span>
        . You can edit anything before we generate your interview.
      </p>
    </div>

    <div className="space-y-6 rounded-[2rem] bg-white p-8 shadow-xl">

      <div>
        <label className="text-sm font-bold text-[#18332f]">
          Document Type
        </label>

        <input
          type="text"
          value={documentContext.document_type || ''}
          onChange={(e) =>
            setDocumentContext({
              ...documentContext,
              document_type: e.target.value,
            })
          }
          className="mt-2 w-full rounded-xl border border-[#cbd8ce] bg-[#fafcf9] px-4 py-3 outline-none focus:border-[#e06b45]"
        />
      </div>

      <div>
        <label className="text-sm font-bold text-[#18332f]">
          Target Role
        </label>

        <input
          type="text"
          value={documentContext.role || ''}
          onChange={(e) =>
            setDocumentContext({
              ...documentContext,
              role: e.target.value,
            })
          }
          className="mt-2 w-full rounded-xl border border-[#cbd8ce] bg-[#fafcf9] px-4 py-3 outline-none focus:border-[#e06b45]"
        />
      </div>

      <div>
        <label className="text-sm font-bold text-[#18332f]">
          Experience
        </label>

        <textarea
          value={documentContext.experience || ''}
          onChange={(e) =>
            setDocumentContext({
              ...documentContext,
              experience: e.target.value,
            })
          }
          rows={3}
          className="mt-2 w-full rounded-xl border border-[#cbd8ce] bg-[#fafcf9] px-4 py-3 outline-none focus:border-[#e06b45]"
        />
      </div>

      <div>
        <label className="text-sm font-bold text-[#18332f]">
          Skills
        </label>

        <textarea
          value={(documentContext.skills || []).join(', ')}
          onChange={(e) =>
            setDocumentContext({
              ...documentContext,
              skills: e.target.value
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
            })
          }
          rows={3}
          className="mt-2 w-full rounded-xl border border-[#cbd8ce] bg-[#fafcf9] px-4 py-3 outline-none focus:border-[#e06b45]"
          placeholder="Python, SQL, TensorFlow..."
        />
        <p className="mt-2 text-xs text-[#789087]">
          Separate skills with commas.
        </p>
      </div>

      <div>
        <label className="text-sm font-bold text-[#18332f]">
          Responsibilities
        </label>

        <textarea
          value={(documentContext.responsibilities || []).join(', ')}
          onChange={(e) =>
            setDocumentContext({
              ...documentContext,
              responsibilities: e.target.value
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
            })
          }
          rows={3}
          className="mt-2 w-full rounded-xl border border-[#cbd8ce] bg-[#fafcf9] px-4 py-3 outline-none focus:border-[#e06b45]"
          placeholder="Build ML models, analyze data..."
        />
      </div>

      <div>
        <label className="text-sm font-bold text-[#18332f]">
          Requirements
        </label>

        <textarea
          value={(documentContext.requirements || []).join(', ')}
          onChange={(e) =>
            setDocumentContext({
              ...documentContext,
              requirements: e.target.value
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
            })
          }
          rows={3}
          className="mt-2 w-full rounded-xl border border-[#cbd8ce] bg-[#fafcf9] px-4 py-3 outline-none focus:border-[#e06b45]"
          placeholder="Python, SQL, machine learning..."
        />
      </div>

      <div>
        <label className="text-sm font-bold text-[#18332f]">
          Education
        </label>

        <textarea
          value={(documentContext.education || []).join(', ')}
          onChange={(e) =>
            setDocumentContext({
              ...documentContext,
              education: e.target.value
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
            })
          }
          rows={3}
          className="mt-2 w-full rounded-xl border border-[#cbd8ce] bg-[#fafcf9] px-4 py-3 outline-none focus:border-[#e06b45]"
        />
      </div>

      <div>
        <label className="text-sm font-bold text-[#18332f]">
          Projects
        </label>

        <textarea
          value={(documentContext.projects || []).join(', ')}
          onChange={(e) =>
            setDocumentContext({
              ...documentContext,
              projects: e.target.value
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
            })
          }
          rows={3}
          className="mt-2 w-full rounded-xl border border-[#cbd8ce] bg-[#fafcf9] px-4 py-3 outline-none focus:border-[#e06b45]"
          placeholder="Project 1, Project 2..."
        />
      </div>

      <div>
        <label className="text-sm font-bold text-[#18332f]">
          Summary
        </label>

        <textarea
          value={documentContext.summary || ''}
          onChange={(e) =>
            setDocumentContext({
              ...documentContext,
              summary: e.target.value,
            })
          }
          rows={5}
          className="mt-2 w-full rounded-xl border border-[#cbd8ce] bg-[#fafcf9] px-4 py-3 outline-none focus:border-[#e06b45]"
          placeholder="Candidate summary..."
        />
      </div>

      <div className="flex justify-end border-t border-[#e5ece7] pt-6">
        <button
          type="button"
          onClick={startInterview}
          disabled={loading}
          className="rounded-full bg-[#e06b45] px-8 py-4 font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {loading ? 'Generating Interview...' : 'Generate My Interview →'}
        </button>
      </div>
    </div>
  </section>
)}

        {screen === 'interview' && currentQuestion && (
          <section className="relative mx-auto max-w-4xl py-12">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e06b45]">
                  Technical Interview
                </p>

                <h1 className="mt-2 text-3xl font-bold">
                  Question {currentIndex + 1} of {questions.length}
                </h1>
              </div>

              <span className="rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm">
                {currentQuestion.difficulty}
              </span>
            </div>

            <div className="mb-8 h-2 overflow-hidden rounded-full bg-[#d9e3da]">
              <div
                className="h-full rounded-full bg-[#e06b45] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="rounded-[2rem] bg-white p-8 shadow-xl sm:p-10">
              <p className="text-2xl font-bold leading-relaxed">
                {currentQuestion.question_text}
              </p>

              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="mt-8 min-h-52 w-full resize-none rounded-2xl border border-[#cbd8ce] bg-[#fafcf9] p-5 leading-7 outline-none transition focus:border-[#e06b45] focus:ring-4 focus:ring-[#e06b45]/10"
                placeholder="Type your answer here..."
              />

              <div className="mt-6 flex items-center justify-between">
                <span className="text-sm text-[#789087]">
                  Take your time. Explain your reasoning clearly.
                </span>

                <button
                  onClick={submitAnswer}
                  disabled={loading}
                  className="rounded-full bg-[#18332f] px-7 py-3 font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {loading ? 'AI is evaluating...' : 'Submit Answer →'}
                </button>
              </div>
            </div>
          </section>
        )}

        {screen === 'feedback' && evaluation && (
          <section className="relative mx-auto max-w-4xl py-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e06b45]">
              AI Evaluation
            </p>

            <h1 className="mt-3 text-5xl font-bold tracking-tight">
              Here's how you did.
            </h1>

            <div className="mt-10 grid gap-5 sm:grid-cols-4">
              {[
                ['Correctness', evaluation.correctness],
                ['Relevance', evaluation.relevance],
                ['Clarity', evaluation.clarity],
                ['Depth', evaluation.depth],
              ].map(([label, score]) => (
                <div
                  key={label}
                  className="rounded-2xl bg-white p-5 text-center shadow-lg"
                >
                  <p className="text-sm font-semibold text-[#52716a]">
                    {label}
                  </p>
                  <p className="mt-2 text-4xl font-bold text-[#18332f]">
                    {score}
                  </p>
                  <p className="text-xs text-[#789087]">/ 10</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[2rem] bg-[#18332f] p-8 text-white shadow-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c6ddba]">
                Overall score
              </p>

              <p className="mt-2 text-6xl font-bold">
                {evaluation.overall_score}
                <span className="text-2xl text-[#b5c9c1]"> / 10</span>
              </p>
            </div>

            <div className="mt-6 rounded-[2rem] bg-white p-8 shadow-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e06b45]">
                Feedback
              </p>

              <p className="mt-4 text-lg leading-8 text-[#52716a]">
                {evaluation.feedback}
              </p>
            </div>

            <button
              onClick={nextQuestion}
              disabled={loading}
              className="mt-8 rounded-full bg-[#e06b45] px-8 py-4 font-bold text-white shadow-lg disabled:opacity-60"
            >
              {loading
                ? 'Loading...'
                : currentIndex === questions.length - 1
                  ? 'View Final Report →'
                  : 'Next Question →'}
            </button>
          </section>
        )}

        {screen === 'results' && report && (
          <section className="relative mx-auto max-w-5xl py-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e06b45]">
              Interview Complete
            </p>

            <h1 className="mt-3 text-5xl font-bold tracking-tight">
              Your interview report.
            </h1>

            <div className="mt-10 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-[2rem] bg-[#18332f] p-8 text-white shadow-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c6ddba]">
                  Overall score
                </p>

                <p className="mt-4 text-7xl font-bold">
                  {report.overall_score}
                </p>

                <p className="mt-2 text-[#b5c9c1]">out of 10</p>

                <div className="mt-10 border-t border-white/10 pt-6">
                  <p className="text-sm text-[#b5c9c1]">Role</p>
                  <p className="mt-1 text-xl font-bold">{report.role}</p>
                </div>
              </div>

              <div className="rounded-[2rem] bg-white p-8 shadow-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e06b45]">
                  Performance
                </p>

                <div className="mt-6 space-y-4">
                  {report.questions.map((item, index) => (
                    <div
                      key={item.question_id}
                      className="rounded-xl border border-[#dce5de] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <p className="font-semibold">
                          Q{index + 1}. {item.question}
                        </p>

                        <span className="shrink-0 rounded-full bg-[#d7e8c7] px-3 py-1 text-sm font-bold text-[#315c3d]">
                          {item.evaluation
                            ? `${item.evaluation.overall_score}/10`
                            : 'Not answered'}
                        </span>
                      </div>

                      {item.evaluation && (
                        <p className="mt-3 text-sm leading-6 text-[#52716a]">
                          {item.evaluation.feedback}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-[2rem] bg-white p-8 shadow-xl">
                <h2 className="text-xl font-bold">Strengths</h2>

                {report.strengths.length > 0 ? (
                  <ul className="mt-5 space-y-3">
                    {report.strengths.map((strength, index) => (
                      <li key={index} className="flex gap-3 text-[#52716a]">
                        <span className="font-bold text-[#e06b45]">✓</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-[#789087]">
                    Complete more answers to identify strengths.
                  </p>
                )}
              </div>

              <div className="rounded-[2rem] bg-white p-8 shadow-xl">
                <h2 className="text-xl font-bold">Areas to improve</h2>

                {report.gaps.length > 0 ? (
                  <ul className="mt-5 space-y-3">
                    {report.gaps.map((gap, index) => (
                      <li key={index} className="flex gap-3 text-[#52716a]">
                        <span className="font-bold text-[#e06b45]">→</span>
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-[#789087]">
                    No major gaps identified in the evaluated answers.
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={resetToHome}
              className="mt-8 rounded-full bg-[#e06b45] px-8 py-4 font-bold text-white shadow-lg"
            >
              Start Another Interview →
            </button>
          </section>
        )}
      </div>
    </main>
  )
}

export default App