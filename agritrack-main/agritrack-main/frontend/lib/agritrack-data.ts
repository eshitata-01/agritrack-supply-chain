export type ShipmentStatus = "Delivered" | "In Transit" | "Delayed" | "High Risk"
export type StageName = "Harvest / Collection" | "Storage" | "Transportation" | "Delivery"

export type StageLoss = Record<"harvest" | "storage" | "transportation" | "delivery", number>

export type Shipment = {
  id: string
  crop: string
  region: string
  origin: string
  destination: string
  dispatchDate: string
  expectedDate: string
  actualDate: string | null
  qtyDispatched: number
  qtyReceived: number
  status: ShipmentStatus
  facilityId: string
  facility: string
  routeId: string
  route: string
  vehicleId: string
  storageDays: number
  transitHours: number
  stageLoss: StageLoss
}

export type CropDefinition = {
  id: string
  name: string
  category: "Grain" | "Vegetable" | "Fruit"
  season: string
}

export type RecordValue = string | number | boolean | null | undefined
export type RecordRow = Record<string, RecordValue> & { id: string; shipmentId?: string }

export function getLossQuantity(shipment: Shipment) {
  return Math.max(0, shipment.qtyDispatched - shipment.qtyReceived)
}

export function getLossPercentage(shipment: Shipment) {
  return shipment.qtyDispatched > 0 ? (getLossQuantity(shipment) / shipment.qtyDispatched) * 100 : 0
}

export function sumLosses(losses: StageLoss) {
  return losses.harvest + losses.storage + losses.transportation + losses.delivery
}

export function getStageName(key: keyof StageLoss): StageName {
  const names: Record<keyof StageLoss, StageName> = {
    harvest: "Harvest / Collection",
    storage: "Storage",
    transportation: "Transportation",
    delivery: "Delivery",
  }
  return names[key]
}

export function getStageKey(name: StageName): keyof StageLoss {
  const keys: Record<StageName, keyof StageLoss> = {
    "Harvest / Collection": "harvest",
    Storage: "storage",
    Transportation: "transportation",
    Delivery: "delivery",
  }
  return keys[name]
}

export function formatTonnes(kilograms: number, digits = 1) {
  return (kilograms / 1000).toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

export function formatKg(kilograms: number) {
  return Math.round(kilograms).toLocaleString("en-IN")
}

export function formatDate(value: string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`))
}

export function getMonthlyTrend(shipments: Shipment[]) {
  const grouped = new Map<string, { month: string; lossKg: number; collectedKg: number }>()
  for (const shipment of shipments) {
    const key = shipment.dispatchDate.slice(0, 7)
    const existing = grouped.get(key) ?? {
      month: new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(`${key}-01T00:00:00`)),
      lossKg: 0,
      collectedKg: 0,
    }
    existing.lossKg += getLossQuantity(shipment)
    existing.collectedKg += shipment.qtyDispatched
    grouped.set(key, existing)
  }
  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => ({
    month: value.month,
    loss: Number((value.lossKg / 1000).toFixed(2)),
    collected: Number((value.collectedKg / 1000).toFixed(1)),
  }))
}

export function getCropTotals(shipments: Shipment[]) {
  const grouped = new Map<string, { crop: string; collectedKg: number; lostKg: number; shipments: number }>()
  for (const shipment of shipments) {
    const item = grouped.get(shipment.crop) ?? { crop: shipment.crop, collectedKg: 0, lostKg: 0, shipments: 0 }
    item.collectedKg += shipment.qtyDispatched
    item.lostKg += getLossQuantity(shipment)
    item.shipments += 1
    grouped.set(shipment.crop, item)
  }
  return [...grouped.values()].map((item) => ({ ...item, lossPct: item.collectedKg ? (item.lostKg / item.collectedKg) * 100 : 0 }))
    .sort((a, b) => b.lostKg - a.lostKg)
}

export function getStageTotals(shipments: Shipment[]) {
  const totals: Record<StageName, number> = {
    "Harvest / Collection": 0,
    Storage: 0,
    Transportation: 0,
    Delivery: 0,
  }
  for (const shipment of shipments) {
    for (const key of Object.keys(shipment.stageLoss) as (keyof StageLoss)[]) {
      totals[getStageName(key)] += shipment.stageLoss[key]
    }
  }
  return Object.entries(totals).map(([stage, lossKg]) => ({ stage, lossKg, lossTonnes: Number((lossKg / 1000).toFixed(2)) }))
    .sort((a, b) => b.lossKg - a.lossKg)
}

export function getRegionTotals(shipments: Shipment[]) {
  const grouped = new Map<string, { region: string; lossKg: number; collectedKg: number }>()
  for (const shipment of shipments) {
    const item = grouped.get(shipment.region) ?? { region: shipment.region, lossKg: 0, collectedKg: 0 }
    item.lossKg += getLossQuantity(shipment)
    item.collectedKg += shipment.qtyDispatched
    grouped.set(shipment.region, item)
  }
  return [...grouped.values()].map((item) => ({ ...item, lossTonnes: Number((item.lossKg / 1000).toFixed(2)), lossPct: item.collectedKg ? (item.lossKg / item.collectedKg) * 100 : 0 }))
    .sort((a, b) => b.lossKg - a.lossKg)
}

export function getFacilityTotals(shipments: Shipment[]) {
  const grouped = new Map<string, { facilityId: string; facility: string; location: string; region: string; crop: string; quantityStoredKg: number; lossKg: number; storageDays: number; records: number }>()
  for (const shipment of shipments) {
    const facility = { location: shipment.region }
    const item = grouped.get(shipment.facilityId) ?? {
      facilityId: shipment.facilityId,
      facility: shipment.facility,
      location: facility?.location ?? shipment.region,
      region: shipment.region,
      crop: shipment.crop,
      quantityStoredKg: 0,
      lossKg: 0,
      storageDays: 0,
      records: 0,
    }
    item.quantityStoredKg += Math.max(0, shipment.qtyDispatched - shipment.stageLoss.harvest)
    item.lossKg += shipment.stageLoss.storage
    item.storageDays += shipment.storageDays
    item.records += 1
    grouped.set(shipment.facilityId, item)
  }
  return [...grouped.values()].map((item) => ({
    ...item,
    lossPct: item.quantityStoredKg ? (item.lossKg / item.quantityStoredKg) * 100 : 0,
    averageDays: item.records ? item.storageDays / item.records : 0,
  })).sort((a, b) => b.lossPct - a.lossPct)
}

export function getRouteTotals(shipments: Shipment[]) {
  const grouped = new Map<string, { routeId: string; route: string; source: string; destination: string; lossKg: number; dispatchedKg: number; receivedKg: number; hours: number; delayed: number; records: number }>()
  for (const shipment of shipments) {
    const item = grouped.get(shipment.routeId) ?? {
      routeId: shipment.routeId,
      route: shipment.route,
      source: shipment.route.split(" → ")[0],
      destination: shipment.route.split(" → ")[1] ?? "—",
      lossKg: 0,
      dispatchedKg: 0,
      receivedKg: 0,
      hours: 0,
      delayed: 0,
      records: 0,
    }
    item.lossKg += shipment.stageLoss.transportation
    item.dispatchedKg += shipment.qtyDispatched
    item.receivedKg += shipment.qtyReceived
    item.hours += shipment.transitHours
    item.delayed += shipment.status === "Delayed" ? 1 : 0
    item.records += 1
    grouped.set(shipment.routeId, item)
  }
  return [...grouped.values()].map((item) => ({
    ...item,
    lossTonnes: Number((item.lossKg / 1000).toFixed(2)),
    lossPct: item.dispatchedKg ? (item.lossKg / item.dispatchedKg) * 100 : 0,
    averageHours: item.records ? item.hours / item.records : 0,
  })).sort((a, b) => b.lossKg - a.lossKg)
}

export function getShipmentStatus(shipment: Shipment) {
  if (getLossPercentage(shipment) >= 7) return "High Risk"
  return shipment.status
}
