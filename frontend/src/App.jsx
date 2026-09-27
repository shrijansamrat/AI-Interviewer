import { useState } from 'react'

const API_BASE = 'http://127.0.0.1:8000'

function App() {
  const [screen, setScreen] = useState('home')

  const [role, setRole] = useState('Data Scientist')
  const [experience, setExperience] = useState('Fresher')
  const [interviewType, setInterviewType] = useState('Technical')

  const [interviewId, setInterviewId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [evaluation, setEvaluation] = useState(null)
  const [report, setReport] = useState(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const currentQuestion = questions[currentIndex]

  async function startInterview() {
    setLoading(true)
    setError('')

    try {
      const createResponse = await fetch(`${API_BASE}/api/interviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          experience,
          interview_type: interviewType,
        }),
      })

      if (!createResponse.ok) {
        throw new Error('Could not create interview')
      }

      const interview = await createResponse.json()

      setInterviewId(interview.id)

      const generateResponse = await fetch(
        `${API_BASE}/api/interviews/${interview.id}/generate-questions`,
        {
          method: 'POST',
        },
      )

      if (!generateResponse.ok) {
        const data = await generateResponse.json()
        throw new Error(data.detail || 'Could not generate questions')
      }

      const questionsResponse = await fetch(
        `${API_BASE}/api/interviews/${interview.id}/questions`,
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

  async function submitAnswer() {
    if (!answer.trim()) {
      setError('Please enter an answer before submitting.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(
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
      const response = await fetch(
        `${API_BASE}/api/interviews/${interviewId}/results`,
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

          <span className="rounded-full bg-[#d7e8c7] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#315c3d]">
            AI Interview Practice
          </span>
        </header>

        {error && (
          <div className="relative mx-auto mt-6 max-w-4xl rounded-2xl border border-[#e7b7a7] bg-[#fff1ec] px-5 py-4 text-sm font-medium text-[#a1452c]">
            {error}
          </div>
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
                onClick={startInterview}
                disabled={loading}
                className="w-full rounded-xl bg-[#e06b45] px-6 py-4 font-bold text-white transition hover:bg-[#c85b39] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Preparing your interview...' : 'Begin Interview →'}
              </button>
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