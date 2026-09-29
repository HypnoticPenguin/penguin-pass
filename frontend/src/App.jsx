import { useState, useEffect } from 'react'
import { themes } from './themes.js'
import pkg from '../package.json'

export default function App() {
  const [mode, setMode] = useState('chars') // 'chars' or 'passphrase'
  const [themeKey, setThemeKey] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('penguin_pass_theme')
      if (savedTheme) return savedTheme
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark'
      }
    }
    return 'light'
  })

  // Character options
  const [length, setLength] = useState(16)
  const [useSymbols, setUseSymbols] = useState(true)
  const [useNumbers, setUseNumbers] = useState(true)
  const [useUppercase, setUseUppercase] = useState(true)
  const [includeAmbiguous, setIncludeAmbiguous] = useState(true) // Enabled by default[cite: 1]

  // Passphrase options
  const [wordCount, setWordCount] = useState(4)
  const [delimiter, setDelimiter] = useState('-')
  const [includeNumber, setIncludeNumber] = useState(false)
  const [caseStyle, setCaseStyle] = useState('lower') // 'lower', 'title', 'upper', 'random'
  const [minWordLength, setMinWordLength] = useState(3)
  const [maxWordLength, setMaxWordLength] = useState(8)

  // Output list state & copy status map
  const [passwords, setPasswords] = useState([])
  const [copiedIndex, setCopiedIndex] = useState(null)

  // Modal state for viewing password with character numbers
  const [modalPassword, setModalPassword] = useState(null)

  const currentTheme = themes[themeKey] || themes.light

  useEffect(() => {
    document.body.style.backgroundColor = currentTheme.bg
    document.body.style.color = currentTheme.text
    document.body.style.margin = '0'
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease'
    localStorage.setItem('penguin_pass_theme', themeKey)
  }, [themeKey, currentTheme])

  const generatePasswords = async () => {
    try {
      if (mode === 'chars') {
        const res = await fetch(`/api/generate/chars?length=${length}&symbols=${useSymbols}&numbers=${useNumbers}&uppercase=${useUppercase}&include_ambiguous=${includeAmbiguous}&count=5`)
        const data = await res.json()
        setPasswords(data.passwords)
      } else {
        // Map caseStyle selection to backend query parameters
        const randomCaseParam = caseStyle === 'random' ? 'true' : 'false'
        const res = await fetch(`/api/generate/passphrase?word_count=${wordCount}&delimiter=${encodeURIComponent(delimiter)}&include_number=${includeNumber}&random_case=${randomCaseParam}&min_word_length=${minWordLength}&max_word_length=${maxWordLength}&count=5`)
        const data = await res.json()
        
        let results = data.passphrases
        // Apply frontend post-formatting for Title Case or ALL CAPS if needed
        if (caseStyle === 'title') {
          results = results.map(phrase => 
            phrase.split(delimiter).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(delimiter)
          )
        } else if (caseStyle === 'upper') {
          results = results.map(phrase => phrase.toUpperCase())
        }
        
        setPasswords(results)
      }
    } catch (err) {
      console.error('Generation failed', err)
    }
  }

  useEffect(() => {
    generatePasswords()
  }, [mode, length, useSymbols, useNumbers, useUppercase, includeAmbiguous, wordCount, delimiter, includeNumber, caseStyle, minWordLength, maxWordLength])

  const handleCopySingle = (text, index) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleExportAll = () => {
    if (!passwords || passwords.length === 0) return
    const textContent = passwords.join('\n')
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `penguin-pass-${mode}-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const toggleTheme = () => {
    setThemeKey((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  // Calculate approximate entropy and strength details for the modal
  const getPasswordAnalysis = (pwd) => {
    if (!pwd) return { entropy: 0, label: 'Unknown', color: '#ccc', percentage: 0 }
    
    let poolSize = 0
    const hasLower = /[a-z]/.test(pwd)
    const hasUpper = /[A-Z]/.test(pwd)
    const hasNum = /[0-9]/.test(pwd)
    const hasSymbol = /[^a-zA-Z0-9]/.test(pwd)
    if (hasLower) poolSize += 26
    if (hasUpper) poolSize += 26
    if (hasNum) poolSize += 10
    if (hasSymbol) poolSize += 32

    if (poolSize === 0) poolSize = 26
    const entropy = Math.round(pwd.length * Math.log2(poolSize))
    let label = 'Very Strong'
    let color = '#4CAF50'
    let percentage = 100
    if (entropy < 35) {
      label = 'Weak'
      color = '#f44336'
      percentage = 25
    } else if (entropy < 60) {
      label = 'Fair'
      color = '#ff9800'
      percentage = 50
    } else if (entropy < 85) {
      label = 'Good'
      color = '#2196F3'
      percentage = 75
    } else if (entropy < 120) {
      label = 'Strong'
      color = '#8bc34a'
      percentage = 90
    }
    return { entropy, label, color, percentage }
  }

  const inputStyle = {
    padding: '0.5rem',
    background: currentTheme.cardBg,
    color: currentTheme.text,
    border: `1px solid ${currentTheme.border}`,
    borderRadius: '4px',
    boxSizing: 'border-box'
  }

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div style={{ padding: '1rem 1rem 2rem 1rem', maxWidth: '650px', margin: '0 auto', width: '100%', flex: 1, boxSizing: 'border-box' }} className="desktop-container">
        
        <style>{`
          .header-container {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
            margin-bottom: 2rem;
          }
          .custom-scrollbar::-webkit-scrollbar {
            height: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
            margin: 2px 0;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: ${currentTheme.border};
            border-radius: 1.5px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: ${currentTheme.subText};
          }
          @media (min-width: 480px) {
            .header-container {
              flex-direction: row;
              justify-content: space-between;
              align-items: center;
              gap: 0.5rem;
            }
            .desktop-container {
              padding-top: 2.5rem !important;
              padding-left: 1.5rem !important;
              padding-right: 1.5rem !important;
            }
          }
        `}</style>

        {/* Header */}
        <div className="header-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
            <img
              src="/penguin-logo.svg"
              alt="Penguin Pass Logo"
              style={{ width: '36px', height: '36px', objectFit: 'contain', flexShrink: 0 }}
            />
            <h1 style={{ margin: 0, fontSize: 'clamp(1.2rem, 5vw, 1.5rem)', whiteSpace: 'nowrap' }}>Penguin Pass</h1>
          </div>
          <button
            onClick={toggleTheme}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: currentTheme.primary, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {themeKey === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>
        </div>

        {/* Output List Box */}
        <div style={{ background: currentTheme.cardBg, borderRadius: '8px', border: `1px solid ${currentTheme.border}`, marginBottom: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${currentTheme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: currentTheme.bg }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: currentTheme.subText }}>
              {mode === 'chars' ? 'Generated Passwords (Click row to inspect)' : 'Generated Passphrases (Click row to inspect)'}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleExportAll}
                style={{ padding: '0.3rem 0.6rem', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                title="Download all passwords as a text file"
              >
                Export All
              </button>
              <button
                onClick={generatePasswords}
                style={{ padding: '0.3rem 0.6rem', background: currentTheme.primary, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
              >
                Refresh All
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {passwords.map((pwd, idx) => {
              const rowBg = idx % 2 === 0 ? currentTheme.cardBg : currentTheme.bg
              const isCopied = copiedIndex === idx
              return (
                <div
                  key={idx}
                  onClick={() => setModalPassword(pwd)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    background: rowBg,
                    borderBottom: idx < passwords.length - 1 ? `1px solid ${currentTheme.border}` : 'none',
                    cursor: 'pointer'
                  }}
                  title="Click to view with character positions"
                >
                  <div style={{ overflowX: 'auto', marginRight: '1rem', flex: 1, paddingTop: '6px', paddingBottom: '6px' }} className="custom-scrollbar">
                    <span style={{ fontFamily: 'monospace', fontSize: '1rem', whiteSpace: 'nowrap', display: 'inline-block' }}>
                      {pwd}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopySingle(pwd, idx)
                    }}
                    title="Copy to clipboard"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem',
                      padding: '0.35rem 0.65rem',
                      minWidth: '75px',
                      background: isCopied ? '#4CAF50' : currentTheme.bg,
                      color: isCopied ? '#fff' : currentTheme.text,
                      border: `1px solid ${isCopied ? '#4CAF50' : currentTheme.border}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      flexShrink: 0,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>{isCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div style={{ display: 'flex', marginBottom: '1.5rem', borderBottom: `1px solid ${currentTheme.border}` }}>
          <button
            onClick={() => setMode('chars')}
            style={{ flex: 1, padding: '0.75rem', background: mode === 'chars' ? currentTheme.cardBg : 'transparent', color: mode === 'chars' ? currentTheme.primary : currentTheme.subText, border: 'none', borderBottom: mode === 'chars' ? `2px solid ${currentTheme.primary}` : 'none', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Character Password
          </button>
          <button
            onClick={() => setMode('passphrase')}
            style={{ flex: 1, padding: '0.75rem', background: mode === 'passphrase' ? currentTheme.cardBg : 'transparent', color: mode === 'passphrase' ? currentTheme.primary : currentTheme.subText, border: 'none', borderBottom: mode === 'passphrase' ? `2px solid ${currentTheme.primary}` : 'none', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Word Passphrase
          </button>
        </div>

        {/* Controls Card */}
        <div style={{ background: currentTheme.cardBg, padding: '1.5rem', borderRadius: '8px', border: `1px solid ${currentTheme.border}`, display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
          {mode === 'chars' ? (
            <>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  <span>Password Length:</span>
                  <strong>{length}</strong>
                </div>
                <input
                  type="range"
                  min="6"
                  max="64"
                  value={length}
                  onChange={(e) => setLength(parseInt(e.target.value, 10))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={useSymbols} onChange={(e) => setUseSymbols(e.target.checked)} />
                  <span>
                    Include Symbols (
                    <span title="!@#$%^&*()_+-=[]{}|;:,.<>?" style={{ textDecoration: 'underline dotted', cursor: 'help' }}>
                      !@#$...
                    </span>
                    )
                  </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={useNumbers} onChange={(e) => setUseNumbers(e.target.checked)} />
                  Include Numbers (0-9)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={useUppercase} onChange={(e) => setUseUppercase(e.target.checked)} />
                  Include Uppercase Letters (A-Z)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={includeAmbiguous} onChange={(e) => setIncludeAmbiguous(e.target.checked)} />
                  Include Ambiguous Characters (i, I, l, L, 1, o, O, 0)
                </label>
              </div>
            </>
          ) : (
            <>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  <span>Word Count:</span>
                  <strong>{wordCount} words</strong>
                </div>
                <input
                  type="range"
                  min="3"
                  max="8"
                  value={wordCount}
                  onChange={(e) => setWordCount(parseInt(e.target.value, 10))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  <span>Min Word Length:</span>
                  <strong>{minWordLength} chars</strong>
                </div>
                <input
                  type="range"
                  min="2"
                  max="10"
                  value={minWordLength}
                  onChange={(e) => setMinWordLength(parseInt(e.target.value, 10))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  <span>Max Word Length:</span>
                  <strong>{maxWordLength} chars</strong>
                </div>
                <input
                  type="range"
                  min="4"
                  max="15"
                  value={maxWordLength}
                  onChange={(e) => setMaxWordLength(parseInt(e.target.value, 10))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem' }}>Delimiter</label>
                  <input
                    type="text"
                    value={delimiter}
                    onChange={(e) => setDelimiter(e.target.value)}
                    maxLength={5}
                    style={{ ...inputStyle, width: '80px' }}
                  />
                </div>
              </div>
              {/* Case Style Selector (Modern Segmented Control) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem' }}>Case Style</label>
                <div style={{ display: 'flex', background: currentTheme.bg, padding: '3px', borderRadius: '6px', border: `1px solid ${currentTheme.border}` }}>
                  {[
                    { id: 'lower', label: 'lower' },
                    { id: 'title', label: 'Title Case' },
                    { id: 'upper', label: 'UPPER' },
                    { id: 'random', label: 'Random' }
                  ].map((style) => {
                    const isActive = caseStyle === style.id
                    return (
                      <button
                        key={style.id}
                        onClick={() => setCaseStyle(style.id)}
                        style={{
                          flex: 1,
                          padding: '0.4rem 0.2rem',
                          background: isActive ? currentTheme.cardBg : 'transparent',
                          color: isActive ? currentTheme.primary : currentTheme.subText,
                          border: isActive ? `1px solid ${currentTheme.border}` : '1px solid transparent',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: isActive ? 'bold' : 'normal',
                          cursor: 'pointer',
                          boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {style.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={includeNumber} onChange={(e) => setIncludeNumber(e.target.checked)} />
                  Include Random Numbers in Words
                </label>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Password Inspection Modal with Character Numbering & Entropy Analysis */}
      {modalPassword && (() => {
        const analysis = getPasswordAnalysis(modalPassword)
        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 }}>
            <div style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: '8px', padding: '2rem', maxWidth: '700px', width: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Password Inspection ({modalPassword.length} characters)</h3>
                <button onClick={() => setModalPassword(null)} style={{ background: 'transparent', border: 'none', color: currentTheme.text, fontSize: '1.2rem', cursor: 'pointer', fontWeight: 'bold' }}>&times;</button>
              </div>
              
              <div
                onClick={() => {
                  navigator.clipboard.writeText(modalPassword)
                  setCopiedIndex('modal')
                  setTimeout(() => setCopiedIndex(null), 2000)
                }}
                title="Click to copy password"
                style={{ background: currentTheme.bg, padding: '1.25rem', borderRadius: '6px', border: `1px solid ${currentTheme.border}`, fontFamily: 'monospace', fontSize: '1.6rem', wordBreak: 'break-all', textAlign: 'center', marginBottom: '1.5rem', cursor: 'pointer' }}
              >
                {modalPassword}
              </div>

              {/* Security Analysis & Entropy Indicator Section */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: currentTheme.bg, borderRadius: '6px', border: `1px solid ${currentTheme.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: currentTheme.subText }}>Security Analysis</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: analysis.color }}>
                    {analysis.label} ({analysis.entropy} bits entropy)
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: currentTheme.border, borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${analysis.percentage}%`, height: '100%', background: analysis.color, transition: 'width 0.3s ease' }}></div>
                </div>
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: currentTheme.subText, display: 'block', marginBottom: '0.5rem' }}>Character Position Index:</span>
                <div style={{ display: 'flex', overflowX: 'auto', gap: '6px', paddingBottom: '8px' }} className="custom-scrollbar">
                  {modalPassword.split('').map((char, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '32px', background: currentTheme.bg, border: `1px solid ${currentTheme.border}`, borderRadius: '4px', padding: '6px 0' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '1.38rem', fontWeight: 'bold', color: /[0-9]/.test(char) ? '#f44336' : currentTheme.text }}>{char}</span>
                      <span style={{ fontSize: '0.65rem', color: currentTheme.subText, marginTop: '4px' }}>{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(modalPassword)
                    setCopiedIndex('modal')
                    setTimeout(() => setCopiedIndex(null), 2000)
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    background: copiedIndex === 'modal' ? '#4CAF50' : currentTheme.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'background 0.2s ease'
                  }}
                >
                  {copiedIndex === 'modal' ? 'Copied' : 'Copy Password'}
                </button>
                <button
                  onClick={() => setModalPassword(null)}
                  style={{ padding: '0.5rem 1rem', background: currentTheme.bg, color: currentTheme.text, border: `1px solid ${currentTheme.border}`, borderRadius: '4px', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      <footer style={{ textAlign: 'center', padding: '1rem', borderTop: `1px solid ${currentTheme.border}`, color: currentTheme.subText, fontSize: '0.85rem', background: currentTheme.cardBg, fontFamily: 'sans-serif' }}>
        <a 
          href="https://github.com/HypnoticPenguin/penguin-pass"
          target="_blank" 
          rel="noopener noreferrer"
          style={{ color: currentTheme.primary, textDecoration: 'none', fontFamily: 'sans-serif' }}
        >
          Penguin Pass v{pkg.version}
        </a> &copy; {new Date().getFullYear()}
      </footer>
    </div>
  )
}