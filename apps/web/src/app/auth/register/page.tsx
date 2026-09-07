'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AuthLeftPanel } from '@/components/auth/auth-left-panel'
import { AuthField } from '@/components/auth/auth-field'
import { AuthSubmit } from '@/components/auth/auth-submit'
import { neonAuth, onboardingStorageKey } from '@/lib/neon-auth'

const roles = [['driver', 'EV Driver', '🚗'], ['operator', 'Station Operator', '🔌'], ['admin', 'Platform Admin', '🛡️']]

export default function RegisterPage() {
  const router = useRouter()
  const [role, setRole] = useState('driver')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => { const initial = new URLSearchParams(window.location.search).get('role'); if (initial === 'driver' || initial === 'operator' || initial === 'admin') setRole(initial) }, [])
  const strength = useMemo(() => [password.length >= 8, /\d/.test(password), /[^A-Za-z0-9]/.test(password), password.length >= 12].filter(Boolean).length, [password])

  const submit = async () => {
    setError('')
    if (!firstName.trim() || !lastName.trim()) return setError('Enter your first and last name.')
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.')
    if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) return setError('Enter a valid 10-digit phone number.')
    if (strength < 3) return setError('Password must be at least 8 characters and include a number and symbol.')
    if (password !== confirm) return setError('Passwords do not match.')
    setLoading(true)
    try {
      const result = await neonAuth.signUp.email({ email: email.trim(), password, name: `${firstName.trim()} ${lastName.trim()}` })
      if (result.error) { setError(result.error.message || 'Unable to create your account.'); setLoading(false); return }
      const userId = result.data?.user?.id
      if (userId) localStorage.removeItem(onboardingStorageKey(userId))
      router.push(`/auth/onboarding?role=${role}`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to reach Neon Auth. Check your auth URL and try again.')
      setLoading(false)
    }
  }

  const social = async (provider: 'google' | 'github') => {
    setError('')
    const result = await neonAuth.signIn.social({ provider, callbackURL: `/auth/onboarding?role=${role}` })
    if (result.error) setError(result.error.message || `Unable to continue with ${provider}.`)
  }

  return <main className="auth-shell"><AuthLeftPanel /><section className="auth-form-panel"><div className="auth-form-inner register-inner"><p className="auth-account-link auth-account-link-top">Already have an account? <Link href="/auth/login">Sign in</Link></p><div className="auth-heading"><h1>Create your account</h1><p className="auth-subtitle">Join 500+ operators and 18,000+ drivers on EVspark</p></div><div className="auth-form-fields"><div className="field-grid"><AuthField label="First name" placeholder="Rahul" value={firstName} onChange={(event) => setFirstName(event.target.value)} /><AuthField label="Last name" placeholder="Sharma" value={lastName} onChange={(event) => setLastName(event.target.value)} /></div><AuthField label="Email address" type="email" placeholder="rahul@example.com" value={email} onChange={(event) => setEmail(event.target.value)} /><label className="auth-field"><span>Phone number</span><div className="phone-input"><b>+91</b><input type="tel" placeholder="98765 43210" value={phone} onChange={(event) => setPhone(event.target.value)} /></div></label><PasswordField label="Password" show={show} setShow={setShow} placeholder="Create a password" value={password} onChange={setPassword} /><div className="strength"><div>{[0, 1, 2, 3].map((level) => <i key={level} className={strength > level ? 'active' : ''} />)}</div><span>{strength === 4 ? 'Strong password' : 'Use 8+ characters with numbers and symbols'}</span></div><PasswordField label="Confirm password" show={showConfirm} setShow={setShowConfirm} placeholder="Repeat your password" value={confirm} onChange={setConfirm} /><div className="role-select"><span>I am a...</span><div>{roles.map(([value, label, icon]) => <button type="button" key={value} className={role === value ? 'selected' : ''} onClick={() => setRole(value)}><span>{icon}</span>{label}</button>)}</div></div>{error && <p className="auth-error" role="alert">{error}</p>}<AuthSubmit disabled={loading} onClick={submit}>{loading ? 'Creating account...' : <>Create Account <span>→</span></>}</AuthSubmit></div><div className="auth-divider"><span>or continue with</span></div><div className="social-row"><button type="button" onClick={() => social('google')}><span className="google-mark">G</span>Google</button><button type="button" onClick={() => social('github')}><span className="github-mark">GH</span>GitHub</button></div></div></section></main>
}

function PasswordField({ label, show, setShow, placeholder, value, onChange }: { label: string; show: boolean; setShow: (value: boolean) => void; placeholder: string; value: string; onChange: (value: string) => void }) { return <label className="auth-field"><span>{label}</span><div className="password-wrap"><input type={show ? 'text' : 'password'} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} /><button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label> }
