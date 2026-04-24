import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FilePlus2,
  Gauge,
  PackageCheck,
  ReceiptText,
  Send,
  Truck,
} from 'lucide-react'
import './App.css'

type Page = '/add-load' | '/loads' | '/tasks' | '/invoices' | '/'
type TaskStatus = 'Open' | 'Complete'
type InvoiceStatus = 'Draft' | 'Sent' | 'Paid'

type Load = {
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

type Task = {
  id: string
  loadId: string
  loadNumber: string
  title: string
  dueDate: string
  status: TaskStatus
}

type Invoice = {
  id: string
  loadId: string
  loadNumber: string
  company: string
  amount: number
  status: InvoiceStatus
  createdAt: string
}

type FreightState = {
  loads: Load[]
  tasks: Task[]
  invoices: Invoice[]
}

type LoadForm = {
  loadNumber: string
  company: string
  pickupCity: string
  deliveryCity: string
  pickupDate: string
  deliveryDate: string
  rate: string
  estimatedCost: string
}

const storageKey = 'freightsimple.manual-load-workflow'
const taskTitles = ['Confirm pickup', 'Deliver load', 'Request POD', 'Send invoice', 'Follow up payment']

const starterState: FreightState = {
  loads: [
    {
      id: 'load-demo-1',
      loadNumber: 'OKG-1048',
      company: 'Summit Retail Group',
      pickupCity: 'Salt Lake City, UT',
      deliveryCity: 'Phoenix, AZ',
      pickupDate: '2026-04-24',
      deliveryDate: '2026-04-25',
      rate: 2850,
      estimatedCost: 1825,
      createdAt: '2026-04-24T09:30:00.000Z',
    },
  ],
  tasks: [
    { id: 'task-demo-1', loadId: 'load-demo-1', loadNumber: 'OKG-1048', title: 'Confirm pickup', dueDate: '2026-04-24', status: 'Open' },
    { id: 'task-demo-2', loadId: 'load-demo-1', loadNumber: 'OKG-1048', title: 'Deliver load', dueDate: '2026-04-25', status: 'Open' },
    { id: 'task-demo-3', loadId: 'load-demo-1', loadNumber: 'OKG-1048', title: 'Request POD', dueDate: '2026-04-25', status: 'Open' },
    { id: 'task-demo-4', loadId: 'load-demo-1', loadNumber: 'OKG-1048', title: 'Send invoice', dueDate: '2026-04-25', status: 'Open' },
    { id: 'task-demo-5', loadId: 'load-demo-1', loadNumber: 'OKG-1048', title: 'Follow up payment', dueDate: '2026-05-02', status: 'Open' },
  ],
  invoices: [
    {
      id: 'inv-demo-1',
      loadId: 'load-demo-1',
      loadNumber: 'OKG-1048',
      company: 'Summit Retail Group',
      amount: 2850,
      status: 'Draft',
      createdAt: '2026-04-24T09:30:00.000Z',
    },
  ],
}

const nav = [
  { path: '/', label: 'Dashboard', icon: Gauge },
  { path: '/add-load', label: 'Add Load', icon: FilePlus2 },
  { path: '/loads', label: 'Loads', icon: Truck },
  { path: '/tasks', label: 'Tasks', icon: ClipboardList },
  { path: '/invoices', label: 'Invoices', icon: ReceiptText },
] satisfies { path: Page; label: string; icon: typeof Gauge }[]

const emptyForm: LoadForm = {
  loadNumber: '',
  company: '',
  pickupCity: '',
  deliveryCity: '',
  pickupDate: '',
  deliveryDate: '',
  rate: '',
  estimatedCost: '',
}

function App() {
  const [page, setPage] = useState<Page>(() => normalizePath(window.location.pathname))
  const [state, setState] = useState<FreightState>(() => readState())
  const [lastCreated, setLastCreated] = useState<string>('')

  useEffect(() => {
    const onPopState = () => setPage(normalizePath(window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(state))
  }, [state])

  const metrics = useMemo(() => {
    const openTasks = state.tasks.filter((task) => task.status === 'Open')
    const openInvoices = state.invoices.filter((invoice) => invoice.status !== 'Paid')

    return {
      activeLoads: state.loads.length,
      tasksDue: openTasks.length,
      openInvoices: openInvoices.length,
      draftInvoices: state.invoices.filter((invoice) => invoice.status === 'Draft').length,
      revenue: state.invoices.reduce((sum, invoice) => sum + invoice.amount, 0),
      margin: state.loads.reduce((sum, load) => sum + load.rate - load.estimatedCost, 0),
    }
  }, [state])

  function navigate(nextPage: Page) {
    window.history.pushState({}, '', nextPage)
    setPage(nextPage)
  }

  function addLoad(form: LoadForm) {
    const now = new Date().toISOString()
    const loadId = makeId('load')
    const rate = Number(form.rate)
    const load: Load = {
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

    const tasks = taskTitles.map((title, index): Task => ({
      id: makeId('task'),
      loadId,
      loadNumber: load.loadNumber,
      title,
      dueDate: taskDueDate(title, load, index),
      status: 'Open',
    }))

    const invoice: Invoice = {
      id: makeId('inv'),
      loadId,
      loadNumber: load.loadNumber,
      company: load.company,
      amount: rate,
      status: 'Draft',
      createdAt: now,
    }

    setState((current) => ({
      loads: [load, ...current.loads],
      tasks: [...tasks, ...current.tasks],
      invoices: [invoice, ...current.invoices],
    }))
    setLastCreated(load.loadNumber)
    navigate('/loads')
  }

  function completeTask(taskId: string) {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => task.id === taskId ? { ...task, status: 'Complete' } : task),
    }))
  }

  function updateInvoice(invoiceId: string, status: InvoiceStatus) {
    setState((current) => ({
      ...current,
      invoices: current.invoices.map((invoice) => invoice.id === invoiceId ? { ...invoice, status } : invoice),
    }))
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate('/')} type="button">
          <span className="brand-mark">FS</span>
          <span>
            <strong>FreightSimple</strong>
            <small>Manual load workflow</small>
          </span>
        </button>

        <nav className="nav-list" aria-label="Workflow pages">
          {nav.map((item) => {
            const Icon = item.icon
            return (
              <button
                className={page === item.path ? 'nav-item active' : 'nav-item'}
                key={item.path}
                onClick={() => navigate(item.path)}
                type="button"
              >
                <Icon size={17} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="org-card">
          <span className="eyebrow">Local storage</span>
          <strong>Mock data mode</strong>
          <small>Loads, tasks, and invoices persist in this browser.</small>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">Manual Load to Tasks to Invoice</span>
            <h1>{pageTitle(page)}</h1>
          </div>
          <button className="primary-action" type="button" onClick={() => navigate('/add-load')}>
            <FilePlus2 size={16} /> Add load
          </button>
        </header>

        <section className="metrics-grid" aria-label="Dashboard metrics">
          <Metric icon={Truck} label="Active loads" value={String(metrics.activeLoads)} tone="blue" />
          <Metric icon={ClipboardList} label="Tasks due" value={String(metrics.tasksDue)} tone="amber" />
          <Metric icon={ReceiptText} label="Open invoices" value={String(metrics.openInvoices)} tone="red" />
          <Metric icon={CircleDollarSign} label="Booked margin" value={money(metrics.margin)} tone="green" />
        </section>

        {lastCreated && (
          <div className="success-banner" role="status">
            <CheckCircle2 size={18} />
            Load {lastCreated} saved. Five tasks and one draft invoice were created.
          </div>
        )}

        <section className="panel main-panel">
          {page === '/' && <Dashboard state={state} metrics={metrics} navigate={navigate} />}
          {page === '/add-load' && <AddLoadPage onSubmit={addLoad} />}
          {page === '/loads' && <LoadsPage loads={state.loads} />}
          {page === '/tasks' && <TasksPage tasks={state.tasks} onComplete={completeTask} />}
          {page === '/invoices' && <InvoicesPage invoices={state.invoices} onUpdate={updateInvoice} />}
        </section>
      </main>
    </div>
  )
}

function Dashboard({
  state,
  metrics,
  navigate,
}: {
  state: FreightState
  metrics: { activeLoads: number; tasksDue: number; openInvoices: number; draftInvoices: number; revenue: number; margin: number }
  navigate: (page: Page) => void
}) {
  const nextTasks = state.tasks.filter((task) => task.status === 'Open').slice(0, 5)
  const openInvoices = state.invoices.filter((invoice) => invoice.status !== 'Paid').slice(0, 5)

  return (
    <>
      <PanelHeader
        icon={Gauge}
        title="Dashboard"
        copy="A practical dispatch view of active loads, due tasks, and invoices that still need attention."
      />
      <div className="dashboard-layout">
        <MiniPanel title="Current workflow" icon={PackageCheck}>
          <div className="workflow-strip">
            <button type="button" onClick={() => navigate('/add-load')}>Manual load</button>
            <span>creates</span>
            <button type="button" onClick={() => navigate('/tasks')}>5 tasks</button>
            <span>and</span>
            <button type="button" onClick={() => navigate('/invoices')}>Draft invoice</button>
          </div>
        </MiniPanel>

        <div className="split-panels">
          <MiniPanel title="Tasks due" icon={ClipboardList}>
            {nextTasks.length ? nextTasks.map((task) => <TaskLine task={task} key={task.id} />) : <EmptyState text="No open tasks." />}
          </MiniPanel>
          <MiniPanel title="Open invoices" icon={ReceiptText}>
            {openInvoices.length ? openInvoices.map((invoice) => (
              <div className="status-row" key={invoice.id}>
                <span>{invoice.loadNumber}</span>
                <strong>{invoice.status} · {money(invoice.amount)}</strong>
              </div>
            )) : <EmptyState text="No open invoices." />}
          </MiniPanel>
        </div>

        <MiniPanel title="Totals" icon={CircleDollarSign}>
          <div className="summary-grid">
            <Summary label="Loads" value={String(metrics.activeLoads)} />
            <Summary label="Draft invoices" value={String(metrics.draftInvoices)} />
            <Summary label="Invoice value" value={money(metrics.revenue)} />
            <Summary label="Estimated margin" value={money(metrics.margin)} />
          </div>
        </MiniPanel>
      </div>
    </>
  )
}

function AddLoadPage({ onSubmit }: { onSubmit: (form: LoadForm) => void }) {
  const [form, setForm] = useState<LoadForm>(emptyForm)

  function update(field: keyof LoadForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(form)
    setForm(emptyForm)
  }

  return (
    <>
      <PanelHeader
        icon={FilePlus2}
        title="Add manual load"
        copy="Submit once to save the load, create the operational task list, and open a draft invoice for the load rate."
      />
      <form className="load-form" onSubmit={submit}>
        <Field label="Load number" value={form.loadNumber} onChange={(value) => update('loadNumber', value)} required />
        <Field label="Company" value={form.company} onChange={(value) => update('company', value)} required />
        <Field label="Pickup city" value={form.pickupCity} onChange={(value) => update('pickupCity', value)} required />
        <Field label="Delivery city" value={form.deliveryCity} onChange={(value) => update('deliveryCity', value)} required />
        <Field label="Pickup date" type="date" value={form.pickupDate} onChange={(value) => update('pickupDate', value)} required />
        <Field label="Delivery date" type="date" value={form.deliveryDate} onChange={(value) => update('deliveryDate', value)} required />
        <Field label="Rate" type="number" min="0" step="0.01" value={form.rate} onChange={(value) => update('rate', value)} required />
        <Field label="Estimated cost" type="number" min="0" step="0.01" value={form.estimatedCost} onChange={(value) => update('estimatedCost', value)} required />
        <div className="form-actions">
          <button className="primary-action" type="submit">
            <Send size={16} /> Save load
          </button>
        </div>
      </form>
    </>
  )
}

function LoadsPage({ loads }: { loads: Load[] }) {
  return (
    <>
      <PanelHeader icon={Truck} title="Loads" copy="Every manual load saved in local storage." />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Load</th>
              <th>Company</th>
              <th>Lane</th>
              <th>Dates</th>
              <th>Rate</th>
              <th>Est. cost</th>
              <th>Margin</th>
            </tr>
          </thead>
          <tbody>
            {loads.map((load) => (
              <tr key={load.id}>
                <td><strong>{load.loadNumber}</strong></td>
                <td>{load.company}</td>
                <td>
                  <strong>{load.pickupCity}</strong>
                  <small>{load.deliveryCity}</small>
                </td>
                <td>
                  <strong>{formatDate(load.pickupDate)}</strong>
                  <small>{formatDate(load.deliveryDate)}</small>
                </td>
                <td>{money(load.rate)}</td>
                <td>{money(load.estimatedCost)}</td>
                <td>{money(load.rate - load.estimatedCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function TasksPage({ tasks, onComplete }: { tasks: Task[]; onComplete: (id: string) => void }) {
  return (
    <>
      <PanelHeader icon={ClipboardList} title="Tasks" copy="Auto-created tasks for each manual load. Complete them as dispatch work moves forward." />
      <div className="list-stack">
        {tasks.map((task) => (
          <article className="work-item" key={task.id}>
            <div>
              <Chip tone={task.status === 'Complete' ? 'green' : 'amber'}>{task.status}</Chip>
              <strong>{task.title}</strong>
              <small>{task.loadNumber} · Due {formatDate(task.dueDate)}</small>
            </div>
            <button disabled={task.status === 'Complete'} onClick={() => onComplete(task.id)} type="button">
              <CheckCircle2 size={16} /> Mark complete
            </button>
          </article>
        ))}
      </div>
    </>
  )
}

function InvoicesPage({
  invoices,
  onUpdate,
}: {
  invoices: Invoice[]
  onUpdate: (id: string, status: InvoiceStatus) => void
}) {
  return (
    <>
      <PanelHeader icon={ReceiptText} title="Invoices" copy="Each submitted load starts as a Draft invoice with amount equal to the load rate." />
      <div className="list-stack">
        {invoices.map((invoice) => (
          <article className="work-item" key={invoice.id}>
            <div>
              <Chip tone={invoice.status === 'Paid' ? 'green' : invoice.status === 'Sent' ? 'blue' : 'gray'}>{invoice.status}</Chip>
              <strong>{invoice.loadNumber} · {invoice.company}</strong>
              <small>{money(invoice.amount)} · Created {formatDate(invoice.createdAt)}</small>
            </div>
            <div className="button-cluster">
              <button disabled={invoice.status !== 'Draft'} onClick={() => onUpdate(invoice.id, 'Sent')} type="button">Mark sent</button>
              <button disabled={invoice.status === 'Paid'} onClick={() => onUpdate(invoice.id, 'Paid')} type="button">Mark paid</button>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  min,
  step,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
  min?: string
  step?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input min={min} onChange={(event) => onChange(event.target.value)} required={required} step={step} type={type} value={value} />
    </label>
  )
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

function PanelHeader({ icon: Icon, title, copy }: { icon: typeof Truck; title: string; copy: string }) {
  return (
    <div className="panel-header">
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

function TaskLine({ task }: { task: Task }) {
  return (
    <div className="status-row">
      <span>{task.loadNumber}</span>
      <strong>{task.title} · {formatDate(task.dueDate)}</strong>
    </div>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="muted">{text}</p>
}

function Chip({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={`chip chip-${tone}`}>{children}</span>
}

function readState(): FreightState {
  try {
    const stored = window.localStorage.getItem(storageKey)
    if (!stored) return starterState
    const parsed = JSON.parse(stored) as FreightState
    if (!Array.isArray(parsed.loads) || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.invoices)) {
      return starterState
    }
    return parsed
  } catch {
    return starterState
  }
}

function normalizePath(pathname: string): Page {
  if (pathname === '/add-load' || pathname === '/loads' || pathname === '/tasks' || pathname === '/invoices') return pathname
  return '/'
}

function pageTitle(page: Page) {
  return nav.find((item) => item.path === page)?.label ?? 'Dashboard'
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function taskDueDate(title: string, load: Load, index: number) {
  if (title === 'Confirm pickup') return load.pickupDate
  if (title === 'Deliver load' || title === 'Request POD' || title === 'Send invoice') return load.deliveryDate
  const followUp = new Date(`${load.deliveryDate}T12:00:00`)
  followUp.setDate(followUp.getDate() + 7 + index)
  return followUp.toISOString().slice(0, 10)
}

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0)
}

function formatDate(value: string) {
  if (!value) return 'Not set'
  const date = new Date(value.includes('T') ? value : `${value}T12:00:00`)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

export default App
