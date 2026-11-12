"use client"

import { useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts"
import { ArrowDownRight, ArrowUpRight, Search, Warehouse, Route, PackageOpen, Percent } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { FACILITIES, REGIONS, formatDate, formatKg, formatTonnes, getCropTotals, getFacilityTotals, getLossPercentage, getLossQuantity, getRegionTotals, getRouteTotals, type Shipment } from "@/lib/agritrack-data"

type FilterState = { crop: string; region: string; from: string; to: string; query: string }
const emptyFilters: FilterState = { crop: "All crops", region: "All regions", from: "", to: "", query: "" }

function useShipmentFilters(shipments: Shipment[]) {
  const [filters, setFilters] = useState<FilterState>(emptyFilters)
  const filtered = useMemo(() => shipments.filter((shipment) =>
    (filters.crop === "All crops" || shipment.crop === filters.crop) &&
    (filters.region === "All regions" || shipment.region === filters.region) &&
    (!filters.from || shipment.dispatchDate >= filters.from) &&
    (!filters.to || shipment.dispatchDate <= filters.to) &&
    (!filters.query || `${shipment.crop} ${shipment.region} ${shipment.facility} ${shipment.route} ${shipment.id}`.toLowerCase().includes(filters.query.toLowerCase()))
  ), [shipments, filters])
  return { filters, setFilters, filtered }
}

function FiltersBar({ filters, setFilters, crops, showCrop = true }: { filters: FilterState; setFilters: (next: FilterState) => void; crops: string[]; showCrop?: boolean }) {
  return <div className="analytics-filterbar">
    <label className="search-control"><Search /><input value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder="Search this view..." aria-label="Search this view" /></label>
    {showCrop && <label className="filter-select"><select value={filters.crop} onChange={(event) => setFilters({ ...filters, crop: event.target.value })}><option>All crops</option>{crops.map((crop) => <option key={crop}>{crop}</option>)}</select></label>}
    <label className="filter-select"><select value={filters.region} onChange={(event) => setFilters({ ...filters, region: event.target.value })}><option>All regions</option>{REGIONS.map((region) => <option key={region}>{region}</option>)}</select></label>
    <div className="date-filter-pair"><label><span className="sr-only">From date</span><input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label><span>to</span><label><span className="sr-only">To date</span><input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label></div>
    {(filters.crop !== "All crops" || filters.region !== "All regions" || filters.from || filters.to || filters.query) && <button className="clear-filters" onClick={() => setFilters(emptyFilters)}>Clear filters</button>}
  </div>
}

function StatTile({ label, value, unit, note, icon: Icon, tone = "green" }: { label: string; value: string; unit?: string; note: string; icon: typeof Warehouse; tone?: string }) {
  return <Card className="analytics-stat"><CardContent><div className={`analytics-stat-icon ${tone}`}><Icon /></div><span className="analytics-stat-label">{label}</span><strong>{value}<small>{unit}</small></strong><span className="analytics-stat-note">{note}</span></CardContent></Card>
}

function Table({ columns, rows, emptyText = "No matching records." }: { columns: { key: string; label: string; format?: (value: unknown, row: Record<string, unknown>) => React.ReactNode }[]; rows: Record<string, unknown>[]; emptyText?: string }) {
  return <div className="table-scroll"><table className="data-table analytics-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>
    {rows.map((row, index) => <tr key={String(row.id ?? index)}>{columns.map((column) => <td key={column.key}>{column.format ? column.format(row[column.key], row) : String(row[column.key] ?? "—")}</td>)}</tr>)}
    {!rows.length && <tr><td className="empty-cell" colSpan={columns.length}>{emptyText}</td></tr>}
  </tbody></table></div>
}

const chartConfig = { lossTonnes: { label: "Loss (t)", color: "var(--chart-1)" }, lossPct: { label: "Loss %", color: "var(--chart-2)" } }

export function CropAnalyticsView({ shipments, crops }: { shipments: Shipment[]; crops: string[] }) {
  const { filters, setFilters, filtered } = useShipmentFilters(shipments)
  const cropRows = getCropTotals(filtered)
  const collected = filtered.reduce((sum, shipment) => sum + shipment.qtyDispatched, 0)
  const lost = filtered.reduce((sum, shipment) => sum + getLossQuantity(shipment), 0)
  const avgLoss = collected ? (lost / collected) * 100 : 0
  const topCrop = cropRows[0]
  return <div className="page-stack">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> CROP PERFORMANCE</div><h1>Crop analytics</h1><p>Compare harvested quantities and identify crops with the greatest recorded loss.</p></div><span className="data-source-badge"><i /> Live sample data</span></div>
    <FiltersBar filters={filters} setFilters={setFilters} crops={crops} />
    <section className="analytics-stat-grid">
      <StatTile label="Crops analyzed" value={String(new Set(filtered.map((item) => item.crop)).size)} note="Crop types in this selection" icon={PackageOpen} />
      <StatTile label="Quantity harvested" value={formatTonnes(collected)} unit="t" note="Across selected records" icon={PackageOpen} tone="sage" />
      <StatTile label="Quantity lost" value={formatTonnes(lost)} unit="t" note="Dispatched less received" icon={ArrowDownRight} tone="amber" />
      <StatTile label="Average loss rate" value={`${avgLoss.toFixed(1)}%`} note={topCrop ? `${topCrop.crop} has the highest total loss` : "No records in selection"} icon={Percent} tone="red" />
    </section>
    <div className="analytics-two-col">
      <Card className="chart-card analytics-chart-card"><CardHeader className="chart-card-header"><div><CardTitle>Crop loss ranking</CardTitle><p className="card-subtitle">Lost quantity in tonnes, ranked highest first</p></div></CardHeader><CardContent className="chart-card-content"><ChartContainer config={chartConfig} className="chart-frame analytics-bar-frame"><BarChart data={[...cropRows].reverse().map((item) => ({ crop: item.crop, lossTonnes: Number((item.lostKg / 1000).toFixed(2)) }))} layout="vertical" margin={{ left: 8, right: 12 }}><CartesianGrid strokeDasharray="3 5" horizontal={false} stroke="var(--border)" /><XAxis type="number" axisLine={false} tickLine={false} /><YAxis type="category" dataKey="crop" axisLine={false} tickLine={false} width={78} /><Tooltip content={<ChartTooltipContent />} /><Bar dataKey="lossTonnes" fill="var(--color-lossTonnes)" radius={[0, 5, 5, 0]} barSize={19} /></BarChart></ChartContainer></CardContent></Card>
      <Card className="table-card ranking-card"><div className="section-card-heading"><div><h2>Highest-loss crops</h2><p>Ranked by total loss quantity</p></div><span className="rank-caption">{cropRows.length} crops</span></div><Table columns={[{ key: "rank", label: "Rank" }, { key: "crop", label: "Crop" }, { key: "harvested", label: "Harvested" }, { key: "lost", label: "Lost" }, { key: "lossPct", label: "Loss rate", format: (value) => <span className={Number(value) >= 5 ? "loss-high" : "loss-normal"}>{Number(value).toFixed(1)}%</span> }]} rows={cropRows.map((row, index) => ({ id: row.crop, rank: `0${index + 1}`, crop: row.crop, harvested: `${formatTonnes(row.collectedKg)} t`, lost: `${formatTonnes(row.lostKg)} t`, lossPct: row.lossPct }))} /></Card>
    </div>
    <Card className="note-card"><span className="note-mark">i</span><p>Loss percentage is calculated as <strong>(quantity dispatched − quantity received) ÷ quantity dispatched × 100</strong>. Stage losses are used for stage analysis and are not added again to the overall loss.</p></Card>
  </div>
}

export function StorageMonitoringView({ shipments, crops }: { shipments: Shipment[]; crops: string[] }) {
  const { filters, setFilters, filtered } = useShipmentFilters(shipments)
  const facilities = getFacilityTotals(filtered)
  const totalLoss = filtered.reduce((sum, shipment) => sum + shipment.stageLoss.storage, 0)
  const avgDays = filtered.length ? filtered.reduce((sum, item) => sum + item.storageDays, 0) / filtered.length : 0
  const top = facilities[0]
  const scatter = filtered.map((shipment) => ({ duration: shipment.storageDays, lossPct: shipment.qtyDispatched ? (shipment.stageLoss.storage / shipment.qtyDispatched) * 100 : 0, crop: shipment.crop, facility: shipment.facility }))
  return <div className="page-stack">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> POST-HARVEST CONDITIONS</div><h1>Storage monitoring</h1><p>Review facility performance, storage duration, and recorded deterioration.</p></div><span className="data-source-badge"><i /> {FACILITIES.length} facilities</span></div>
    <FiltersBar filters={filters} setFilters={setFilters} crops={crops} />
    <section className="analytics-stat-grid">
      <StatTile label="Active facilities" value={String(facilities.length)} note="With selected storage records" icon={Warehouse} />
      <StatTile label="Produce stored" value={formatTonnes(filtered.reduce((sum, item) => sum + Math.max(0, item.qtyDispatched - item.stageLoss.harvest), 0))} unit="t" note="After harvest-stage loss" icon={PackageOpen} tone="sage" />
      <StatTile label="Storage loss" value={formatTonnes(totalLoss)} unit="t" note="Recorded at storage stage" icon={ArrowDownRight} tone="amber" />
      <StatTile label="Highest loss facility" value={top?.facility ?? "—"} note={top ? `${top.lossPct.toFixed(1)}% of stored quantity` : "No facility records"} icon={Percent} tone="red" />
    </section>
    <div className="analytics-two-col">
      <Card className="chart-card analytics-chart-card"><CardHeader className="chart-card-header"><div><CardTitle>Facility loss comparison</CardTitle><p className="card-subtitle">Storage-stage loss in tonnes</p></div></CardHeader><CardContent className="chart-card-content"><ChartContainer config={chartConfig} className="chart-frame analytics-bar-frame"><BarChart data={[...facilities].reverse().map((item) => ({ facility: item.facility.replace(" ", "\n"), lossTonnes: Number((item.lossKg / 1000).toFixed(2)) }))} layout="vertical" margin={{ left: 8, right: 12 }}><CartesianGrid strokeDasharray="3 5" horizontal={false} stroke="var(--border)" /><XAxis type="number" axisLine={false} tickLine={false} /><YAxis type="category" dataKey="facility" axisLine={false} tickLine={false} width={134} /><Tooltip content={<ChartTooltipContent />} /><Bar dataKey="lossTonnes" fill="var(--color-lossTonnes)" radius={[0, 5, 5, 0]} barSize={18} /></BarChart></ChartContainer></CardContent></Card>
      <Card className="chart-card analytics-chart-card"><CardHeader className="chart-card-header"><div><CardTitle>Duration vs. storage loss</CardTitle><p className="card-subtitle">Each point represents one shipment record</p></div></CardHeader><CardContent className="chart-card-content"><ChartContainer config={chartConfig} className="chart-frame analytics-bar-frame"><ScatterChart margin={{ left: -10, right: 16, bottom: 3 }}><CartesianGrid strokeDasharray="3 5" stroke="var(--border)" /><XAxis type="number" dataKey="duration" name="Storage days" unit="d" axisLine={false} tickLine={false} /><YAxis type="number" dataKey="lossPct" name="Storage loss" unit="%" axisLine={false} tickLine={false} /><Tooltip cursor={{ strokeDasharray: "3 3" }} content={<ChartTooltipContent />} /><Scatter data={scatter} fill="var(--chart-1)" /></ScatterChart></ChartContainer></CardContent></Card>
    </div>
    <Card className="table-card"><div className="section-card-heading"><div><h2>Facility performance</h2><p>Facilities with unusually high loss are highlighted for review</p></div><span className="rank-caption">Avg. storage duration {avgDays.toFixed(1)} days</span></div><Table columns={[{ key: "facilityId", label: "Facility ID" }, { key: "facility", label: "Facility" }, { key: "location", label: "Location" }, { key: "crop", label: "Crop" }, { key: "quantity", label: "Quantity stored" }, { key: "averageDays", label: "Avg. days" }, { key: "loss", label: "Quantity lost" }, { key: "lossPct", label: "Loss rate" }]} rows={facilities.map((item) => ({ id: item.facilityId, facilityId: item.facilityId, facility: item.facility, location: item.location, crop: item.crop, quantity: `${formatKg(item.quantityStoredKg)} kg`, averageDays: `${item.averageDays.toFixed(1)} days`, loss: `${formatKg(item.lossKg)} kg`, lossPct: `${item.lossPct.toFixed(1)}%` }))} /></Card>
    <Card className="note-card"><span className="note-mark">!</span><p>{top ? <><strong>{top.facility}</strong> currently has the highest storage loss rate in this selection ({top.lossPct.toFixed(1)}%).</> : "No storage data matches the current filters."} This observation is descriptive and based on recorded sample values.</p></Card>
  </div>
}

export function TransportationView({ shipments, crops }: { shipments: Shipment[]; crops: string[] }) {
  const { filters, setFilters, filtered } = useShipmentFilters(shipments)
  const routes = getRouteTotals(filtered)
  const delayed = filtered.filter((item) => item.status === "Delayed")
  const onTime = filtered.filter((item) => item.status !== "Delayed")
  const lossRate = (records: Shipment[]) => records.reduce((sum, item) => sum + item.stageLoss.transportation, 0) / Math.max(1, records.reduce((sum, item) => sum + item.qtyDispatched, 0)) * 100
  const highest = routes[0]
  return <div className="page-stack">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> IN-TRANSIT PERFORMANCE</div><h1>Transportation</h1><p>Compare routes and inspect how delays correlate with recorded transport loss.</p></div><span className="data-source-badge"><i /> {routes.length} active routes</span></div>
    <FiltersBar filters={filters} setFilters={setFilters} crops={crops} />
    <section className="analytics-stat-grid">
      <StatTile label="Active routes" value={String(routes.length)} note="Routes with selected records" icon={Route} />
      <StatTile label="Dispatched" value={formatTonnes(filtered.reduce((sum, item) => sum + item.qtyDispatched, 0))} unit="t" note="Across filtered shipments" icon={PackageOpen} tone="sage" />
      <StatTile label="Transport loss" value={formatTonnes(filtered.reduce((sum, item) => sum + item.stageLoss.transportation, 0))} unit="t" note="Transportation stage only" icon={ArrowDownRight} tone="amber" />
      <StatTile label="Delayed shipments" value={String(delayed.length)} note={highest ? `Highest-loss route: ${highest.route}` : "No matching routes"} icon={Percent} tone="red" />
    </section>
    <div className="analytics-two-col">
      <Card className="chart-card analytics-chart-card"><CardHeader className="chart-card-header"><div><CardTitle>Route-wise loss comparison</CardTitle><p className="card-subtitle">Recorded transportation loss in tonnes</p></div></CardHeader><CardContent className="chart-card-content"><ChartContainer config={chartConfig} className="chart-frame analytics-bar-frame"><BarChart data={[...routes].reverse().map((item) => ({ route: item.route, lossTonnes: item.lossTonnes }))} layout="vertical" margin={{ left: 8, right: 12 }}><CartesianGrid strokeDasharray="3 5" horizontal={false} stroke="var(--border)" /><XAxis type="number" axisLine={false} tickLine={false} /><YAxis type="category" dataKey="route" axisLine={false} tickLine={false} width={125} /><Tooltip content={<ChartTooltipContent />} /><Bar dataKey="lossTonnes" fill="var(--color-lossTonnes)" radius={[0, 5, 5, 0]} barSize={18} /></BarChart></ChartContainer></CardContent></Card>
      <Card className="chart-card analytics-chart-card"><CardHeader className="chart-card-header"><div><CardTitle>Delay vs. loss</CardTitle><p className="card-subtitle">Average transport-stage loss rate</p></div></CardHeader><CardContent className="chart-card-content"><div className="delay-comparison"><div className="delay-row"><div><span className="delay-symbol on-time" /><span>On time</span></div><strong>{lossRate(onTime).toFixed(2)}%</strong><small>{onTime.length} shipments</small></div><div className="delay-row"><div><span className="delay-symbol delayed" /><span>Delayed</span></div><strong>{lossRate(delayed).toFixed(2)}%</strong><small>{delayed.length} shipments</small></div><div className="delay-callout">{delayed.length && lossRate(delayed) > lossRate(onTime) ? "Delayed shipments have a higher recorded transport loss rate in this selection." : "The selected records do not show a higher transport loss rate for delayed shipments."}</div></div></CardContent></Card>
    </div>
    <Card className="table-card"><div className="section-card-heading"><div><h2>Route performance</h2><p>Ranked by transportation-stage loss</p></div><span className="rank-caption">{filtered.length} shipment records</span></div><Table columns={[{ key: "routeId", label: "Route ID" }, { key: "route", label: "Route" }, { key: "source", label: "Source" }, { key: "destination", label: "Destination" }, { key: "records", label: "Shipments" }, { key: "averageHours", label: "Avg. duration" }, { key: "lossTonnes", label: "Loss" }, { key: "lossPct", label: "Loss rate" }]} rows={routes.map((item) => ({ id: item.routeId, routeId: item.routeId, route: item.route, source: item.source, destination: item.destination, records: item.records, averageHours: `${item.averageHours.toFixed(1)} hrs`, lossTonnes: `${item.lossTonnes.toFixed(2)} t`, lossPct: `${item.lossPct.toFixed(1)}%` }))} /></Card>
  </div>
}
