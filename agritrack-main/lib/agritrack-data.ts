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

export const CROP_DEFINITIONS: CropDefinition[] = [
  { id: "CR-001", name: "Rice", category: "Grain", season: "Kharif" },
  { id: "CR-002", name: "Wheat", category: "Grain", season: "Rabi" },
  { id: "CR-003", name: "Tomatoes", category: "Vegetable", season: "Summer" },
  { id: "CR-004", name: "Potatoes", category: "Vegetable", season: "Rabi" },
  { id: "CR-005", name: "Onions", category: "Vegetable", season: "Rabi" },
  { id: "CR-006", name: "Mangoes", category: "Fruit", season: "Summer" },
]

export const REGIONS = ["Punjab", "Maharashtra", "Karnataka", "Uttar Pradesh", "West Bengal"]

export const FACILITIES = [
  { id: "ST-101", name: "Green Valley Cold Store", location: "Ludhiana, Punjab" },
  { id: "ST-102", name: "Deccan Fresh Hub", location: "Nashik, Maharashtra" },
  { id: "ST-103", name: "Mysuru Agri Depot", location: "Mysuru, Karnataka" },
  { id: "ST-104", name: "Ganga Grain Terminal", location: "Kanpur, Uttar Pradesh" },
  { id: "ST-105", name: "Bengal Produce Centre", location: "Siliguri, West Bengal" },
]

export const ROUTES = [
  { id: "RT-201", source: "Ludhiana", destination: "Delhi" },
  { id: "RT-202", source: "Nashik", destination: "Mumbai" },
  { id: "RT-203", source: "Mysuru", destination: "Bengaluru" },
  { id: "RT-204", source: "Kanpur", destination: "Lucknow" },
  { id: "RT-205", source: "Siliguri", destination: "Kolkata" },
  { id: "RT-206", source: "Ludhiana", destination: "Jaipur" },
  { id: "RT-207", source: "Nashik", destination: "Pune" },
  { id: "RT-208", source: "Mysuru", destination: "Chennai" },
]

const MONTHS = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"]
const QUANTITIES = [18400, 12600, 22800, 15400, 19700, 13200, 24600, 16800, 21800, 14300, 17600, 23900, 14900, 20500, 16200, 23100, 18700, 12800, 25200, 17100, 19300, 22200, 13800, 21400]
const LOSS_RATES = [2.1, 4.8, 3.2, 6.7, 2.9, 5.4, 7.2, 3.8, 4.1, 8.6, 2.5, 5.9, 3.4, 6.2, 4.6, 7.8, 2.7, 5.2, 9.1, 3.1, 4.4, 6.5, 2.3, 7.1]
const STATUS_SEQUENCE: ShipmentStatus[] = ["Delivered", "Delivered", "In Transit", "Delayed", "Delivered", "High Risk", "Delivered", "In Transit", "Delivered", "High Risk", "Delayed", "Delivered", "In Transit", "Delivered", "High Risk", "Delivered", "Delayed", "In Transit", "High Risk", "Delivered", "Delivered", "Delayed", "In Transit", "High Risk"]
const REGIONS_FOR_SHIPMENTS = ["Punjab", "Maharashtra", "Karnataka", "Uttar Pradesh", "West Bengal"]
const ORIGINS = ["Amritsar", "Nashik", "Mysuru", "Kanpur", "Siliguri"]
const DESTINATIONS = ["Delhi", "Mumbai", "Bengaluru", "Lucknow", "Kolkata"]

function dateString(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function getStageLosses(totalLoss: number, seed: number): StageLoss {
  const harvest = Math.round(totalLoss * (0.16 + (seed % 3) * 0.025))
  const storage = Math.round(totalLoss * (0.31 + (seed % 4) * 0.018))
  const transportation = Math.round(totalLoss * (0.27 + (seed % 2) * 0.04))
  return {
    harvest,
    storage,
    transportation,
    delivery: Math.max(0, totalLoss - harvest - storage - transportation),
  }
}

export function createSeedShipments(): Shipment[] {
  return QUANTITIES.map((qtyDispatched, index) => {
    const monthIndex = Math.floor(index / 2)
    const month = (11 + monthIndex) % 12
    const year = monthIndex === 0 ? 2025 : 2026
    const day = index % 2 === 0 ? 5 : 18
    const crop = CROP_DEFINITIONS[(index * 5 + Math.floor(index / 3)) % CROP_DEFINITIONS.length].name
    const regionIndex = index % REGIONS_FOR_SHIPMENTS.length
    const facility = FACILITIES[(index * 3 + 1) % FACILITIES.length]
    const route = ROUTES[(index * 5 + Math.floor(index / 4)) % ROUTES.length]
    const loss = Math.round((qtyDispatched * LOSS_RATES[index]) / 100)
    const status = LOSS_RATES[index] >= 7 ? "High Risk" : STATUS_SEQUENCE[index]
    const dispatchDate = dateString(year, month, day)
    const expectedDate = dateString(year, month, Math.min(day + 5, 28))
    const delivered = status === "Delivered" || status === "Delayed"
    const actualDate = delivered
      ? dateString(year, month, Math.min(day + (status === "Delayed" ? 8 : 4), 28))
      : null

    return {
      id: `SHP-${String(2401 + index).padStart(4, "0")}`,
      crop,
      region: REGIONS_FOR_SHIPMENTS[regionIndex],
      origin: ORIGINS[regionIndex],
      destination: DESTINATIONS[regionIndex],
      dispatchDate,
      expectedDate,
      actualDate,
      qtyDispatched,
      qtyReceived: qtyDispatched - loss,
      status,
      facilityId: facility.id,
      facility: facility.name,
      routeId: route.id,
      route: `${route.source} → ${route.destination}`,
      vehicleId: `VH-${String(510 + (index * 7) % 90)}`,
      storageDays: 2 + ((index * 3) % 17),
      transitHours: 6 + ((index * 11) % 39),
      stageLoss: getStageLosses(loss, index),
    }
  })
}

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
    const facility = FACILITIES.find((item) => item.id === shipment.facilityId)
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
