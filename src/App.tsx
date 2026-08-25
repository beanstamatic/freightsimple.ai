import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircle2, CircleUserRound, Copy, LogOut, MapPin, PackagePlus, Search, Truck } from 'lucide-react'
import { getSupabaseClient, isSupabaseConfigured } from './lib/supabase/client'
import './App.css'

type Shipment = {
  freight_id: string
  status: string
  origin: string
  destination: string
  estimated_delivery: string | null
  updated_at: string
}

const freightIdPattern = /^FR-[A-Z0-9]{8}$/

function makeFreightId() {
  return `FR-${crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value)) : 'Not set'
}

function TrackingLookup() {
  const [freightId, setFreightId] = useState('')
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function lookup(event: FormEvent) {
    event.preventDefault()
    const id = freightId.trim().toUpperCase()
    if (!freightIdPattern.test(id)) {
      setShipment(null)
      setMessage('Enter a Freight ID in the format FR-XXXXXXXX.')
      return
    }
    const supabase = getSupabaseClient()
    if (!supabase) {
      setMessage('Tracking is not configured yet.')
      return
    }
    setLoading(true)
    setMessage('')
    const { data, error } = await supabase.rpc('get_public_tracking', { requested_freight_id: id })
    setLoading(false)
    if (error || !data?.length) {
      setShipment(null)
      setMessage('No shipment was found for that Freight ID.')
      return
    }
    setShipment(data[0] as Shipment)
  }

  return (
    <section className="tracking-card" id="track">
      <div><span className="eyebrow">Shipment tracking</span><h2>Track a freight shipment</h2><p>Enter the Freight ID supplied by your dispatcher.</p></div>
      <form className="tracking-form" onSubmit={lookup}>
        <label htmlFor="freight-id">Freight ID</label>
        <div><input id="freight-id" value={freightId} onChange={(event) => setFreightId(event.target.value)} placeholder="FR-1A2B3C4D" autoCapitalize="characters" /><button type="submit" disabled={loading}>{loading ? 'Searching…' : 'Track shipment'} <Search size={16} /></button></div>
      </form>
      {message && <p className="form-message" role="status">{message}</p>}
      {shipment && <article className="shipment-result"><div className="shipment-status"><CheckCircle2 size={24} /><div><strong>{shipment.status}</strong><span>{shipment.freight_id}</span></div></div><div className="route"><span><MapPin size={17} /> {shipment.origin}</span><span className="route-line" /><span><Truck size={17} /> {shipment.destination}</span></div><p>Estimated delivery: <strong>{formatDate(shipment.estimated_delivery)}</strong> · Updated {formatDate(shipment.updated_at)}</p></article>}
    </section>
  )
}

function OperatorPortal() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)
  const [notice, setNotice] = useState('')
  const [freightId, setFreightId] = useState(makeFreightId)
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [status, setStatus] = useState('Booked')
  const [delivery, setDelivery] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = getSupabaseClient()
    if (!supabase) { setLoading(false); return }
    supabase.auth.getUser().then(({ data }) => { setEmail(data.user?.email ?? ''); setLoading(false) })
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => setEmail(session?.user.email ?? ''))
    return () => subscription.subscription.unsubscribe()
  }, [])

  async function signIn() {
    const supabase = getSupabaseClient()
    if (!supabase) { setNotice('Add the Supabase environment variables before enabling sign-in.'); return }
    setSigningIn(true)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    if (error) { setNotice(error.message); setSigningIn(false) }
  }

  async function signOut() {
    await getSupabaseClient()?.auth.signOut()
    setNotice('Signed out.')
  }

  async function createShipment(event: FormEvent) {
    event.preventDefault()
    const supabase = getSupabaseClient()
    if (!supabase) return
    setSaving(true)
    setNotice('')
    const { error } = await supabase.from('shipments').insert({ freight_id: freightId, origin, destination, status, estimated_delivery: delivery || null })
    setSaving(false)
    if (error) { setNotice(error.message); return }
    setNotice(`Freight ID ${freightId} is ready to share.`)
    setFreightId(makeFreightId())
    setOrigin(''); setDestination(''); setDelivery(''); setStatus('Booked')
  }

  if (!isSupabaseConfigured()) return <section className="setup-card"><h2>Tracking setup required</h2><p>Add the Supabase URL and publishable key to this project before operators can sign in or create Freight IDs.</p></section>
  if (loading) return <p className="loading">Loading secure operator portal…</p>
  if (!email) return <section className="signin-card"><CircleUserRound size={36} /><h2>Create and manage Freight IDs</h2><p>Dispatchers sign in with Google to create shipments. Customers can track any shared Freight ID without an account.</p><button className="google-button" onClick={signIn} disabled={signingIn}>{signingIn ? 'Redirecting…' : 'Continue with Google'}</button>{notice && <p className="form-message">{notice}</p>}</section>

  return <section className="operator-card" id="operator"><div className="operator-heading"><div><span className="eyebrow">Operator portal</span><h2>Create a Freight ID</h2><p>Signed in as {email}</p></div><button className="secondary-button" onClick={signOut}><LogOut size={16} /> Sign out</button></div><form className="shipment-form" onSubmit={createShipment}><label>Freight ID<div className="id-field"><input value={freightId} onChange={(event) => setFreightId(event.target.value.toUpperCase())} required pattern="FR-[A-Z0-9]{8}" /><button type="button" aria-label="Copy Freight ID" onClick={() => navigator.clipboard.writeText(freightId)}><Copy size={16} /></button></div></label><label>Origin<input value={origin} onChange={(event) => setOrigin(event.target.value)} placeholder="Dallas, TX" required /></label><label>Destination<input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Atlanta, GA" required /></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option>Booked</option><option>Picked up</option><option>In transit</option><option>Delivered</option></select></label><label>Estimated delivery<input type="date" value={delivery} onChange={(event) => setDelivery(event.target.value)} /></label><button className="create-button" type="submit" disabled={saving}><PackagePlus size={17} /> {saving ? 'Creating…' : 'Create Freight ID'}</button></form>{notice && <p className="form-message" role="status">{notice}</p>}</section>
}

export default function App() {
  return <main className="freight-site"><header className="site-header"><a href="/" className="wordmark"><span>FS</span> FreightSimple</a><nav><a href="#track">Track shipment</a><a href="#operator">Operator sign in</a></nav></header><section className="hero"><span className="eyebrow">Freight visibility, made simple</span><h1>One Freight ID.<br />Clear shipment status.</h1><p>Create a shipment with Google sign-in, then give customers a simple Freight ID they can use to track delivery.</p><a className="hero-link" href="#track">Track a shipment <Search size={16} /></a></section><TrackingLookup /><OperatorPortal /><footer>FreightSimple · Reliable tracking for every shipment</footer></main>
}
