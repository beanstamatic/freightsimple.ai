import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Cloud,
  FilePlus2,
  Gauge,
  Inbox,
  Link2,
  Mail,
  MapPinned,
  MessageSquareReply,
  PackageCheck,
  PlugZap,
  Radio,
  Route,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Truck,
  UserRoundCheck,
  UsersRound,
  WalletCards,
  ReceiptText,
} from 'lucide-react'
import './App.css'

type Status = 'connected' | 'mocked' | 'degraded' | 'disconnected'
type LoadSource = 'DAT' | 'Truckstop' | 'Email' | 'Manual'
type LoadStage = 'Needs appointment' | 'Booked' | 'In transit' | 'Delivered' | 'Invoice pending'
type Risk = 'low' | 'medium' | 'high'

type CarrierOrg = {
  id: string
  name: string
  dot: string
  mc: string
  lanes: string[]
}

type Driver = {
  id: string
  name: string
  phone: string
  eldProvider: string
  hoursAvailable: number
}

type TruckAsset = {
  id: string
  unit: string
  driverId: string
  status: 'available' | 'dispatched' | 'shop'
  location: string
  equipment: string
}

type ConnectedAccount = {
  id: string
  provider: string
  category: 'Load board' | 'Email' | 'Calendar' | 'Tracking' | 'ELD'
  status: Status
  sync: string
  notes: string
}

type Load = {
  id: string
  source: LoadSource
  customer: string
  broker: string
  pickup: string
  delivery: string
  pickupWindow: string
  deliveryWindow: string
  rate: number
  miles: number
  equipment: string
  stage: LoadStage
  risk: Risk
  truckId?: string
  driverId?: string
  contacts: string[]
  appointmentStatus: string
  trackingStatus: string
  podStatus: string
  invoiceStatus: string
  emailThreadId: string
  marginCost: number
}

type EmailThread = {
  id: string
  from: string
  subject: string
  preview: string
  age: string
  suggestedReply: string
  loadId?: string
}

type GpsPing = {
  time: string
  location: string
  speed: number
  source: string
}

type RmiEvent = {
  loadId: string
  event: string
  impact: number
}

type CustomerAccount = {
  id: string
  name: string
  owner: string
  lastTouch: string
  pipeline: string
  openLoads: number
  health: 'strong' | 'watch' | 'new'
}

type ManualTaskStatus = 'Open' | 'Complete'
type ManualInvoiceStatus = 'Draft' | 'Sent' | 'Paid'

type ManualLoad = {
  id: string
  loadNumber: string
  company: string
  pickupCity: string
  deliveryCity: string
  pickupDate: string
  deliveryDate: string
  rate: number
  estimatedCost: number
  createdAt: string
}

type ManualTask = {
  id: string
  loadId: string
  loadNumber: string
  title: string
  dueDate: string
  status: ManualTaskStatus
}

type ManualInvoice = {
  id: string
  loadId: string
  loadNumber: string
  company: string
  amount: number
  status: ManualInvoiceStatus
  createdAt: string
}

type ManualWorkflowState = {
  loads: ManualLoad[]
  tasks: ManualTask[]
  invoices: ManualInvoice[]
}

type ManualLoadForm = {
  loadNumber: string
  company: string
  pickupCity: string
  deliveryCity: string
  pickupDate: string
  deliveryDate: string
  rate: string
  estimatedCost: string
}

const org: CarrierOrg = {
  id: 'org_okgo_carrier_v1',
  name: 'OK GO Freight — Carrier V1',
  dot: 'DOT 3849217',
  mc: 'MC 1459082',
  lanes: ['SLC <> Phoenix', 'Denver <> Dallas', 'Boise <> Seattle'],
}

const drivers: Driver[] = [
  { id: 'drv-1', name: 'Maya Torres', phone: '(385) 555-0184', eldProvider: 'Samsara', hoursAvailable: 7.5 },
  { id: 'drv-2', name: 'Cameron Lee', phone: '(720) 555-0128', eldProvider: 'Motive', hoursAvailable: 4.25 },
  { id: 'drv-3', name: 'Andre Price', phone: '(801) 555-0193', eldProvider: 'Geotab', hoursAvailable: 9.75 },
  { id: 'drv-4', name: 'Nia Patel', phone: '(208) 555-0107', eldProvider: 'Manual', hoursAvailable: 10.5 },
]

const trucks: TruckAsset[] = [
  { id: 'trk-21', unit: 'OKG-211', driverId: 'drv-1', status: 'dispatched', location: 'Green River, UT', equipment: '53 Van' },
  { id: 'trk-44', unit: 'OKG-244', driverId: 'drv-2', status: 'dispatched', location: 'Pueblo, CO', equipment: 'Reefer' },
  { id: 'trk-72', unit: 'OKG-272', driverId: 'drv-3', status: 'available', location: 'Salt Lake City, UT', equipment: '53 Van' },
  { id: 'trk-83', unit: 'OKG-283', driverId: 'drv-4', status: 'available', location: 'Boise, ID', equipment: 'Flatbed' },
]

const connectedAccounts: ConnectedAccount[] = [
  { id: 'dat', provider: 'DAT', category: 'Load board', status: 'mocked', sync: 'Adapter shell', notes: 'Search and offer ingest placeholder' },
  { id: 'truckstop', provider: 'Truckstop / Internet Truckstop', category: 'Load board', status: 'mocked', sync: 'Adapter shell', notes: 'Post-truck and load search placeholder' },
  { id: 'gmail', provider: 'Gmail', category: 'Email', status: 'connected', sync: '3 min ago', notes: 'Mock OAuth account with inbound thread parser' },
  { id: 'outlook', provider: 'Outlook', category: 'Email', status: 'mocked', sync: 'Adapter shell', notes: 'Microsoft Graph placeholder' },
  { id: 'gcal', provider: 'Google Calendar', category: 'Calendar', status: 'connected', sync: '12 min ago', notes: 'Appointment writeback mock enabled' },
  { id: 'macropoint', provider: 'MacroPoint', category: 'Tracking', status: 'degraded', sync: '28 min ago', notes: 'Tracking invite status placeholder' },
  { id: 'fourkites', provider: 'FourKites', category: 'Tracking', status: 'mocked', sync: 'Adapter shell', notes: 'Visibility API placeholder' },
  { id: 'samsara', provider: 'Samsara', category: 'ELD', status: 'connected', sync: 'Live mock', notes: 'Vehicle and HOS adapter shell' },
  { id: 'motive', provider: 'Motive', category: 'ELD', status: 'mocked', sync: 'Adapter shell', notes: 'Vehicle location placeholder' },
  { id: 'geotab', provider: 'Geotab', category: 'ELD', status: 'mocked', sync: 'Adapter shell', notes: 'Device feed placeholder' },
  { id: 'manual-eld', provider: 'Manual ELD', category: 'ELD', status: 'connected', sync: 'Manual entry', notes: 'Dispatcher-entered check calls' },
]

const loads: Load[] = [
  {
    id: 'OKG-1048',
    source: 'DAT',
    customer: 'Summit Retail Group',
    broker: 'Blue Ridge Logistics',
    pickup: 'Salt Lake City, UT',
    delivery: 'Phoenix, AZ',
    pickupWindow: 'Today 14:00-16:00',
    deliveryWindow: 'Apr 25 08:00',
    rate: 2850,
    miles: 663,
    equipment: '53 Van',
    stage: 'Needs appointment',
    risk: 'medium',
    truckId: 'trk-72',
    driverId: 'drv-3',
    contacts: ['dispatch@blueridge.example', '(404) 555-0144'],
    appointmentStatus: 'Pickup requested, delivery pending',
    trackingStatus: 'ELD available, MacroPoint invite unsent',
    podStatus: 'Not due',
    invoiceStatus: 'Not ready',
    emailThreadId: 'em-1',
    marginCost: 1825,
  },
  {
    id: 'OKG-1051',
    source: 'Truckstop',
    customer: 'Cascade Foods',
    broker: 'Northstar Brokerage',
    pickup: 'Denver, CO',
    delivery: 'Dallas, TX',
    pickupWindow: 'Today 18:00',
    deliveryWindow: 'Apr 26 11:00',
    rate: 3650,
    miles: 794,
    equipment: 'Reefer',
    stage: 'In transit',
    risk: 'high',
    truckId: 'trk-44',
    driverId: 'drv-2',
    contacts: ['ops@northstar.example', '(312) 555-0178'],
    appointmentStatus: 'Delivery appointment unconfirmed',
    trackingStatus: 'FourKites pending, ELD pings active',
    podStatus: 'Not due',
    invoiceStatus: 'Not ready',
    emailThreadId: 'em-2',
    marginCost: 2480,
  },
  {
    id: 'OKG-1054',
    source: 'Email',
    customer: 'Wasatch Building Supply',
    broker: 'Direct shipper',
    pickup: 'Boise, ID',
    delivery: 'Seattle, WA',
    pickupWindow: 'Apr 25 07:30',
    deliveryWindow: 'Apr 26 09:30',
    rate: 3100,
    miles: 504,
    equipment: 'Flatbed',
    stage: 'Booked',
    risk: 'low',
    truckId: 'trk-83',
    driverId: 'drv-4',
    contacts: ['traffic@wasatch.example', '(206) 555-0163'],
    appointmentStatus: 'Both appointments confirmed',
    trackingStatus: 'Manual check calls every 4h',
    podStatus: 'Not due',
    invoiceStatus: 'Not ready',
    emailThreadId: 'em-3',
    marginCost: 1940,
  },
  {
    id: 'OKG-1042',
    source: 'Manual',
    customer: 'Intermountain Medical',
    broker: 'Direct shipper',
    pickup: 'Reno, NV',
    delivery: 'Provo, UT',
    pickupWindow: 'Yesterday 10:00',
    deliveryWindow: 'Today 17:00',
    rate: 2200,
    miles: 516,
    equipment: '53 Van',
    stage: 'Invoice pending',
    risk: 'medium',
    truckId: 'trk-21',
    driverId: 'drv-1',
    contacts: ['ap@intermountain.example', '(801) 555-0188'],
    appointmentStatus: 'Completed',
    trackingStatus: 'Delivered, final ping captured',
    podStatus: 'POD missing signature page',
    invoiceStatus: 'Hold for clean POD',
    emailThreadId: 'em-4',
    marginCost: 1510,
  },
]

const threads: EmailThread[] = [
  {
    id: 'em-1',
    from: 'Ari Chen, Blue Ridge',
    subject: 'Need SLC pickup appointment for OKG-1048',
    preview: 'Can your team confirm a 15:00 pickup and send tracking?',
    age: '11m',
    loadId: 'OKG-1048',
    suggestedReply: 'Confirm 15:00 pickup, request delivery appointment, and send MacroPoint invite.',
  },
  {
    id: 'em-2',
    from: 'Northstar Tracking',
    subject: 'FourKites invite not accepted',
    preview: 'Customer needs location visibility before 17:00 or load may be marked non-compliant.',
    age: '24m',
    loadId: 'OKG-1051',
    suggestedReply: 'Send ETA from ELD ping and ask broker to reissue the FourKites link.',
  },
  {
    id: 'em-3',
    from: 'Wasatch Traffic',
    subject: 'Boise load confirmation attached',
    preview: 'Rate confirmation and site rules for tomorrow morning pickup.',
    age: '1h',
    loadId: 'OKG-1054',
    suggestedReply: 'Confirm received, restate driver/unit, and request contact for delivery dock.',
  },
  {
    id: 'em-4',
    from: 'Intermountain AP',
    subject: 'POD page missing signature',
    preview: 'Invoice cannot be processed until the signed POD page is resent.',
    age: '2h',
    loadId: 'OKG-1042',
    suggestedReply: 'Acknowledge hold, request driver image re-upload, and promise corrected invoice packet today.',
  },
]

const gpsPings: GpsPing[] = [
  { time: '13:08', location: 'Pueblo, CO', speed: 62, source: 'Motive ELD' },
  { time: '12:37', location: 'Walsenburg, CO', speed: 65, source: 'Motive ELD' },
  { time: '12:02', location: 'Colorado Springs, CO', speed: 0, source: 'MacroPoint' },
  { time: '11:28', location: 'Monument, CO', speed: 58, source: 'Motive ELD' },
]

const rmiEvents: RmiEvent[] = [
  { loadId: 'OKG-1051', event: 'Late tracking acceptance', impact: -4 },
  { loadId: 'OKG-1054', event: 'Appointment confirmed before pickup', impact: 3 },
  { loadId: 'OKG-1042', event: 'POD exception after delivery', impact: -3 },
  { loadId: 'OKG-1048', event: 'Fast broker response under 15m', impact: 2 },
]

const crmAccounts: CustomerAccount[] = [
  { id: 'acct-1', name: 'Summit Retail Group', owner: 'Greg', lastTouch: 'Today', pipeline: '$42.5k open', openLoads: 3, health: 'strong' },
  { id: 'acct-2', name: 'Cascade Foods', owner: 'Mina', lastTouch: '24m ago', pipeline: '$18.2k at risk', openLoads: 1, health: 'watch' },
  { id: 'acct-3', name: 'Wasatch Building Supply', owner: 'Greg', lastTouch: '1h ago', pipeline: '$31.4k direct', openLoads: 2, health: 'new' },
]

const manualWorkflowStorageKey = 'freightsimple.manual-load-workflow'
const manualTaskTitles = ['Confirm pickup', 'Deliver load', 'Request POD', 'Send invoice', 'Follow up payment']

const emptyManualLoadForm: ManualLoadForm = {
  loadNumber: '',
  company: '',
  pickupCity: '',
  deliveryCity: '',
  pickupDate: '',
  deliveryDate: '',
  rate: '',
  estimatedCost: '',
}

const starterManualWorkflow: ManualWorkflowState = {
  loads: [
    {
      id: 'manual-demo-load',
      loadNumber: 'OKG-2000',
      company: 'Canyon Produce',
      pickupCity: 'Denver, CO',
      deliveryCity: 'Las Vegas, NV',
      pickupDate: '2026-04-27',
      deliveryDate: '2026-04-29',
      rate: 4200,
      estimatedCost: 2600,
      createdAt: '2026-04-24T15:30:00.000Z',
    },
  ],
  tasks: [
    { id: 'manual-demo-task-1', loadId: 'manual-demo-load', loadNumber: 'OKG-2000', title: 'Confirm pickup', dueDate: '2026-04-27', status: 'Open' },
    { id: 'manual-demo-task-2', loadId: 'manual-demo-load', loadNumber: 'OKG-2000', title: 'Deliver load', dueDate: '2026-04-29', status: 'Open' },
    { id: 'manual-demo-task-3', loadId: 'manual-demo-load', loadNumber: 'OKG-2000', title: 'Request POD', dueDate: '2026-04-29', status: 'Open' },
    { id: 'manual-demo-task-4', loadId: 'manual-demo-load', loadNumber: 'OKG-2000', title: 'Send invoice', dueDate: '2026-04-29', status: 'Open' },
    { id: 'manual-demo-task-5', loadId: 'manual-demo-load', loadNumber: 'OKG-2000', title: 'Follow up payment', dueDate: '2026-05-07', status: 'Open' },
  ],
  invoices: [
    {
      id: 'manual-demo-invoice',
      loadId: 'manual-demo-load',
      loadNumber: 'OKG-2000',
      company: 'Canyon Produce',
      amount: 4200,
      status: 'Draft',
      createdAt: '2026-04-24T15:30:00.000Z',
    },
  ],
}

function optimizeLoad(load: Load, availableTruckCount: number) {
  const rpm = load.rate / load.miles
  const margin = load.rate - load.marginCost
  const riskPenalty = load.risk === 'high' ? 22 : load.risk === 'medium' ? 10 : 0
  const sourceBoost = load.source === 'Email' || load.source === 'Manual' ? 8 : 3
  const capacityBoost = availableTruckCount > 1 && load.stage === 'Needs appointment' ? 8 : 0
  const score = Math.round(Math.min(98, rpm * 11 + margin / 80 + sourceBoost + capacityBoost - riskPenalty))
  const recommendedAction =
    score >= 78
      ? 'Accept and dispatch'
      : score >= 62
        ? 'Negotiate rate / confirm appointment'
        : 'Hold until capacity improves'

  return { score, rpm, margin, recommendedAction }
}

function calculateRmiScore(allLoads: Load[], events: RmiEvent[]) {
  const base = 86
  const riskDrag = allLoads.filter((load) => load.risk === 'high').length * -3
  const appointmentBoost = allLoads.filter((load) => load.appointmentStatus.includes('confirmed')).length * 2
  const eventImpact = events.reduce((total, event) => total + event.impact, 0)
  return Math.max(0, Math.min(100, base + riskDrag + appointmentBoost + eventImpact))
}

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function statusLabel(status: Status) {
  return status === 'connected' ? 'Connected' : status === 'mocked' ? 'Mock shell' : status === 'degraded' ? 'Needs attention' : 'Disconnected'
}

const nav = [
  { id: 'dashboard', label: 'Dashboard', icon: Gauge },
  { id: 'add-load', label: 'Add Load', icon: FilePlus2 },
  { id: 'loads', label: 'Load Hub', icon: ClipboardList },
  { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
  { id: 'invoices', label: 'Invoices', icon: ReceiptText },
  { id: 'detail', label: 'Load Detail', icon: Route },
  { id: 'inbox', label: 'Operations Inbox', icon: Inbox },
  { id: 'tracking', label: 'Tracking', icon: MapPinned },
  { id: 'rmi', label: 'RMI', icon: ShieldCheck },
  { id: 'crm', label: 'CRM', icon: UsersRound },
  { id: 'profit', label: 'Profit Intel', icon: CircleDollarSign },
  { id: 'integrations', label: 'Integrations', icon: PlugZap },
]

function App() {
  const [activeView, setActiveView] = useState(() => viewFromPath(window.location.pathname))
  const [selectedLoadId, setSelectedLoadId] = useState(loads[1].id)
  const [manualWorkflow, setManualWorkflow] = useState<ManualWorkflowState>(() => readManualWorkflow())
  const [lastCreatedLoad, setLastCreatedLoad] = useState('')
  const selectedLoad = loads.find((load) => load.id === selectedLoadId) ?? loads[0]
  const selectedDriver = drivers.find((driver) => driver.id === selectedLoad.driverId)
  const selectedTruck = trucks.find((truck) => truck.id === selectedLoad.truckId)
  const selectedThread = threads.find((thread) => thread.id === selectedLoad.emailThreadId)

  useEffect(() => {
    const onPopState = () => setActiveView(viewFromPath(window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(manualWorkflowStorageKey, JSON.stringify(manualWorkflow))
  }, [manualWorkflow])

  function navigate(view: string) {
    window.history.pushState({}, '', pathFromView(view))
    setActiveView(view)
  }

  function addManualLoad(form: ManualLoadForm) {
    const now = new Date().toISOString()
    const loadId = makeManualId('load')
    const rate = Number(form.rate)
    const load: ManualLoad = {
      id: loadId,
      loadNumber: form.loadNumber.trim(),
      company: form.company.trim(),
      pickupCity: form.pickupCity.trim(),
      deliveryCity: form.deliveryCity.trim(),
      pickupDate: form.pickupDate,
      deliveryDate: form.deliveryDate,
      rate,
      estimatedCost: Number(form.estimatedCost),
      createdAt: now,
    }
    const tasks = manualTaskTitles.map((title, index): ManualTask => ({
      id: makeManualId('task'),
      loadId,
      loadNumber: load.loadNumber,
      title,
      dueDate: manualTaskDueDate(title, load, index),
      status: 'Open',
    }))
    const invoice: ManualInvoice = {
      id: makeManualId('invoice'),
      loadId,
      loadNumber: load.loadNumber,
      company: load.company,
      amount: rate,
      status: 'Draft',
      createdAt: now,
    }

    setManualWorkflow((current) => ({
      loads: [load, ...current.loads],
      tasks: [...tasks, ...current.tasks],
      invoices: [invoice, ...current.invoices],
    }))
    setLastCreatedLoad(load.loadNumber)
    navigate('loads')
  }

  function completeManualTask(taskId: string) {
    setManualWorkflow((current) => ({
      ...current,
      tasks: current.tasks.map((task) => task.id === taskId ? { ...task, status: 'Complete' } : task),
    }))
  }

  function updateManualInvoice(invoiceId: string, status: ManualInvoiceStatus) {
    setManualWorkflow((current) => ({
      ...current,
      invoices: current.invoices.map((invoice) => invoice.id === invoiceId ? { ...invoice, status } : invoice),
    }))
  }

  const metrics = useMemo(() => {
    const availableTrucks = trucks.filter((truck) => truck.status === 'available').length
    const unansweredEmails = threads.length
    const trackingCompliant = Math.round((loads.filter((load) => !load.trackingStatus.includes('pending')).length / loads.length) * 100)
    const rmi = calculateRmiScore(loads, rmiEvents)
    const gross = loads.reduce((sum, load) => sum + load.rate, 0)
    const margin = loads.reduce((sum, load) => sum + (load.rate - load.marginCost), 0)
    const manualMargin = manualWorkflow.loads.reduce((sum, load) => sum + load.rate - load.estimatedCost, 0)

    return {
      activeLoads: loads.filter((load) => load.stage !== 'Delivered').length + manualWorkflow.loads.length,
      tasksDue: manualWorkflow.tasks.filter((task) => task.status === 'Open').length,
      openInvoices: manualWorkflow.invoices.filter((invoice) => invoice.status !== 'Paid').length,
      atRisk: loads.filter((load) => load.risk !== 'low').length,
      availableTrucks,
      pendingAppointments: loads.filter((load) => !load.appointmentStatus.includes('confirmed') && load.stage !== 'Invoice pending').length,
      unansweredEmails,
      trackingCompliant,
      rmi,
      gross,
      margin: margin + manualMargin,
      marginPct: Math.round(((margin + manualMargin) / (gross + manualWorkflow.loads.reduce((sum, load) => sum + load.rate, 0))) * 100),
    }
  }, [manualWorkflow])

  const selectedOptimization = optimizeLoad(selectedLoad, metrics.availableTrucks)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate('dashboard')} type="button">
          <span className="brand-mark">OK</span>
          <span>
            <strong>OK GO Freight</strong>
            <small>Carrier V1 org</small>
          </span>
        </button>

        <nav className="nav-list" aria-label="Carrier modules">
          {nav.map((item) => {
            const Icon = item.icon
            return (
              <button
                className={activeView === item.id ? 'nav-item active' : 'nav-item'}
                key={item.id}
                onClick={() => navigate(item.id)}
                type="button"
              >
                <Icon size={17} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="org-card">
          <span className="eyebrow">New org</span>
            <strong>{org.name}</strong>
          <small>freightsimple.ai</small>
          <small>{org.dot} · {org.mc}</small>
          <div className="lane-stack">
            {org.lanes.map((lane) => <span key={lane}>{lane}</span>)}
          </div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">Carrier operations command center</span>
            <h1>{viewTitle(activeView)}</h1>
          </div>
          <div className="top-actions">
            <label className="search-box">
              <Search size={16} />
              <input aria-label="Search loads, emails, trucks" placeholder="Search loads, emails, trucks" />
            </label>
            <button className="primary-action" onClick={() => navigate('add-load')} type="button">
              <FilePlus2 size={16} /> Add manual load
            </button>
          </div>
        </header>

        <section className="metrics-grid" aria-label="Carrier dashboard metrics">
          <Metric icon={Truck} label="Active loads" value={metrics.activeLoads.toString()} tone="blue" />
          <Metric icon={CheckCircle2} label="Tasks due" value={metrics.tasksDue.toString()} tone="amber" />
          <Metric icon={ReceiptText} label="Open invoices" value={metrics.openInvoices.toString()} tone="red" />
          <Metric icon={CalendarClock} label="Pending appointments" value={metrics.pendingAppointments.toString()} tone="amber" />
          <Metric icon={Mail} label="Unanswered emails" value={metrics.unansweredEmails.toString()} tone="amber" />
          <Metric icon={Radio} label="Tracking compliance" value={`${metrics.trackingCompliant}%`} tone="green" />
          <Metric icon={ShieldCheck} label="Carrier RMI score" value={metrics.rmi.toString()} tone="blue" />
          <Metric icon={WalletCards} label="Gross margin" value={`${metrics.marginPct}%`} tone="green" />
        </section>

        {lastCreatedLoad && (
          <div className="success-banner" role="status">
            <CheckCircle2 size={18} />
            Load {lastCreatedLoad} saved. Five tasks and one draft invoice were created.
          </div>
        )}

        <div className="content-grid">
          <section className="panel main-panel">
            {activeView === 'dashboard' && (
              <Dashboard
                metrics={metrics}
                manualWorkflow={manualWorkflow}
                selectedLoad={selectedLoad}
                setActiveView={navigate}
                setSelectedLoadId={setSelectedLoadId}
              />
            )}
            {activeView === 'add-load' && <AddManualLoadPage onSubmit={addManualLoad} />}
            {activeView === 'loads' && (
              <LoadHub
                availableTruckCount={metrics.availableTrucks}
                manualLoads={manualWorkflow.loads}
                selectedLoadId={selectedLoadId}
                setActiveView={navigate}
                setSelectedLoadId={setSelectedLoadId}
              />
            )}
            {activeView === 'tasks' && <ManualTasksPage tasks={manualWorkflow.tasks} onComplete={completeManualTask} />}
            {activeView === 'invoices' && <ManualInvoicesPage invoices={manualWorkflow.invoices} onUpdate={updateManualInvoice} />}
            {activeView === 'detail' && (
              <LoadDetail
                load={selectedLoad}
                driver={selectedDriver}
                truck={selectedTruck}
                thread={selectedThread}
                optimization={selectedOptimization}
              />
            )}
            {activeView === 'inbox' && <OperationsInbox setActiveView={setActiveView} setSelectedLoadId={setSelectedLoadId} />}
            {activeView === 'tracking' && <TrackingPage load={selectedLoad} driver={selectedDriver} truck={selectedTruck} />}
            {activeView === 'rmi' && <RmiDashboard score={metrics.rmi} />}
            {activeView === 'crm' && <CrmPage />}
            {activeView === 'profit' && <ProfitIntelligence />}
            {activeView === 'integrations' && <IntegrationsPage />}
          </section>

          <aside className="panel side-panel">
            <ActionRail load={selectedLoad} optimization={selectedOptimization} rmi={metrics.rmi} />
          </aside>
        </div>
      </main>
    </div>
  )
}

function viewTitle(activeView: string) {
  const item = nav.find((entry) => entry.id === activeView)
  return item?.label ?? 'Dashboard'
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof Truck; label: string; value: string; tone: string }) {
  return (
    <article className={`metric metric-${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <Icon size={20} />
    </article>
  )
}

function Dashboard({
  metrics,
  manualWorkflow,
  selectedLoad,
  setActiveView,
  setSelectedLoadId,
}: {
  metrics: ReturnType<typeof AppMetrics>
  manualWorkflow: ManualWorkflowState
  selectedLoad: Load
  setActiveView: (view: string) => void
  setSelectedLoadId: (id: string) => void
}) {
  const availableTruckCount = trucks.filter((truck) => truck.status === 'available').length
  const dueTasks = manualWorkflow.tasks.filter((task) => task.status === 'Open').slice(0, 5)
  const openInvoices = manualWorkflow.invoices.filter((invoice) => invoice.status !== 'Paid').slice(0, 5)

  return (
    <>
      <PanelHeader
        icon={Activity}
        title="Carrier Dashboard"
        copy="One operating surface for dispatch, inbox, appointments, tracking, RMI, CRM, and margin."
      />
      <div className="dashboard-layout">
        <div className="split-panels">
          <MiniPanel title="Manual Load -> Tasks -> Invoice" icon={FilePlus2}>
            <div className="workflow-strip">
              <button type="button" onClick={() => setActiveView('add-load')}>Add load</button>
              <span>creates</span>
              <button type="button" onClick={() => setActiveView('tasks')}>5 tasks</button>
              <span>and</span>
              <button type="button" onClick={() => setActiveView('invoices')}>Draft invoice</button>
            </div>
          </MiniPanel>
          <MiniPanel title="Open manual work" icon={CheckCircle2}>
            {dueTasks.length === 0 && <p className="muted">No open manual tasks.</p>}
            {dueTasks.map((task) => (
              <div className="score-row" key={task.id}>
                <span>{task.loadNumber} · {task.title}</span>
                <strong>{formatManualDate(task.dueDate)}</strong>
              </div>
            ))}
            {openInvoices.map((invoice) => (
              <div className="score-row" key={invoice.id}>
                <span>{invoice.loadNumber} · {invoice.status} invoice</span>
                <strong>{money(invoice.amount)}</strong>
              </div>
            ))}
          </MiniPanel>
        </div>
        <div className="stack">
          <LoadTable
            loads={loads}
            availableTruckCount={availableTruckCount}
            selectedLoadId={selectedLoad.id}
            onSelect={(id) => {
              setSelectedLoadId(id)
              setActiveView('detail')
            }}
          />
          <div className="split-panels">
            <MiniPanel title="Operations Inbox" icon={Inbox}>
              {threads.slice(0, 3).map((thread) => (
                <button className="thread-row" key={thread.id} type="button" onClick={() => {
                  if (thread.loadId) setSelectedLoadId(thread.loadId)
                  setActiveView('inbox')
                }}>
                  <span>{thread.subject}</span>
                  <small>{thread.age} · {thread.from}</small>
                </button>
              ))}
            </MiniPanel>
            <MiniPanel title="RMI drivers" icon={ShieldCheck}>
              {rmiEvents.map((event) => (
                <div className="score-row" key={`${event.loadId}-${event.event}`}>
                  <span>{event.event}</span>
                  <strong className={event.impact > 0 ? 'positive' : 'negative'}>{event.impact > 0 ? '+' : ''}{event.impact}</strong>
                </div>
              ))}
            </MiniPanel>
          </div>
        </div>

        <div className="stack">
          <MiniPanel title="Tracking watch" icon={MapPinned}>
            <div className="map-surface">
              <span className="map-dot dot-one" />
              <span className="map-dot dot-two" />
              <span className="map-dot dot-three" />
              <div>
                <strong>{selectedLoad.id}</strong>
                <small>{selectedLoad.pickup} to {selectedLoad.delivery}</small>
              </div>
            </div>
            {gpsPings.slice(0, 3).map((ping) => (
              <div className="ping-row" key={`${ping.time}-${ping.location}`}>
                <span>{ping.time}</span>
                <strong>{ping.location}</strong>
                <small>{ping.source}</small>
              </div>
            ))}
          </MiniPanel>
          <MiniPanel title="Profit pulse" icon={CircleDollarSign}>
            <div className="profit-number">{money(metrics.margin)}</div>
            <p className="muted">{metrics.marginPct}% booked margin across {loads.length} active V1 loads.</p>
            <div className="bar-list">
              {loads.map((load) => {
                const margin = load.rate - load.marginCost
                return (
                  <div className="bar-row" key={load.id}>
                    <span>{load.id}</span>
                    <div><i style={{ width: `${Math.min(100, (margin / 1300) * 100)}%` }} /></div>
                    <strong>{money(margin)}</strong>
                  </div>
                )
              })}
            </div>
          </MiniPanel>
        </div>
      </div>
    </>
  )
}

function AppMetrics() {
  return {
    activeLoads: 0,
    atRisk: 0,
    availableTrucks: 0,
    pendingAppointments: 0,
    unansweredEmails: 0,
    trackingCompliant: 0,
    rmi: 0,
    gross: 0,
    margin: 0,
    marginPct: 0,
  }
}

function LoadHub({
  availableTruckCount,
  selectedLoadId,
  setActiveView,
  setSelectedLoadId,
}: {
  availableTruckCount: number
  selectedLoadId: string
  setActiveView: (view: string) => void
  setSelectedLoadId: (id: string) => void
}) {
  return (
    <>
      <PanelHeader
        icon={ClipboardList}
        title="Load Board / Load Hub"
        copy="DAT, Truckstop, email confirmations, and manual loads normalized into one ranked worklist."
      />
      <div className="filters">
        {['All loads', 'DAT', 'Truckstop', 'Email confirmations', 'Manual entry'].map((filter) => (
          <button className={filter === 'All loads' ? 'filter active' : 'filter'} key={filter} type="button">{filter}</button>
        ))}
      </div>
      <LoadTable
        loads={loads}
        availableTruckCount={availableTruckCount}
        selectedLoadId={selectedLoadId}
        onSelect={(id) => {
          setSelectedLoadId(id)
          setActiveView('detail')
        }}
      />
    </>
  )
}

function LoadTable({
  loads: allLoads,
  availableTruckCount,
  selectedLoadId,
  onSelect,
}: {
  loads: Load[]
  availableTruckCount: number
  selectedLoadId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Load</th>
            <th>Source</th>
            <th>Lane</th>
            <th>Rate</th>
            <th>Equipment</th>
            <th>Optimizer</th>
            <th>Recommended action</th>
          </tr>
        </thead>
        <tbody>
          {allLoads.map((load) => {
            const score = optimizeLoad(load, availableTruckCount)
            return (
              <tr className={selectedLoadId === load.id ? 'selected' : ''} key={load.id} onClick={() => onSelect(load.id)}>
                <td>
                  <button className="load-link" type="button">
                    <strong>{load.id}</strong>
                    <small>{load.customer}</small>
                  </button>
                </td>
                <td><Chip tone={sourceTone(load.source)}>{load.source}</Chip></td>
                <td>
                  <strong>{load.pickup}</strong>
                  <small>{load.delivery}</small>
                </td>
                <td>
                  <strong>{money(load.rate)}</strong>
                  <small>{score.rpm.toFixed(2)}/mi</small>
                </td>
                <td>{load.equipment}</td>
                <td><ScoreMeter value={score.score} /></td>
                <td>{score.recommendedAction}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function LoadDetail({
  load,
  driver,
  truck,
  thread,
  optimization,
}: {
  load: Load
  driver?: Driver
  truck?: TruckAsset
  thread?: EmailThread
  optimization: ReturnType<typeof optimizeLoad>
}) {
  return (
    <>
      <PanelHeader icon={Route} title={`Load Detail · ${load.id}`} copy="Pickup, delivery, contacts, appointments, tracking, documents, invoice, and next action." />
      <div className="detail-grid">
        <InfoBlock title="Pickup" value={load.pickup} detail={load.pickupWindow} icon={PackageCheck} />
        <InfoBlock title="Delivery" value={load.delivery} detail={load.deliveryWindow} icon={MapPinned} />
        <InfoBlock title="Rate / miles" value={`${money(load.rate)} · ${load.miles} mi`} detail={`${optimization.rpm.toFixed(2)}/mi · ${money(optimization.margin)} margin`} icon={CircleDollarSign} />
        <InfoBlock title="Equipment" value={load.equipment} detail={`${truck?.unit ?? 'Unassigned'} · ${driver?.name ?? 'No driver'}`} icon={Truck} />
      </div>
      <div className="split-panels">
        <MiniPanel title="Contacts" icon={UsersRound}>
          {load.contacts.map((contact) => <div className="contact-row" key={contact}>{contact}</div>)}
          <div className="contact-row">{load.broker}</div>
        </MiniPanel>
        <MiniPanel title="Statuses" icon={CheckCircle2}>
          <StatusRow label="Appointment" value={load.appointmentStatus} />
          <StatusRow label="Tracking" value={load.trackingStatus} />
          <StatusRow label="POD" value={load.podStatus} />
          <StatusRow label="Invoice" value={load.invoiceStatus} />
        </MiniPanel>
      </div>
      <MiniPanel title="Email thread and AI next action" icon={Bot}>
        <div className="email-card">
          <strong>{thread?.subject}</strong>
          <p>{thread?.preview}</p>
          <div className="ai-reply">
            <Sparkles size={16} />
            <span>{thread?.suggestedReply}</span>
          </div>
        </div>
      </MiniPanel>
    </>
  )
}

function OperationsInbox({
  setActiveView,
  setSelectedLoadId,
}: {
  setActiveView: (view: string) => void
  setSelectedLoadId: (id: string) => void
}) {
  const actions = ['Confirm pickup', 'Request appointment', 'Send ETA', 'Request POD', 'Invoice follow-up']

  return (
    <>
      <PanelHeader icon={Inbox} title="Operations Inbox" copy="Inbound load emails with AI suggested replies and dispatcher action buttons." />
      <div className="inbox-list">
        {threads.map((thread) => (
          <article className="inbox-item" key={thread.id}>
            <button type="button" onClick={() => {
              if (thread.loadId) setSelectedLoadId(thread.loadId)
              setActiveView('detail')
            }}>
              <span>{thread.age}</span>
              <strong>{thread.subject}</strong>
              <small>{thread.from}</small>
              <p>{thread.preview}</p>
            </button>
            <div className="ai-reply">
              <MessageSquareReply size={16} />
              <span>{thread.suggestedReply}</span>
            </div>
            <div className="action-row">
              {actions.map((action) => <button type="button" key={action}>{action}</button>)}
            </div>
          </article>
        ))}
      </div>
    </>
  )
}

function TrackingPage({ load, driver, truck }: { load: Load; driver?: Driver; truck?: TruckAsset }) {
  return (
    <>
      <PanelHeader icon={MapPinned} title="Tracking" copy="Truck/load location, ping history, provider status, and ETA risk." />
      <div className="tracking-layout">
        <div className="map-large">
          <span className="route-line" />
          <span className="map-dot dot-one" />
          <span className="map-dot dot-two" />
          <span className="map-dot dot-three" />
          <div className="map-callout">
            <strong>{truck?.unit ?? 'Unassigned'} · {load.id}</strong>
            <small>{truck?.location ?? 'Location pending'} · ETA risk {load.risk}</small>
          </div>
        </div>
        <div className="stack">
          <MiniPanel title="Provider status" icon={Cloud}>
            <StatusRow label="ELD" value={`${driver?.eldProvider ?? 'Manual'} active shell`} />
            <StatusRow label="MacroPoint" value={load.trackingStatus.includes('MacroPoint') ? 'Invite pending' : 'Monitoring shell'} />
            <StatusRow label="FourKites" value={load.trackingStatus.includes('FourKites') ? 'Pending acceptance' : 'Adapter ready'} />
            <StatusRow label="ETA risk" value={load.risk.toUpperCase()} />
          </MiniPanel>
          <MiniPanel title="GPS ping history" icon={Radio}>
            {gpsPings.map((ping) => (
              <div className="ping-row" key={`${ping.time}-${ping.location}`}>
                <span>{ping.time}</span>
                <strong>{ping.location}</strong>
                <small>{ping.speed} mph · {ping.source}</small>
              </div>
            ))}
          </MiniPanel>
        </div>
      </div>
    </>
  )
}

function RmiDashboard({ score }: { score: number }) {
  return (
    <>
      <PanelHeader icon={ShieldCheck} title="RMI Dashboard" copy="Carrier score, score drivers, load history, and recommendations to improve reputation." />
      <div className="rmi-grid">
        <div className="rmi-score">
          <span>Carrier score</span>
          <strong>{score}</strong>
          <small>V1 mock scoring model</small>
        </div>
        <MiniPanel title="Score drivers" icon={BarChart3}>
          <StatusRow label="On-time appointments" value="+6" />
          <StatusRow label="Tracking gaps" value="-4" />
          <StatusRow label="Document exceptions" value="-3" />
          <StatusRow label="Fast replies" value="+2" />
        </MiniPanel>
      </div>
      <MiniPanel title="Load-by-load performance history" icon={ClipboardList}>
        {rmiEvents.map((event) => (
          <div className="score-row" key={`${event.loadId}-${event.event}`}>
            <span>{event.loadId} · {event.event}</span>
            <strong className={event.impact > 0 ? 'positive' : 'negative'}>{event.impact > 0 ? '+' : ''}{event.impact}</strong>
          </div>
        ))}
      </MiniPanel>
      <MiniPanel title="Suggestions to improve score" icon={Sparkles}>
        <ul className="suggestions">
          <li>Auto-send tracking invite when a load moves to booked.</li>
          <li>Escalate unconfirmed appointments after 20 minutes.</li>
          <li>Require POD photo quality check before invoice submission.</li>
        </ul>
      </MiniPanel>
    </>
  )
}

function CrmPage() {
  return (
    <>
      <PanelHeader icon={UsersRound} title="CRM" copy="Carrier-side account management for shippers, brokers, follow-ups, and lane opportunities." />
      <div className="crm-grid">
        {crmAccounts.map((account) => (
          <article className="account-card" key={account.id}>
            <Chip tone={account.health === 'strong' ? 'green' : account.health === 'watch' ? 'red' : 'blue'}>{account.health}</Chip>
            <strong>{account.name}</strong>
            <small>Owner {account.owner} · Last touch {account.lastTouch}</small>
            <div className="account-meta">
              <span>{account.pipeline}</span>
              <span>{account.openLoads} open loads</span>
            </div>
            <button type="button">Schedule follow-up <ChevronRight size={15} /></button>
          </article>
        ))}
      </div>
    </>
  )
}

function ProfitIntelligence() {
  const availableTruckCount = trucks.filter((truck) => truck.status === 'available').length
  const rankedLoads = [...loads].sort((a, b) => optimizeLoad(b, availableTruckCount).margin - optimizeLoad(a, availableTruckCount).margin)

  return (
    <>
      <PanelHeader icon={CircleDollarSign} title="Profit Intelligence" copy="Margin, RPM, deadhead risk, and recommended booking decisions for carrier profitability." />
      <div className="profit-grid">
        {rankedLoads.map((load) => {
          const score = optimizeLoad(load, availableTruckCount)
          return (
            <article className="profit-card" key={load.id}>
              <div>
                <strong>{load.id}</strong>
                <small>{load.pickup} to {load.delivery}</small>
              </div>
              <ScoreMeter value={score.score} />
              <StatusRow label="Revenue" value={money(load.rate)} />
              <StatusRow label="Est. cost" value={money(load.marginCost)} />
              <StatusRow label="Gross margin" value={money(score.margin)} />
              <StatusRow label="Decision" value={score.recommendedAction} />
            </article>
          )
        })}
      </div>
    </>
  )
}

function IntegrationsPage() {
  return (
    <>
      <PanelHeader icon={PlugZap} title="Integrations" copy="Provider adapter shells with mock connection status. V1 does not require real API credentials." />
      <div className="integration-grid">
        {connectedAccounts.map((account) => (
          <article className="connector-card" key={account.id}>
            <div className="connector-head">
              <span className="connector-icon"><Link2 size={18} /></span>
              <Chip tone={statusTone(account.status)}>{statusLabel(account.status)}</Chip>
            </div>
            <strong>{account.provider}</strong>
            <small>{account.category} · {account.sync}</small>
            <p>{account.notes}</p>
          </article>
        ))}
      </div>
    </>
  )
}

function ActionRail({ load, optimization, rmi }: { load: Load; optimization: ReturnType<typeof optimizeLoad>; rmi: number }) {
  return (
    <>
      <PanelHeader icon={Bot} title="AI Dispatch Rail" copy="Selected load recommendation and exception queue." compact />
      <div className="rail-card accent">
        <span className="eyebrow">Next action</span>
        <strong>{optimization.recommendedAction}</strong>
        <p>{load.id} has optimizer score {optimization.score}, RMI score {rmi}, and {load.risk} ETA risk.</p>
        <button type="button"><Send size={15} /> Send dispatcher update</button>
      </div>
      <MiniPanel title="Selected load" icon={Route}>
        <StatusRow label="Lane" value={`${load.pickup} → ${load.delivery}`} />
        <StatusRow label="Appointment" value={load.appointmentStatus} />
        <StatusRow label="Tracking" value={load.trackingStatus} />
        <StatusRow label="Invoice" value={load.invoiceStatus} />
      </MiniPanel>
      <MiniPanel title="Org adapters" icon={PlugZap}>
        {connectedAccounts.slice(0, 5).map((account) => (
          <div className="score-row" key={account.id}>
            <span>{account.provider}</span>
            <Chip tone={statusTone(account.status)}>{statusLabel(account.status)}</Chip>
          </div>
        ))}
      </MiniPanel>
    </>
  )
}

function PanelHeader({
  icon: Icon,
  title,
  copy,
  compact = false,
}: {
  icon: typeof Truck
  title: string
  copy: string
  compact?: boolean
}) {
  return (
    <div className={compact ? 'panel-header compact' : 'panel-header'}>
      <span><Icon size={18} /></span>
      <div>
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
    </div>
  )
}

function MiniPanel({ title, icon: Icon, children }: { title: string; icon: typeof Truck; children: React.ReactNode }) {
  return (
    <section className="mini-panel">
      <div className="mini-title"><Icon size={16} /> {title}</div>
      {children}
    </section>
  )
}

function InfoBlock({ title, value, detail, icon: Icon }: { title: string; value: string; detail: string; icon: typeof Truck }) {
  return (
    <article className="info-block">
      <Icon size={18} />
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="status-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ScoreMeter({ value }: { value: number }) {
  return (
    <div className="score-meter" aria-label={`Optimizer score ${value}`}>
      <span><i style={{ width: `${value}%` }} /></span>
      <strong>{value}</strong>
    </div>
  )
}

function Chip({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={`chip chip-${tone}`}>{children}</span>
}

function sourceTone(source: LoadSource) {
  if (source === 'DAT') return 'blue'
  if (source === 'Truckstop') return 'amber'
  if (source === 'Email') return 'green'
  return 'gray'
}

function statusTone(status: Status) {
  if (status === 'connected') return 'green'
  if (status === 'degraded') return 'red'
  if (status === 'mocked') return 'blue'
  return 'gray'
}

export default App
