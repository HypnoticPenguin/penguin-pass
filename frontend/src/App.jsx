import { useState, useEffect } from 'react'
import { themes } from './themes.js'
import pkg from '../package.json'

export default function App() {
  const [mode, setMode] = useState('chars') // 'chars' or 'passphrase'
  
  // Check localStorage first, otherwise fallback to system preference
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

  // Passphrase options
  const [wordCount, setWordCount] = useState(4)
  const [delimiter, setDelimiter] = useState('-')
  const [includeNumber, setIncludeNumber] = useState(true)
  const [maxWordLength, setMaxWordLength] = useState(8)

  // Output list state & copy status map (index -> status text)
  const [passwords, setPasswords] = useState([])
  const [copiedIndex, setCopiedIndex] = useState(null)

  const currentTheme = themes[themeKey] || themes.light

  useEffect(() => {
    document.body.style.backgroundColor = currentTheme.bg
    document.body.style.color = currentTheme.text
    document.body.style.margin = '0'
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease'
    
    // Save theme preference when changed manually
    localStorage.setItem('penguin_pass_theme', themeKey)
  }, [themeKey, currentTheme])

  const generatePasswords = async () => {
    try {
      if (mode === 'chars') {
        const res = await fetch(`/api/generate/chars?length=${length}&symbols=${useSymbols}&numbers=${useNumbers}&uppercase=${useUppercase}&count=5`)
        const data = await res.json()
        setPasswords(data.passwords)
      } else {
        const res = await fetch(`/api/generate/passphrase?word_count=${wordCount}&delimiter=${encodeURIComponent(delimiter)}&include_number=${includeNumber}&max_word_length=${maxWordLength}&count=5`)
        const data = await res.json()
        setPasswords(data.passphrases)
      }
    } catch (err) {
      console.error('Generation failed', err)
    }
  }

  useEffect(() => {
    generatePasswords()
  }, [mode, length, useSymbols, useNumbers, useUppercase, wordCount, delimiter, includeNumber, maxWordLength])

  const handleCopySingle = (text, index) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const toggleTheme = () => {
    setThemeKey((prev) => (prev === 'light' ? 'dark' : 'light'))
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
          @media (min-width: 640px) {
            .desktop-container {
              padding-top: 2.5rem !important;
              padding-left: 1.5rem !important;
              padding-right: 1.5rem !important;
            }
          }
        `}</style>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '0.5rem' }}>
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
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: currentTheme.primary, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {themeKey === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>
        </div>

        {/* Output List Box */}
        <div style={{ background: currentTheme.cardBg, borderRadius: '8px', border: `1px solid ${currentTheme.border}`, marginBottom: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${currentTheme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: currentTheme.bg }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: currentTheme.subText }}>
              {mode === 'chars' ? 'Generated Passwords' : 'Generated Passphrases'}
            </span>
            <button
              onClick={generatePasswords}
              style={{ padding: '0.3rem 0.6rem', background: currentTheme.primary, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
            >
                Refresh All
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {passwords.map((pwd, idx) => {
              const rowBg = idx % 2 === 0 ? currentTheme.cardBg : currentTheme.bg
              const isCopied = copiedIndex === idx
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    background: rowBg,
                    borderBottom: idx < passwords.length - 1 ? `1px solid ${currentTheme.border}` : 'none'
                  }}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: '1rem', wordBreak: 'break-all', marginRight: '1rem', flex: 1 }}>
                    {pwd}
                  </span>
                  <button
                    onClick={() => handleCopySingle(pwd, idx)}
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
                  Include Symbols (!@#$...)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={useNumbers} onChange={(e) => setUseNumbers(e.target.checked)} />
                  Include Numbers (0-9)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={useUppercase} onChange={(e) => setUseUppercase(e.target.checked)} />
                  Include Uppercase Letters (A-Z)
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
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem' }}>Custom Delimiter</label>
                <input
                  type="text"
                  value={delimiter}
                  onChange={(e) => setDelimiter(e.target.value)}
                  maxLength={5}
                  style={{ ...inputStyle, width: '80px' }}
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={includeNumber} onChange={(e) => setIncludeNumber(e.target.checked)} />
                  Include Random Numbers in Words
                </label>
              </div>
            </>
          )}

        </div>
      </div>

      <footer style={{ textAlign: 'center', padding: '1rem', borderTop: `1px solid ${currentTheme.border}`, color: currentTheme.subText, fontSize: '0.85rem', background: currentTheme.cardBg }}>
        Penguin Pass v{pkg.version} &copy; {new Date().getFullYear()}
      </footer>
    </div>
  )
}