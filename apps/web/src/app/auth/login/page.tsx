'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { AuthLeftPanel } from '@/components/auth/auth-left-panel'
import { AuthField } from '@/components/auth/auth-field'
import { AuthSubmit } from '@/components/auth/auth-submit'
import { neonAuth, onboardingStorageKey } from '@/lib/neon-auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async () => { setError(''); if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.'); if (!password) return setError('Enter your password.'); setLoading(true); try { const result = await neonAuth.signIn.email({ email: email.trim(), password }); if (result.error) { setError(result.error.message || 'Unable to sign in with those details.'); setLoading(false); return } const session = await neonAuth.getSession(); const userId = session.data?.user?.id; if (userId && !localStorage.getItem(onboardingStorageKey(userId))) router.push('/auth/onboarding'); else router.push('/dashboard/driver') } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to reach Neon Auth. Check your auth URL and try again.'); setLoading(false) } }
  const social = async (provider: 'google' | 'github') => { setError(''); const result = await neonAuth.signIn.social({ provider, callbackURL: '/auth/onboarding' }); if (result.error) setError(result.error.message || `Unable to continue with ${provider}.`) }
  return <main className="auth-shell"><AuthLeftPanel /><section className="auth-form-panel"><div className="auth-form-inner"><div className="auth-heading"><h1>Welcome back</h1><p className="auth-subtitle">Sign in to your EVspark account</p></div><div className="auth-form-fields"><AuthField label="Email address" type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /><label className="auth-field"><span className="label-row"><b>Password</b><Link href="/auth/forgot-password">Forgot password?</Link></span><div className="password-wrap"><input type={show ? 'text' : 'password'} placeholder="Enter your password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>{error && <p className="auth-error" role="alert">{error}</p>}<AuthSubmit disabled={loading} onClick={submit}>{loading ? 'Signing in...' : <>Sign In <span>→</span></>}</AuthSubmit></div><div className="auth-divider"><span>or continue with</span></div><div className="social-row"><button type="button" onClick={() => social('google')}><span className="google-mark">G</span>Google</button><button type="button" onClick={() => social('github')}><span className="github-mark">GH</span>GitHub</button></div><p className="auth-terms">By signing in, you agree to our <Link href="#terms">Terms of Service</Link> and <Link href="#privacy">Privacy Policy</Link></p><p className="auth-account-link">Don&apos;t have an account? <Link href="/auth/register">Sign up free</Link></p></div></section></main>
}
