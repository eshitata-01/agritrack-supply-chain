"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, Eye, Pencil, Plus, Search, Trash2, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import {
  CROP_DEFINITIONS,
  FACILITIES,
  REGIONS,
  ROUTES,
  formatDate,
  formatKg,
  getLossPercentage,
  getLossQuantity,
  getStageKey,
  getStageName,
  sumLosses,
  type CropDefinition,
  type RecordRow,
  type Shipment,
  type StageName,
} from "@/lib/agritrack-data"

type TabName = "Crops" | "Harvest Records" | "Storage Records" | "Transportation Records" | "Shipments" | "Loss Records"
type EditorState = { mode: "add" | "edit" | "view"; tab: TabName; row?: RecordRow }
type Field = { key: string; label: string; type?: "text" | "number" | "date" | "select"; options?: string[]; required?: boolean; min?: number; step?: number }

const TABS: TabName[] = ["Crops", "Harvest Records", "Storage Records", "Transportation Records", "Shipments", "Loss Records"]
const PAGE_SIZE = 8

function titleCase(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())
}

function fieldsFor(tab: TabName): Field[] {
  if (tab === "Crops") return [
    { key: "crop", label: "Crop name", required: true },
    { key: "category", label: "Category", type: "select", options: ["Grain", "Vegetable", "Fruit"], required: true },
    { key: "season", label: "Growing season", type: "select", options: ["Kharif", "Rabi", "Summer", "All season"], required: true },
  ]
  if (tab === "Harvest Records") return [
    { key: "crop", label: "Crop", type: "select", options: CROP_DEFINITIONS.map((item) => item.name), required: true },
    { key: "region", label: "Region", type: "select", options: REGIONS, required: true },
    { key: "quantityHarvestedKg", label: "Quantity harvested (kg)", type: "number", min: 1, required: true },
    { key: "harvestDate", label: "Harvest date", type: "date", required: true },
  ]
  if (tab === "Storage Records") return [
    { key: "crop", label: "Crop", type: "select", options: CROP_DEFINITIONS.map((item) => item.name), required: true },
    { key: "region", label: "Region", type: "select", options: REGIONS, required: true },
    { key: "facility", label: "Storage facility", type: "select", options: FACILITIES.map((item) => item.name), required: true },
    { key: "storageDays", label: "Storage duration (days)", type: "number", min: 0, required: true },
    { key: "quantityLostKg", label: "Quantity lost (kg)", type: "number", min: 0, required: true },
  ]
  if (tab === "Transportation Records") return [
    { key: "crop", label: "Crop", type: "select", options: CROP_DEFINITIONS.map((item) => item.name), required: true },
    { key: "region", label: "Region", type: "select", options: REGIONS, required: true },
    { key: "route", label: "Route", type: "select", options: ROUTES.map((item) => `${item.source} → ${item.destination}`), required: true },
    { key: "vehicleId", label: "Vehicle ID", required: true },
    { key: "transitHours", label: "Transit duration (hours)", type: "number", min: 0, required: true },
    { key: "quantityReceivedKg", label: "Quantity received after transit (kg)", type: "number", min: 0, required: true },
  ]
  if (tab === "Shipments") return [
    { key: "crop", label: "Crop", type: "select", options: CROP_DEFINITIONS.map((item) => item.name), required: true },
    { key: "region", label: "Region", type: "select", options: REGIONS, required: true },
    { key: "origin", label: "Origin", required: true },
    { key: "destination", label: "Destination", required: true },
    { key: "dispatchDate", label: "Dispatch date", type: "date", required: true },
    { key: "expectedDate", label: "Expected delivery", type: "date", required: true },
    { key: "qtyDispatched", label: "Quantity dispatched (kg)", type: "number", min: 1, required: true },
    { key: "qtyReceived", label: "Quantity received (kg)", type: "number", min: 0, required: true },
    { key: "status", label: "Status", type: "select", options: ["Delivered", "In Transit", "Delayed", "High Risk"], required: true },
  ]
  return [
    { key: "crop", label: "Crop", type: "select", options: CROP_DEFINITIONS.map((item) => item.name), required: true },
    { key: "region", label: "Region", type: "select", options: REGIONS, required: true },
    { key: "stage", label: "Supply-chain stage", type: "select", options: ["Harvest / Collection", "Storage", "Transportation", "Delivery"], required: true },
    { key: "quantityLostKg", label: "Loss quantity (kg)", type: "number", min: 0, required: true },
    { key: "recordDate", label: "Record date", type: "date", required: true },
  ]
}

function rowsFor(tab: TabName, shipments: Shipment[], crops: CropDefinition[]): RecordRow[] {
  if (tab === "Crops") {
    return crops.map((crop) => {
      const related = shipments.filter((shipment) => shipment.crop === crop.name)
      const harvested = related.reduce((sum, shipment) => sum + shipment.qtyDispatched + shipment.stageLoss.harvest, 0)
      const lost = related.reduce((sum, shipment) => sum + getLossQuantity(shipment), 0)
      return { id: crop.id, crop: crop.name, category: crop.category, season: crop.season, harvestedTonnes: Number((harvested / 1000).toFixed(1)), lostTonnes: Number((lost / 1000).toFixed(1)), lossPct: harvested ? Number(((lost / harvested) * 100).toFixed(1)) : 0 }
    })
  }
  if (tab === "Harvest Records") return shipments.map((shipment) => ({
    id: `HAR-${shipment.id}`, shipmentId: shipment.id, crop: shipment.crop, farmer: `${shipment.region} Growers Cooperative`, region: shipment.region,
    harvestDate: shipment.dispatchDate, quantityHarvestedKg: shipment.qtyDispatched + shipment.stageLoss.harvest, quality: "Graded",
  }))
  if (tab === "Storage Records") return shipments.map((shipment) => ({
    id: `STR-${shipment.id}`, shipmentId: shipment.id, facility: shipment.facility, crop: shipment.crop, region: shipment.region,
    quantityStoredKg: shipment.qtyDispatched - shipment.stageLoss.harvest, storageDays: shipment.storageDays, quantityLostKg: shipment.stageLoss.storage,
    lossPct: shipment.qtyDispatched ? Number(((shipment.stageLoss.storage / shipment.qtyDispatched) * 100).toFixed(1)) : 0,
  }))
  if (tab === "Transportation Records") return shipments.map((shipment) => ({
    id: `TRN-${shipment.id}`, shipmentId: shipment.id, route: shipment.route, source: shipment.origin, destination: shipment.destination,
    vehicleId: shipment.vehicleId, crop: shipment.crop,
    quantityDispatchedKg: shipment.qtyDispatched - shipment.stageLoss.harvest - shipment.stageLoss.storage,
    quantityReceivedKg: shipment.qtyDispatched - shipment.stageLoss.harvest - shipment.stageLoss.storage - shipment.stageLoss.transportation,
    transitHours: shipment.transitHours, delayStatus: shipment.status === "Delayed" ? "Delayed" : "On time",
  }))
  if (tab === "Shipments") return shipments.map((shipment) => ({
    id: shipment.id, shipmentId: shipment.id, crop: shipment.crop, region: shipment.region, origin: shipment.origin, destination: shipment.destination,
    dispatchDate: shipment.dispatchDate, expectedDate: shipment.expectedDate, qtyDispatched: shipment.qtyDispatched,
    qtyReceived: shipment.qtyReceived, status: shipment.status, lossPct: Number(getLossPercentage(shipment).toFixed(1)),
  }))
  return shipments.flatMap((shipment) => (Object.keys(shipment.stageLoss) as (keyof Shipment["stageLoss"])[]).map((stageKey) => ({
    id: `LOS-${shipment.id}-${stageKey}`, shipmentId: shipment.id, crop: shipment.crop, region: shipment.region,
    stage: getStageName(stageKey), quantityLostKg: shipment.stageLoss[stageKey],
    lossPct: shipment.qtyDispatched ? Number(((shipment.stageLoss[stageKey] / shipment.qtyDispatched) * 100).toFixed(2)) : 0,
    recordDate: shipment.dispatchDate,
  })))
}

function columnsFor(tab: TabName) {
  const columns: Record<TabName, string[]> = {
    Crops: ["id", "crop", "category", "season", "harvestedTonnes", "lostTonnes", "lossPct"],
    "Harvest Records": ["id", "crop", "farmer", "region", "harvestDate", "quantityHarvestedKg", "quality"],
    "Storage Records": ["id", "facility", "crop", "region", "quantityStoredKg", "storageDays", "quantityLostKg", "lossPct"],
    "Transportation Records": ["id", "route", "vehicleId", "crop", "quantityDispatchedKg", "quantityReceivedKg", "transitHours", "delayStatus"],
    Shipments: ["id", "crop", "region", "origin", "destination", "dispatchDate", "qtyDispatched", "qtyReceived", "status", "lossPct"],
    "Loss Records": ["id", "crop", "stage", "region", "quantityLostKg", "lossPct", "recordDate"],
  }
  return columns[tab]
}

function labelFor(key: string) {
  const labels: Record<string, string> = {
    id: "Record ID", crop: "Crop", region: "Region", origin: "Origin", destination: "Destination", dispatchDate: "Dispatch date",
    expectedDate: "Expected date", qtyDispatched: "Dispatched (kg)", qtyReceived: "Received (kg)", status: "Status", lossPct: "Loss %",
    category: "Category", season: "Season", harvestedTonnes: "Harvested (t)", lostTonnes: "Lost (t)", farmer: "Farmer / group",
    harvestDate: "Harvest date", quantityHarvestedKg: "Harvested (kg)", quality: "Quality", facility: "Facility", quantityStoredKg: "Stored (kg)",
    storageDays: "Duration (days)", quantityLostKg: "Lost (kg)", route: "Route", source: "Source", vehicleId: "Vehicle", quantityDispatchedKg: "Dispatched (kg)",
    quantityReceivedKg: "Received (kg)", transitHours: "Transit (hours)", delayStatus: "Delay status", stage: "Stage", recordDate: "Record date",
  }
  return labels[key] ?? titleCase(key)
}

function displayValue(key: string, value: RecordRow[string]) {
  if (value === null || value === undefined || value === "") return "—"
  if (key.toLowerCase().includes("date")) return formatDate(String(value))
  if (key.toLowerCase().includes("kg")) return formatKg(Number(value))
  if (key === "lossPct") return `${Number(value).toFixed(1)}%`
  if (key === "delayStatus") return String(value)
  if (key === "status") return String(value)
  return String(value)
}

function toNumber(value: Record<string, string>, key: string, fallback: number) {
  const number = Number(value[key])
  return Number.isFinite(number) ? number : fallback
}

function newShipment(values: Record<string, string>, shipments: Shipment[], tab: TabName): Shipment {
  const latest = [...shipments].sort((a, b) => b.id.localeCompare(a.id))[0]
  const nextNumber = Number(latest?.id.replace("SHP-", "") ?? 2400) + 1
  const qtyDispatched = Math.max(1, toNumber(values, "qtyDispatched", toNumber(values, "quantityHarvestedKg", toNumber(values, "quantityStoredKg", 18000))))
  let loss = Math.max(0, toNumber(values, "quantityLostKg", Math.round(qtyDispatched * 0.04)))
  if (values.qtyReceived !== undefined) loss = Math.max(0, qtyDispatched - toNumber(values, "qtyReceived", qtyDispatched))
  const route = ROUTES.find((item) => `${item.source} → ${item.destination}` === values.route) ?? ROUTES[0]
  const facility = FACILITIES.find((item) => item.name === values.facility) ?? FACILITIES[0]
  const region = values.region || REGIONS[0]
  const stageLoss = { harvest: Math.round(loss * 0.2), storage: Math.round(loss * 0.35), transportation: Math.round(loss * 0.3), delivery: 0 }
  stageLoss.delivery = Math.max(0, loss - stageLoss.harvest - stageLoss.storage - stageLoss.transportation)
  if (tab === "Loss Records" && values.stage) {
    const picked = getStageKey(values.stage as StageName)
    stageLoss.harvest = 0; stageLoss.storage = 0; stageLoss.transportation = 0; stageLoss.delivery = 0
    stageLoss[picked] = loss
  }
  const dispatchDate = values.dispatchDate || values.harvestDate || values.recordDate || new Date().toISOString().slice(0, 10)
  const status = (values.status || "In Transit") as Shipment["status"]
  return {
    id: `SHP-${String(nextNumber).padStart(4, "0")}`,
    crop: values.crop || CROP_DEFINITIONS[0].name,
    region,
    origin: values.origin || ROUTES.find((item) => item.id === route.id)?.source || "Ludhiana",
    destination: values.destination || route.destination,
    dispatchDate,
    expectedDate: values.expectedDate || dispatchDate,
    actualDate: null,
    qtyDispatched,
    qtyReceived: Math.max(0, qtyDispatched - loss),
    status,
    facilityId: facility.id,
    facility: facility.name,
    routeId: route.id,
    route: `${route.source} → ${route.destination}`,
    vehicleId: values.vehicleId || `VH-${String(510 + nextNumber % 90)}`,
    storageDays: Math.max(0, toNumber(values, "storageDays", 6)),
    transitHours: Math.max(0, toNumber(values, "transitHours", 14)),
    stageLoss,
  }
}

function updateLinkedShipment(tab: TabName, shipment: Shipment, values: Record<string, string>, row: RecordRow): Shipment {
  const next: Shipment = { ...shipment, stageLoss: { ...shipment.stageLoss } }
  if (values.crop) next.crop = values.crop
  if (values.region) next.region = values.region
  if (tab === "Harvest Records") {
    const harvested = toNumber(values, "quantityHarvestedKg", shipment.qtyDispatched + shipment.stageLoss.harvest)
    next.qtyDispatched = Math.max(1, Math.round(harvested - next.stageLoss.harvest))
    if (values.harvestDate) next.dispatchDate = values.harvestDate
  }
  if (tab === "Storage Records") {
    if (values.facility) {
      const facility = FACILITIES.find((item) => item.name === values.facility)
      next.facility = values.facility
      if (facility) next.facilityId = facility.id
    }
    next.storageDays = Math.max(0, toNumber(values, "storageDays", shipment.storageDays))
    next.stageLoss.storage = Math.max(0, Math.round(toNumber(values, "quantityLostKg", shipment.stageLoss.storage)))
  }
  if (tab === "Transportation Records") {
    const route = ROUTES.find((item) => `${item.source} → ${item.destination}` === values.route)
    if (route) { next.route = `${route.source} → ${route.destination}`; next.routeId = route.id }
    next.vehicleId = values.vehicleId || shipment.vehicleId
    next.transitHours = Math.max(0, toNumber(values, "transitHours", shipment.transitHours))
    const afterStorage = shipment.qtyDispatched - shipment.stageLoss.harvest - shipment.stageLoss.storage
    const receivedAtRoute = toNumber(values, "quantityReceivedKg", afterStorage - shipment.stageLoss.transportation)
    next.stageLoss.transportation = Math.max(0, Math.round(afterStorage - receivedAtRoute))
    if (values.delayStatus === "Delayed") next.status = "Delayed"
    if (values.delayStatus === "On time" && shipment.status === "Delayed") next.status = "In Transit"
  }
  if (tab === "Shipments") {
    next.origin = values.origin || shipment.origin
    next.destination = values.destination || shipment.destination
    next.dispatchDate = values.dispatchDate || shipment.dispatchDate
    next.expectedDate = values.expectedDate || shipment.expectedDate
    next.status = (values.status || shipment.status) as Shipment["status"]
    next.qtyDispatched = Math.max(1, Math.round(toNumber(values, "qtyDispatched", shipment.qtyDispatched)))
    const received = Math.max(0, Math.min(next.qtyDispatched, toNumber(values, "qtyReceived", shipment.qtyReceived)))
    const totalLoss = next.qtyDispatched - received
    const oldTotal = sumLosses(shipment.stageLoss)
    const ratio = oldTotal > 0 ? totalLoss / oldTotal : 0
    next.stageLoss = {
      harvest: Math.round(shipment.stageLoss.harvest * ratio),
      storage: Math.round(shipment.stageLoss.storage * ratio),
      transportation: Math.round(shipment.stageLoss.transportation * ratio),
      delivery: 0,
    }
    next.stageLoss.delivery = Math.max(0, totalLoss - sumLosses(next.stageLoss))
  }
  if (tab === "Loss Records") {
    const previousStage = getStageKey(String(row.stage) as StageName)
    const nextStage = getStageKey((values.stage || String(row.stage)) as StageName)
    next.stageLoss[previousStage] = 0
    next.stageLoss[nextStage] = Math.max(0, Math.round(toNumber(values, "quantityLostKg", Number(row.quantityLostKg) || 0)))
  }
  if (tab === "Harvest Records" || tab === "Storage Records" || tab === "Transportation Records" || tab === "Loss Records") {
    const totalLoss = sumLosses(next.stageLoss)
    next.qtyReceived = Math.max(0, next.qtyDispatched - totalLoss)
  }
  return next
}

function RecordDialog({
  state,
  onClose,
  onSave,
}: {
  state: EditorState
  onClose: () => void
  onSave: (values: Record<string, string>) => void
}) {
  const fields = fieldsFor(state.tab)
  const initial = state.row ? Object.fromEntries(fields.map((field) => [field.key, String(state.row?.[field.key] ?? "")])) : {}
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [error, setError] = useState("")
  const readOnly = state.mode === "view"

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="record-modal" role="dialog" aria-modal="true" aria-labelledby="record-modal-title">
        <div className="modal-heading"><div><span className="modal-eyebrow">{state.tab}</span><h2 id="record-modal-title">{state.mode === "add" ? "Add new record" : state.mode === "edit" ? "Edit record" : "Record details"}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X /></button></div>
        <form onSubmit={(event) => { event.preventDefault(); const missing = fields.find((field) => field.required && !String(values[field.key] ?? "").trim()); if (missing) { setError(`${missing.label} is required.`); return } onSave(values) }}>
          <div className="record-form-grid">
            {fields.map((field) => <label className="form-field" key={field.key}>
              <span>{field.label}{field.required && <em> *</em>}</span>
              {field.type === "select" ? <select disabled={readOnly} required={field.required} value={values[field.key] ?? field.options?.[0] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}>
                {field.options?.map((option) => <option key={option}>{option}</option>)}
              </select> : <input disabled={readOnly} required={field.required} type={field.type ?? "text"} min={field.min} step={field.step ?? (field.type === "number" ? "any" : undefined)} value={values[field.key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} />}
            </label>)}
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-footer"><p>Changes update the shared sample records and analytics.</p><div>{!readOnly && <button className="button-primary" type="submit"><Plus />{state.mode === "add" ? "Add record" : "Save changes"}</button>}<button className="button-quiet" type="button" onClick={onClose}>{readOnly ? "Close" : "Cancel"}</button></div></div>
        </form>
      </section>
    </div>
  )
}

export function RecordsView({
  shipments,
  crops,
  onChangeShipments,
  onChangeCrops,
  onNotify,
}: {
  shipments: Shipment[]
  crops: CropDefinition[]
  onChangeShipments: (next: Shipment[]) => void
  onChangeCrops: (next: CropDefinition[]) => void
  onNotify: (message: string) => void
}) {
  const [activeTab, setActiveTab] = useState<TabName>("Shipments")
  const [search, setSearch] = useState("")
  const [cropFilter, setCropFilter] = useState("All crops")
  const [regionFilter, setRegionFilter] = useState("All regions")
  const [statusFilter, setStatusFilter] = useState("All statuses")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sort, setSort] = useState<{ key: string; direction: "asc" | "desc" }>({ key: "id", direction: "desc" })
  const [page, setPage] = useState(1)
  const [editor, setEditor] = useState<EditorState | null>(null)

  const rows = useMemo(() => rowsFor(activeTab, shipments, crops), [activeTab, shipments, crops])
  const columns = columnsFor(activeTab)
  const filtered = useMemo(() => rows.filter((row) => {
    const textMatch = !search || Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(search.toLowerCase()))
    const cropValue = String(row.crop ?? row.name ?? "")
    const regionValue = String(row.region ?? "")
    const statusValue = String(row.status ?? row.delayStatus ?? "")
    const dateValue = String(row.dispatchDate ?? row.harvestDate ?? row.recordDate ?? "")
    return textMatch && (cropFilter === "All crops" || !cropValue || cropValue === cropFilter) &&
      (regionFilter === "All regions" || !regionValue || regionValue === regionFilter) &&
      (statusFilter === "All statuses" || !statusValue || statusValue === statusFilter) &&
      (!dateFrom || !dateValue || dateValue >= dateFrom) && (!dateTo || !dateValue || dateValue <= dateTo)
  }), [rows, search, cropFilter, regionFilter, statusFilter, dateFrom, dateTo])
  const sortedRows = useMemo(() => [...filtered].sort((a, b) => {
    const left = a[sort.key]
    const right = b[sort.key]
    const comparison = typeof left === "number" && typeof right === "number" ? left - right : String(left ?? "").localeCompare(String(right ?? ""), undefined, { numeric: true })
    return sort.direction === "asc" ? comparison : -comparison
  }), [filtered, sort])
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE))
  const visibleRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function saveRecord(values: Record<string, string>) {
    if (!editor) return
    if (editor.tab === "Crops") {
      if (editor.mode === "add") {
        const next: CropDefinition = { id: `CR-${String(crops.length + 1).padStart(3, "0")}`, name: values.crop.trim(), category: values.category as CropDefinition["category"], season: values.season }
        onChangeCrops([...crops, next])
        onNotify(`${next.name} was added to the crop catalog.`)
      } else if (editor.row) {
        const oldName = String(editor.row.crop)
        const nextName = values.crop.trim()
        onChangeCrops(crops.map((crop) => crop.name === oldName ? { ...crop, name: nextName, category: values.category as CropDefinition["category"], season: values.season } : crop))
        onChangeShipments(shipments.map((shipment) => shipment.crop === oldName ? { ...shipment, crop: nextName } : shipment))
        onNotify(`${nextName} was updated across linked records.`)
      }
    } else if (editor.mode === "add") {
      onChangeShipments([...shipments, newShipment(values, shipments, editor.tab)])
      onNotify(`A new ${editor.tab.toLowerCase()} record was added.`)
    } else if (editor.row?.shipmentId) {
      const linked = shipments.find((shipment) => shipment.id === editor?.row?.shipmentId)
      if (linked) {
        const updated = updateLinkedShipment(editor.tab, linked, values, editor.row)
        onChangeShipments(shipments.map((shipment) => shipment.id === updated.id ? updated : shipment))
        onNotify(`${editor.row.id} was updated. Related analytics refreshed.`)
      }
    }
    setEditor(null)
  }

  function deleteRecord(row: RecordRow) {
    if (!window.confirm(`Delete ${row.id}? This change will update linked sample analytics.`)) return
    if (activeTab === "Crops") {
      const cropName = String(row.crop)
      onChangeCrops(crops.filter((crop) => crop.name !== cropName))
      onChangeShipments(shipments.filter((shipment) => shipment.crop !== cropName))
    } else if (activeTab === "Loss Records" && row.shipmentId) {
      const shipment = shipments.find((item) => item.id === row.shipmentId)
      if (shipment) {
        const key = getStageKey(String(row.stage) as StageName)
        const stageLoss = { ...shipment.stageLoss, [key]: 0 }
        const updated = { ...shipment, stageLoss, qtyReceived: Math.max(0, shipment.qtyDispatched - sumLosses(stageLoss)) }
        onChangeShipments(shipments.map((item) => item.id === updated.id ? updated : item))
      }
    } else if (row.shipmentId) {
      onChangeShipments(shipments.filter((shipment) => shipment.id !== row.shipmentId))
    }
    onNotify(`${row.id} was deleted.`)
  }

  function onTabChange(tab: TabName) {
    setActiveTab(tab); setPage(1); setSearch("")
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div><div className="eyebrow"><span className="eyebrow-line" /> DATA MANAGEMENT</div><h1>Supply chain records</h1><p>Manage the records behind your produce and loss analytics.</p></div>
        <button className="button-primary" onClick={() => setEditor({ mode: "add", tab: activeTab })}><Plus />Add new record</button>
      </div>
      <Card className="records-card">
        <div className="record-tabs" role="tablist" aria-label="Record categories">
          {TABS.map((tab) => <button key={tab} role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? "record-tab active" : "record-tab"} onClick={() => onTabChange(tab)}>{tab}<span>{rowsFor(tab, shipments, crops).length}</span></button>)}
        </div>
        <div className="table-toolbar records-toolbar">
          <label className="search-control"><Search /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search records..." aria-label="Search records" /></label>
          <div className="toolbar-filters">
            <label className="filter-select"><select value={cropFilter} onChange={(event) => { setCropFilter(event.target.value); setPage(1) }}><option>All crops</option>{crops.map((crop) => <option key={crop.id}>{crop.name}</option>)}</select><ChevronDown /></label>
            <label className="filter-select"><select value={regionFilter} onChange={(event) => { setRegionFilter(event.target.value); setPage(1) }}><option>All regions</option>{REGIONS.map((region) => <option key={region}>{region}</option>)}</select><ChevronDown /></label>
            <label className="filter-select"><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1) }}><option>All statuses</option><option>Delivered</option><option>In Transit</option><option>Delayed</option><option>High Risk</option><option>On time</option></select><ChevronDown /></label>
            <div className="date-filter-pair"><label><span className="sr-only">From date</span><input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1) }} /></label><span>to</span><label><span className="sr-only">To date</span><input type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1) }} /></label></div>
          </div>
        </div>
        <div className="table-scroll records-table-scroll">
          <table className="data-table records-table"><thead><tr>{columns.map((column) => <th key={column}><button className="sort-button" onClick={() => setSort((current) => ({ key: column, direction: current.key === column && current.direction === "asc" ? "desc" : "asc" }))}>{labelFor(column)}<span>{sort.key === column ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}</span></button></th>)}<th className="actions-header">Actions</th></tr></thead>
            <tbody>{visibleRows.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column} className={column === "id" ? "id-cell" : ""}>
              {column === "status" || column === "delayStatus" ? <span className={`status-pill ${String(row[column]).toLowerCase().replaceAll(" ", "-")}`}><i />{displayValue(column, row[column])}</span> : column === "lossPct" ? <span className={Number(row[column]) >= 5 ? "loss-high" : "loss-normal"}>{displayValue(column, row[column])}</span> : displayValue(column, row[column])}
            </td>)}<td><div className="row-actions"><button className="icon-button" aria-label={`View ${row.id}`} title="View details" onClick={() => setEditor({ mode: "view", tab: activeTab, row })}><Eye /></button><button className="icon-button" aria-label={`Edit ${row.id}`} title="Edit record" onClick={() => setEditor({ mode: "edit", tab: activeTab, row })}><Pencil /></button><button className="icon-button danger-icon" aria-label={`Delete ${row.id}`} title="Delete record" onClick={() => deleteRecord(row)}><Trash2 /></button></div></td></tr>)}
              {visibleRows.length === 0 && <tr><td className="empty-cell" colSpan={columns.length + 1}>No records found. Adjust the filters or add a record.</td></tr>}</tbody></table>
        </div>
        <div className="table-footer"><span>Showing <strong>{sortedRows.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, sortedRows.length)}</strong> of <strong>{sortedRows.length}</strong> records</span><div className="pagination"><button className="icon-button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft /></button><span>Page {page} of {pageCount}</span><button className="icon-button" aria-label="Next page" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}><ChevronRight /></button></div></div>
      </Card>
      {editor && <RecordDialog key={`${editor.mode}-${editor.tab}-${editor.row?.id ?? "new"}`} state={editor} onClose={() => setEditor(null)} onSave={saveRecord} />}
    </div>
  )
}
