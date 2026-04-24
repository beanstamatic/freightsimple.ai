import { getSupabaseClient } from '../supabase/client'

export type ManualTaskStatus = 'Open' | 'Complete'
export type ManualInvoiceStatus = 'Draft' | 'Sent' | 'Paid'

export type ManualLoad = {
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

export type ManualTask = {
  id: string
  loadId: string
  loadNumber: string
  title: string
  dueDate: string
  status: ManualTaskStatus
}

export type ManualInvoice = {
  id: string
  loadId: string
  loadNumber: string
  company: string
  amount: number
  status: ManualInvoiceStatus
  createdAt: string
}

export type ManualWorkflowState = {
  loads: ManualLoad[]
  tasks: ManualTask[]
  invoices: ManualInvoice[]
}

export const MANUAL_WORKFLOW_STORAGE_KEY = 'freightsimple.manual-load-workflow'

export function createStarterManualWorkflow(): ManualWorkflowState {
  return {
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
}

export type WorkflowSource = 'local' | 'supabase'

function toSupabaseLoad(orgId: string, load: ManualLoad) {
  return {
    id: load.id,
    carrier_id: orgId,
    load_number: load.loadNumber,
    customer_name: load.company,
    pickup_city: load.pickupCity,
    delivery_city: load.deliveryCity,
    pickup_date: load.pickupDate,
    delivery_date: load.deliveryDate,
    rate: load.rate,
    estimated_cost: load.estimatedCost,
    created_at: load.createdAt,
  }
}

function toSupabaseTask(orgId: string, task: ManualTask) {
  return {
    id: task.id,
    carrier_id: orgId,
    load_id: task.loadId,
    load_number: task.loadNumber,
    title: task.title,
    due_date: task.dueDate,
    status: task.status,
  }
}

function toSupabaseInvoice(orgId: string, invoice: ManualInvoice) {
  return {
    id: invoice.id,
    carrier_id: orgId,
    load_id: invoice.loadId,
    load_number: invoice.loadNumber,
    customer_name: invoice.company,
    amount: invoice.amount,
    status: invoice.status,
    created_at: invoice.createdAt,
  }
}

function readLocal(storageKey: string, fallback: ManualWorkflowState) {
  if (typeof window === 'undefined') return fallback
  try {
    const stored = window.localStorage.getItem(storageKey)
    if (!stored) return fallback
    const parsed = JSON.parse(stored) as ManualWorkflowState
    if (!Array.isArray(parsed.loads) || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.invoices)) {
      return fallback
    }
    return parsed
  } catch {
    return fallback
  }
}

function writeLocal(storageKey: string, state: ManualWorkflowState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey, JSON.stringify(state))
}

export async function loadManualWorkflowState(
  orgId: string,
  storageKey = MANUAL_WORKFLOW_STORAGE_KEY,
) {
  const fallback = createStarterManualWorkflow()
  const local = readLocal(storageKey, fallback)
  const supabase = getSupabaseClient()
  if (!supabase) return { state: local, source: 'local' as WorkflowSource }

  try {
    const [loadsRes, tasksRes, invoicesRes] = await Promise.all([
      supabase.from('manual_loads').select('*').eq('carrier_id', orgId).order('created_at', { ascending: false }),
      supabase.from('manual_tasks').select('*').eq('carrier_id', orgId).order('due_date', { ascending: true }),
      supabase.from('manual_invoices').select('*').eq('carrier_id', orgId).order('created_at', { ascending: false }),
    ])

    if (loadsRes.error || tasksRes.error || invoicesRes.error) {
      return { state: local, source: 'local' as WorkflowSource }
    }

    const state: ManualWorkflowState = {
      loads: (loadsRes.data ?? []).map((row) => ({
        id: row.id,
        loadNumber: row.load_number,
        company: row.customer_name,
        pickupCity: row.pickup_city,
        deliveryCity: row.delivery_city,
        pickupDate: row.pickup_date,
        deliveryDate: row.delivery_date,
        rate: Number(row.rate),
        estimatedCost: Number(row.estimated_cost),
        createdAt: row.created_at,
      })),
      tasks: (tasksRes.data ?? []).map((row) => ({
        id: row.id,
        loadId: row.load_id,
        loadNumber: row.load_number,
        title: row.title,
        dueDate: row.due_date,
        status: row.status,
      })),
      invoices: (invoicesRes.data ?? []).map((row) => ({
        id: row.id,
        loadId: row.load_id,
        loadNumber: row.load_number,
        company: row.customer_name,
        amount: Number(row.amount),
        status: row.status,
        createdAt: row.created_at,
      })),
    }

    writeLocal(storageKey, state)
    return { state, source: 'supabase' as WorkflowSource }
  } catch {
    return { state: local, source: 'local' as WorkflowSource }
  }
}

export async function persistManualWorkflowState(
  orgId: string,
  state: ManualWorkflowState,
  storageKey = MANUAL_WORKFLOW_STORAGE_KEY,
) {
  writeLocal(storageKey, state)
  const supabase = getSupabaseClient()
  if (!supabase) return

  const loadIds = state.loads.map((load) => load.id)
  const taskIds = state.tasks.map((task) => task.id)
  const invoiceIds = state.invoices.map((invoice) => invoice.id)

  await Promise.all([
    supabase.from('manual_loads').upsert(state.loads.map((load) => toSupabaseLoad(orgId, load))),
    supabase.from('manual_tasks').upsert(state.tasks.map((task) => toSupabaseTask(orgId, task))),
    supabase.from('manual_invoices').upsert(state.invoices.map((invoice) => toSupabaseInvoice(orgId, invoice))),
  ])

  if (loadIds.length > 0) {
    await supabase.from('manual_loads').delete().eq('carrier_id', orgId).not('id', 'in', `(${loadIds.map((id) => `"${id}"`).join(',')})`)
  }
  if (taskIds.length > 0) {
    await supabase.from('manual_tasks').delete().eq('carrier_id', orgId).not('id', 'in', `(${taskIds.map((id) => `"${id}"`).join(',')})`)
  }
  if (invoiceIds.length > 0) {
    await supabase.from('manual_invoices').delete().eq('carrier_id', orgId).not('id', 'in', `(${invoiceIds.map((id) => `"${id}"`).join(',')})`)
  }
}
