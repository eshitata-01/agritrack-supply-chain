"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, AlertTriangle, ArrowDownRight, Download, FileDown, Play, Printer, Search, ShieldAlert, Sparkles } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { formatDate, formatKg, formatTonnes, getLossPercentage, getLossQuantity, getStageKey, getStageName, type Shipment, type StageName } from "@/lib/agritrack-data"
import { ApiError, executeSqlInsight, getSqlDefinition } from "@/services/api"

function lossAtStage(shipment: Shipment, stage: StageName) {
  const key = getStageKey(stage)
  const loss = shipment.stageLoss[key]
  const base = key === "harvest" ? shipment.qtyDispatched + shipment.stageLoss.harvest :
    key === "storage" ? shipment.qtyDispatched - shipment.stageLoss.harvest :
    key === "transportation" ? shipment.qtyDispatched - shipment.stageLoss.harvest - shipment.stageLoss.storage :
    shipment.qtyDispatched - shipment.stageLoss.harvest - shipment.stageLoss.storage - shipment.stageLoss.transportation
  return { loss, rate: base > 0 ? (loss / base) * 100 : 0 }
}

export function LossDetectionView({ shipments, crops, regions }: { shipments: Shipment[]; crops: string[]; regions: string[] }) {
  const [query, setQuery] = useState("")
  const [crop, setCrop] = useState("All crops")
  const [region, setRegion] = useState("All regions")
  const [stage, setStage] = useState("All stages")
  const [critical, setCritical] = useState(5)
  const [watch, setWatch] = useState(3)
  const [selectedDimension, setSelectedDimension] = useState("Crop")
  const stages: StageName[] = ["Harvest / Collection", "Storage", "Transportation", "Delivery"]
  const records = useMemo(() => shipments.flatMap((shipment) => stages.map((stageName) => ({ shipment, stage: stageName, ...lossAtStage(shipment, stageName) }))).filter((item) =>
    (crop === "All crops" || item.shipment.crop === crop) && (region === "All regions" || item.shipment.region === region) &&
    (stage === "All stages" || item.stage === stage) &&
    (!query || `${item.shipment.id} ${item.shipment.crop} ${item.shipment.region} ${item.shipment.facility} ${item.shipment.route}`.toLowerCase().includes(query.toLowerCase()))
  ).sort((a, b) => b.rate - a.rate), [shipments, crop, region, stage, query])
  const highRisk = records.filter((item) => item.rate >= critical)
  const watchCount = records.filter((item) => item.rate >= watch && item.rate < critical).length
  const totalLoss = records.reduce((sum, item) => sum + item.loss, 0)
  const dimensionRows = useMemo(() => {
    const grouping = new Map<string, { name: string; loss: number; volume: number; records: number }>()
    for (const item of records) {
      const name = selectedDimension === "Crop" ? item.shipment.crop : selectedDimension === "Region" ? item.shipment.region : selectedDimension === "Facility" ? item.shipment.facility : item.shipment.route
      const group = grouping.get(name) ?? { name, loss: 0, volume: 0, records: 0 }
      group.loss += item.loss
      group.volume += item.shipment.qtyDispatched
      group.records += 1
      grouping.set(name, group)
    }
    return [...grouping.values()].map((item) => ({ ...item, rate: item.volume ? (item.loss / item.volume) * 100 : 0 })).sort((a, b) => b.rate - a.rate)
  }, [records, selectedDimension])
  const heatmap = useMemo(() => {
    const cropsInData = [...new Set(records.map((item) => item.shipment.crop))]
    return cropsInData.map((cropName) => ({ crop: cropName, ...Object.fromEntries(stages.map((stageName) => {
      const matching = records.filter((item) => item.shipment.crop === cropName && item.stage === stageName)
      const qty = matching.reduce((sum, item) => sum + item.loss, 0)
      const base = matching.reduce((sum, item) => sum + item.shipment.qtyDispatched, 0)
      return [stageName, base ? (qty / base) * 100 : 0]
    })) }))
  }, [records])

  function riskClass(rate: number) {
    return rate >= critical ? "risk-critical" : rate >= watch ? "risk-watch" : "risk-low"
  }

  return <div className="page-stack">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> EARLY WARNING SYSTEM</div><h1>Loss detection</h1><p>Find high-loss stages, crops, regions, and facilities before the next shipment.</p></div><span className="risk-monitoring"><span className="live-dot" /> Monitoring {shipments.length} shipments</span></div>
    <div className="loss-control-card">
      <div className="loss-control-heading"><div><span className="control-icon"><Activity /></span><div><strong>Risk thresholds</strong><small>Adjust what the dashboard flags for review.</small></div></div><span className="threshold-live">Updates instantly</span></div>
      <div className="threshold-controls"><label><span className="threshold-key critical-key" />Critical loss rate<input aria-label="Critical loss threshold percent" type="number" min="0.1" max="100" step="0.5" value={critical} onChange={(event) => setCritical(Math.min(100, Math.max(0.1, Number(event.target.value) || 0.1)))} /><b>%</b></label><label><span className="threshold-key watch-key" />Watch loss rate<input aria-label="Watch loss threshold percent" type="number" min="0" max={Math.max(0, critical - 0.1)} step="0.5" value={watch} onChange={(event) => setWatch(Math.min(critical - 0.1, Math.max(0, Number(event.target.value) || 0)))} /><b>%</b></label><p>Each stage rate uses the quantity entering that stage as its denominator.</p></div>
    </div>
    <div className="loss-filterbar"><label className="search-control"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search crop, facility, route..." aria-label="Search loss records" /></label><label className="filter-select"><select value={crop} onChange={(event) => setCrop(event.target.value)}><option>All crops</option>{crops.map((item) => <option key={item}>{item}</option>)}</select></label><label className="filter-select"><select value={region} onChange={(event) => setRegion(event.target.value)}><option>All regions</option>{regions.map((item) => <option key={item}>{item}</option>)}</select></label><label className="filter-select"><select value={stage} onChange={(event) => setStage(event.target.value)}><option>All stages</option>{stages.map((item) => <option key={item}>{item}</option>)}</select></label></div>
    <section className="risk-stat-grid"><Card className="risk-stat risk-stat-critical"><CardContent><span className="risk-stat-icon"><ShieldAlert /></span><span>Critical stage events</span><strong>{highRisk.length}</strong><small>At or above {critical}% loss</small></CardContent></Card><Card className="risk-stat risk-stat-watch"><CardContent><span className="risk-stat-icon"><AlertTriangle /></span><span>Watch list</span><strong>{watchCount}</strong><small>{watch}% to {critical}% loss</small></CardContent></Card><Card className="risk-stat"><CardContent><span className="risk-stat-icon"><ArrowDownRight /></span><span>Stage loss reviewed</span><strong>{formatTonnes(totalLoss)}<small> t</small></strong><small>Across the selected records</small></CardContent></Card><Card className="risk-stat"><CardContent><span className="risk-stat-icon"><Activity /></span><span>Highest stage risk</span><strong>{records[0]?.stage ?? "—"}</strong><small>{records[0] ? `${records[0].rate.toFixed(1)}% loss · ${records[0].shipment.crop}` : "No matching records"}</small></CardContent></Card></section>
    <div className="analytics-two-col">
      <Card className="chart-card analytics-chart-card"><CardHeader className="chart-card-header"><div><CardTitle>Loss by {selectedDimension.toLowerCase()}</CardTitle><p className="card-subtitle">Stage loss rate across the selected dimension</p></div><label className="compact-select"><span className="sr-only">Analysis dimension</span><select value={selectedDimension} onChange={(event) => setSelectedDimension(event.target.value)}>{["Crop", "Region", "Facility", "Route"].map((item) => <option key={item}>{item}</option>)}</select></label></CardHeader><CardContent className="chart-card-content"><ChartContainer config={{ rate: { label: "Loss rate (%)", color: "var(--chart-1)" } }} className="chart-frame analytics-bar-frame"><BarChart data={[...dimensionRows].reverse()} layout="vertical" margin={{ left: 5, right: 12 }}><CartesianGrid strokeDasharray="3 5" horizontal={false} stroke="var(--border)" /><XAxis type="number" unit="%" axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={138} /><Tooltip content={<ChartTooltipContent />} /><Bar dataKey="rate" fill="var(--color-rate)" radius={[0, 5, 5, 0]} barSize={18} /></BarChart></ChartContainer></CardContent></Card>
      <Card className="table-card heatmap-card"><div className="section-card-heading"><div><h2>Crop × stage heatmap</h2><p>Stage loss rate, darker cells indicate higher loss</p></div></div><div className="table-scroll"><table className="data-table heatmap-table"><thead><tr><th>Crop</th>{stages.map((item) => <th key={item}>{item.replace(" / Collection", "")}</th>)}</tr></thead><tbody>{heatmap.map((row) => <tr key={row.crop}><td className="id-cell">{row.crop}</td>{stages.map((stageName) => { const value = Number(row[stageName as keyof typeof row] ?? 0); const intensity = Math.min(0.75, 0.12 + value / 12); return <td key={stageName}><span className="heat-cell" style={{ backgroundColor: `rgba(181, 76, 52, ${intensity})`, color: intensity > 0.42 ? "#fff" : "#6c342b" }}>{value.toFixed(1)}%</span></td> })}</tr>)}</tbody></table></div></Card>
    </div>
    <Card className="table-card"><div className="section-card-heading"><div><h2>Priority review queue</h2><p>Shipment-stage combinations sorted by observed loss rate</p></div><div className="risk-legend"><span><i className="risk-dot critical-dot" />Critical</span><span><i className="risk-dot watch-dot" />Watch</span></div></div><div className="table-scroll"><table className="data-table analytics-table"><thead><tr><th>Shipment</th><th>Crop</th><th>Region</th><th>Stage</th><th>Facility / route</th><th>Loss quantity</th><th>Stage loss rate</th><th>Risk</th></tr></thead><tbody>{records.slice(0, 12).map((item, index) => <tr key={`${item.shipment.id}-${item.stage}`}><td className="id-cell">{item.shipment.id}</td><td>{item.shipment.crop}</td><td>{item.shipment.region}</td><td>{item.stage}</td><td>{item.stage === "Storage" ? item.shipment.facility : item.shipment.route}</td><td>{formatKg(item.loss)} kg</td><td>{item.rate.toFixed(2)}%</td><td><span className={`risk-badge ${riskClass(item.rate)}`}><i />{item.rate >= critical ? "Critical" : item.rate >= watch ? "Watch" : "Low"}</span></td></tr>)}{!records.length && <tr><td colSpan={8} className="empty-cell">No stage records match these filters.</td></tr>}</tbody></table></div></Card>
    <div className="note-card"><span className="note-mark">i</span><p>Loss events are assessed per stage. The overall shipment loss remains based on dispatched quantity less received quantity, so stage-level observations are not double-counted.</p></div>
  </div>
}

type ReportType = "Crop-wise loss" | "Stage-wise loss" | "Storage facility" | "Transportation route" | "Regional comparison" | "Shipment risk" | "Shipment ledger" | "Loss overview"

function csvValue(value: unknown) {
  const text = String(value ?? "")
  return `"${text.replaceAll('"', '""')}"`
}

function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const csv = [headers, ...rows].map((row) => row.map(csvValue).join(",")).join("\r\n")
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url)
}

export function ReportsView({ shipments, crops, dataMode }: { shipments: Shipment[]; crops: string[]; dataMode: "loading" | "oracle" | "error" }) {
  const [reportType, setReportType] = useState<ReportType>("Crop-wise loss")
  const [from, setFrom] = useState("2025-12-01")
  const [to, setTo] = useState("2026-11-30")
  const [generated, setGenerated] = useState(true)
  const dateRangeValid = from <= to
  const filtered = shipments.filter((shipment) => shipment.dispatchDate >= from && shipment.dispatchDate <= to)
  const rows = useMemo(() => {
    if (reportType === "Crop-wise loss") {
      const values = new Map<string, { quantity: number; loss: number; count: number }>()
      for (const shipment of filtered) { const current = values.get(shipment.crop) ?? { quantity: 0, loss: 0, count: 0 }; current.quantity += shipment.qtyDispatched; current.loss += getLossQuantity(shipment); current.count += 1; values.set(shipment.crop, current) }
      return [...values.entries()].map(([crop, item]) => ({ crop, shipments: item.count, collectedKg: item.quantity, lossKg: item.loss, lossPct: item.quantity ? (item.loss / item.quantity) * 100 : 0 }))
    }
    if (reportType === "Stage-wise loss") {
      const stages = [{ key: "harvest", label: "Harvest / Collection" }, { key: "storage", label: "Storage" }, { key: "transportation", label: "Transportation" }, { key: "delivery", label: "Delivery" }] as const
      const totalQuantity = filtered.reduce((sum, shipment) => sum + shipment.qtyDispatched, 0)
      return stages.map(({ key, label }) => {
        const lossKg = filtered.reduce((sum, shipment) => sum + shipment.stageLoss[key], 0)
        return { stage: label, lossKg, lossPct: totalQuantity ? (lossKg / totalQuantity) * 100 : 0, shipmentsAffected: filtered.filter((shipment) => shipment.stageLoss[key] > 0).length }
      })
    }
    if (reportType === "Regional comparison") {
      const values = new Map<string, { shipments: number; quantity: number; loss: number }>()
      for (const shipment of filtered) { const current = values.get(shipment.region) ?? { shipments: 0, quantity: 0, loss: 0 }; current.shipments++; current.quantity += shipment.qtyDispatched; current.loss += getLossQuantity(shipment); values.set(shipment.region, current) }
      return [...values.entries()].map(([region, item]) => ({ region, shipments: item.shipments, collectedKg: item.quantity, lossKg: item.loss, lossPct: item.quantity ? (item.loss / item.quantity) * 100 : 0 }))
    }
    if (reportType === "Shipment risk") return filtered.filter((shipment) => getLossPercentage(shipment) >= 5).map((shipment) => ({ shipmentId: shipment.id, crop: shipment.crop, region: shipment.region, route: shipment.route, facility: shipment.facility, dispatchDate: shipment.dispatchDate, lossKg: getLossQuantity(shipment), lossPct: getLossPercentage(shipment), status: shipment.status, risk: "Review" }))
    if (reportType === "Storage facility") {
      const values = new Map<string, { shipments: number; quantity: number; loss: number; region: string }>()
      for (const shipment of filtered) { const current = values.get(shipment.facility) ?? { shipments: 0, quantity: 0, loss: 0, region: shipment.region }; current.shipments++; current.quantity += shipment.qtyDispatched - shipment.stageLoss.harvest; current.loss += shipment.stageLoss.storage; values.set(shipment.facility, current) }
      return [...values.entries()].map(([facility, item]) => ({ facility, region: item.region, shipments: item.shipments, storedKg: item.quantity, lossKg: item.loss, lossPct: item.quantity ? (item.loss / item.quantity) * 100 : 0 }))
    }
    if (reportType === "Transportation route") {
      const values = new Map<string, { shipments: number; loss: number; quantity: number; delayed: number }>()
      for (const shipment of filtered) { const current = values.get(shipment.route) ?? { shipments: 0, loss: 0, quantity: 0, delayed: 0 }; current.shipments++; current.loss += shipment.stageLoss.transportation; current.quantity += shipment.qtyDispatched; current.delayed += shipment.status === "Delayed" ? 1 : 0; values.set(shipment.route, current) }
      return [...values.entries()].map(([route, item]) => ({ route, shipments: item.shipments, lossKg: item.loss, delayed: item.delayed, lossPct: item.quantity ? (item.loss / item.quantity) * 100 : 0 }))
    }
    if (reportType === "Shipment ledger") return filtered.map((shipment) => ({ shipmentId: shipment.id, crop: shipment.crop, region: shipment.region, origin: shipment.origin, destination: shipment.destination, dispatchDate: shipment.dispatchDate, qtyDispatched: shipment.qtyDispatched, qtyReceived: shipment.qtyReceived, lossKg: getLossQuantity(shipment), lossPct: getLossPercentage(shipment), status: shipment.status }))
    const collected = filtered.reduce((sum, shipment) => sum + shipment.qtyDispatched, 0)
    const loss = filtered.reduce((sum, shipment) => sum + getLossQuantity(shipment), 0)
    return [
      { metric: "Produce collected", value: formatTonnes(collected), unit: "tonnes" },
      { metric: "Produce lost", value: formatTonnes(loss), unit: "tonnes" },
      { metric: "Overall loss rate", value: `${collected ? ((loss / collected) * 100).toFixed(2) : "0.00"}%`, unit: "percent" },
      { metric: "Shipment records", value: String(filtered.length), unit: "records" },
      { metric: "High-risk shipments", value: String(filtered.filter((shipment) => getLossPercentage(shipment) >= 5).length), unit: "records" },
    ]
  }, [filtered, reportType])
  const columns = Object.keys(rows[0] ?? (reportType === "Loss overview" ? { metric: "", value: "", unit: "" } : {}))
  const totals = {
    collected: filtered.reduce((sum, item) => sum + item.qtyDispatched, 0),
    lost: filtered.reduce((sum, item) => sum + getLossQuantity(item), 0),
    high: filtered.filter((item) => getLossPercentage(item) >= 5).length,
  }

  function exportReport() {
    const filename = `agritrack-${reportType.toLowerCase().replaceAll(" ", "-")}-${from}-to-${to}.csv`
    downloadCsv(filename, columns, rows.map((row) => columns.map((column) => (row as Record<string, unknown>)[column])))
  }

  return <div className="page-stack">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> REPORTING & EXPORTS</div><h1>Reports</h1><p>Generate shareable summaries from the current supply-chain records.</p></div><button className="button-quiet" onClick={() => window.print()}><Printer />Print report</button></div>
    <Card className="report-builder"><div className="report-builder-intro"><span className="report-builder-icon"><FileDown /></span><div><h2>Build a report</h2><p>Choose a report, set a date range, then export the result as a CSV.</p></div></div><div className="report-controls"><label className="form-field"><span>Report type</span><select value={reportType} onChange={(event) => { setReportType(event.target.value as ReportType); setGenerated(false) }}>{["Crop-wise loss", "Stage-wise loss", "Storage facility", "Transportation route", "Regional comparison", "Shipment risk", "Shipment ledger", "Loss overview"].map((item) => <option key={item}>{item}</option>)}</select></label><label className="form-field"><span>From date</span><input type="date" max={to} value={from} onChange={(event) => { setFrom(event.target.value); setGenerated(false) }} /></label><label className="form-field"><span>To date</span><input type="date" min={from} value={to} onChange={(event) => { setTo(event.target.value); setGenerated(false) }} /></label><button className="button-primary" onClick={() => setGenerated(true)} disabled={!dateRangeValid}><Activity />Generate report</button>{!dateRangeValid && <span className="report-date-error" role="alert">Choose an end date on or after the start date.</span>}</div></Card>
    <div className="report-kpi-row"><div><span>In range</span><strong>{filtered.length}</strong><small>shipment records</small></div><div><span>Produce collected</span><strong>{formatTonnes(totals.collected)} t</strong><small>from filtered records</small></div><div><span>Produce lost</span><strong>{formatTonnes(totals.lost)} t</strong><small>{totals.collected ? (totals.lost / totals.collected * 100).toFixed(1) : "0.0"}% overall rate</small></div><div><span>High risk</span><strong>{totals.high}</strong><small>at 5% loss or higher</small></div></div>
    <Card className="table-card report-results"><div className="section-card-heading"><div><h2>{reportType} report</h2><p>{generated ? `${formatDate(from)} to ${formatDate(to)} · ${rows.length} report rows` : "Update the report criteria and select Generate report."}</p></div><button className="button-primary button-small" onClick={exportReport} disabled={!generated || rows.length === 0}><Download />Export CSV</button></div><div className="table-scroll"><table className="data-table analytics-table"><thead><tr>{columns.map((column) => <th key={column}>{column.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()).replace("Kg", "(kg)").replace("Pct", " %")}</th>)}</tr></thead><tbody>{generated && rows.map((row, index) => <tr key={index}>{columns.map((column) => { const value = (row as Record<string, unknown>)[column]; return <td key={column}>{typeof value === "number" && column.toLowerCase().includes("kg") ? formatKg(value) : typeof value === "number" && column.toLowerCase().includes("pct") ? `${value.toFixed(2)}%` : String(value ?? "—")}</td>})}</tr>)}{(!generated || rows.length === 0) && <tr><td colSpan={Math.max(columns.length, 1)} className="empty-cell">{generated ? "No records in this date range." : "Generate the report to refresh the preview."}</td></tr>}</tbody></table></div><div className="report-result-footer"><span><i className="data-source-dot" /> {dataMode === "oracle" ? "Generated from records loaded from Oracle" : dataMode === "loading" ? "Checking the data source" : "Oracle unavailable · No records loaded"}</span><span>CSV is UTF-8 encoded for spreadsheet compatibility</span></div></Card>
    <div className="note-card"><span className="note-mark">i</span><p>Exports use the records loaded from Oracle and the selected date range. Reports remain empty while Oracle data is unavailable.</p></div>
  </div>
}

type Query = { name: string; description: string; techniques: string[]; headers: string[] }
const KEYWORDS = new Set("SELECT FROM WHERE AND OR AS SUM AVG COUNT DISTINCT ROUND CASE WHEN THEN ELSE END GROUP BY HAVING ORDER DESC ASC JOIN ON INNER LEFT OUTER IS NULL IN BETWEEN OVER PARTITION BY ROWS UNBOUNDED PRECEDING CURRENT ROW DATE_TRUNC EXTRACT WITH COALESCE CAST DECIMAL NULLIF RANK DENSE_RANK CREATE OR REPLACE VIEW AS OF FETCH FIRST ROWS ONLY".split(" "))

const SQL_TECHNIQUES = [
  { name: "Multi-table JOINs", purpose: "Relate shipment facts to crop, date, facility, route, and stage dimensions through stable keys." },
  { name: "Aggregate functions", purpose: "Use SUM, COUNT, and AVG to turn shipment-level records into comparable operational totals." },
  { name: "GROUP BY and HAVING", purpose: "Build dimensional summaries, then filter groups after aggregation." },
  { name: "Nested subqueries", purpose: "Compare shipment-level loss rates against a threshold calculated from the wider dataset." },
  { name: "CTEs", purpose: "Name an intermediate result once to make multi-step reporting logic easier to follow." },
  { name: "Window functions", purpose: "Calculate rankings across grouped rows without collapsing their crop-level detail." },
  { name: "RANK and DENSE_RANK", purpose: "Show tied positions, with RANK leaving gaps and DENSE_RANK keeping ranks consecutive." },
  { name: "Database views", purpose: "Save a reusable, governed SQL layer for dashboards and recurring reports." },
] as const
function SqlCode({ sql }: { sql: string }) {
  const parts = sql.split(/(--[^\n]*|'[^']*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b)/g)
  return <pre className="sql-code"><code>{parts.map((part, index) => {
    if (part.startsWith("--")) return <span key={index} className="sql-comment">{part}</span>
    if (part.startsWith("'")) return <span key={index} className="sql-string">{part}</span>
    if (/^\d/.test(part)) return <span key={index} className="sql-number">{part}</span>
    if (KEYWORDS.has(part.toUpperCase())) return <span key={index} className="sql-keyword">{part}</span>
    if (["SHIPMENT_FACT", "CROP_DIM", "DATE_DIM", "LOSS_EVENT_FACT", "STORAGE_DIM", "TRANSPORT_DIM", "FACILITY_DIM"].includes(part.toUpperCase())) return <span key={index} className="sql-table-name">{part}</span>
    return part
  })}</code></pre>
}

export function SqlInsightsView() {
  const queries: Query[] = [
    {
      name: "Monthly loss trend", description: "Aggregate collected and lost quantity by month to expose seasonal changes.", techniques: ["Multi-table JOINs", "Aggregate functions", "GROUP BY and HAVING"],
      headers: ["Month", "Collected (kg)", "Lost (kg)", "Loss rate"],
    },
    {
      name: "Loss by supply stage", description: "Compare stage-level loss events without double-counting shipment totals.", techniques: ["Aggregate functions", "GROUP BY and HAVING"],
      headers: ["Stage", "Lost (kg)", "Shipments affected"],
    },
    {
      name: "Facility storage loss", description: "Rank storage facilities using loss at the storage stage only.", techniques: ["Multi-table JOINs", "Aggregate functions", "GROUP BY and HAVING"],
      headers: ["Facility", "Storage loss (kg)", "Loss rate"],
    },
    {
      name: "Route risk flags", description: "Use a review threshold to surface routes with high transit-stage loss.", techniques: ["Multi-table JOINs", "Aggregate functions", "CASE expressions"],
      headers: ["Route", "Transport loss rate", "Shipments", "Flag"],
    },
    {
      name: "Storage duration vs loss", description: "Group storage outcomes by duration and retain only meaningful shipment cohorts.", techniques: ["Aggregate functions", "GROUP BY and HAVING"],
      headers: ["Storage duration", "Shipments", "Storage loss (kg)", "Loss rate"],
    },
    {
      name: "Crop loss ranking", description: "Use a CTE and analytic ranks to compare crop loss totals while preserving ties.", techniques: ["CTEs", "Window functions", "RANK and DENSE_RANK", "Aggregate functions"],
      headers: ["Crop", "Shipments", "Lost (kg)", "Rank", "Dense rank"],
    },
    {
      name: "High-risk shipments", description: "Compare each shipment with the network average using a nested aggregate subquery.", techniques: ["Nested subqueries", "Aggregate functions", "Multi-table JOINs"],
      headers: ["Shipment", "Crop", "Dispatch date", "Loss rate"],
    },
    {
      name: "Reusable crop view", description: "Create a database view that standardizes crop-level loss reporting for downstream dashboards.", techniques: ["Database views", "Multi-table JOINs", "Aggregate functions", "GROUP BY and HAVING"],
      headers: ["Crop", "Shipments", "Collected (kg)", "Lost (kg)", "Loss rate"],
    },
  ]
  const [selected, setSelected] = useState(0)
  const [runCount, setRunCount] = useState(0)
  const [databaseRows, setDatabaseRows] = useState<Record<string, unknown>[] | null>(null)
  const [databaseSql, setDatabaseSql] = useState("")
  const [queryMode, setQueryMode] = useState<"idle" | "oracle" | "error">("idle")
  const [queryError, setQueryError] = useState("")
  const [queryLoading, setQueryLoading] = useState(false)
  const active = queries[selected]
  const resultHeaders = databaseRows?.[0] ? Object.keys(databaseRows[0]) : active.headers
  const results = databaseRows ? databaseRows.map((row) => resultHeaders.map((key) => row[key])) : []
  const tableSchema = "CROP_DIM: crop_key, crop_name, category\nSTAGE_DIM: stage_key, stage_name\nROUTE_DIM: route_key, origin, destination, region\nFACILITY_DIM: facility_key, facility_name, region\nDATE_DIM: date_key, full_date, month_year\nSHIPMENT_FACT: shipment_id, crop_key, route_key, dispatch_date_key, qty_dispatched_kg, qty_received_kg, status\nLOSS_EVENT_FACT: loss_event_id, shipment_id, stage_key, facility_key, date_key, loss_kg, storage_days"
  useEffect(() => {
    let activeRequest = true
    getSqlDefinition(String(selected + 1).padStart(2, "0")).then((payload) => { if (activeRequest) setDatabaseSql(payload.sql) }).catch((error) => { if (activeRequest) { setQueryMode("error"); setQueryError(error instanceof ApiError ? error.message : "Could not load the approved query definition.") } })
    return () => { activeRequest = false }
  }, [selected])
  async function runSelectedQuery() {
    setQueryLoading(true); setQueryError("")
    try {
      const payload = await executeSqlInsight(String(selected + 1).padStart(2, "0"))
      setDatabaseSql(payload.sql)
      setQueryMode("oracle")
      setDatabaseRows(payload.rows)
      setRunCount((value) => value + 1)
    } catch (error) {
      setQueryMode("error"); setDatabaseRows(null); setQueryError(error instanceof ApiError ? error.message : "Oracle query failed."); setRunCount((value) => value + 1)
    } finally { setQueryLoading(false) }
  }
  return <div className="page-stack">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> ORACLE SQL WORKSPACE</div><h1>SQL insights</h1><p>Run the allowlisted Oracle reports against the configured schema.</p></div><span className="sql-status"><span className="live-dot" /> {queryMode === "oracle" ? "Oracle query results" : queryMode === "error" ? "Database unavailable" : "Query not run"}</span></div>
    {queryError && <div className="sql-notice error"><span className="sql-notice-icon"><Sparkles /></span><p><strong>Oracle query unavailable.</strong> {queryError}</p></div>}
    <div className="sql-layout">
      <aside className="sql-query-list"><div className="sql-query-list-title"><span>QUERY LIBRARY</span><small>{queries.length} reports</small></div>{queries.map((query, index) => <button className={selected === index ? "sql-query-button active" : "sql-query-button"} key={query.name} onClick={() => { setSelected(index); setRunCount(0); setDatabaseRows(null); setDatabaseSql(""); setQueryError(""); setQueryMode("idle") }}><span className="query-index">0{index + 1}</span><span><strong>{query.name}</strong><small>{query.description}</small></span><span className="query-chevron">›</span></button>)}<div className="schema-card"><div className="schema-title"><span className="schema-dot" /> SCHEMA REFERENCE</div><pre>{tableSchema}</pre></div></aside>
      <div className="sql-workspace"><Card className="sql-editor-card"><div className="sql-editor-header"><div><span className="terminal-indicator" /> Query editor <small>Oracle SQL</small></div><button className="button-primary button-small" onClick={runSelectedQuery} disabled={queryLoading}><Play />{queryLoading ? "Running…" : "Run query"}</button></div><div className="sql-technique-tags">{active.techniques.map((technique) => <span key={technique}>{technique}</span>)}</div><div className="sql-editor-body"><div className="sql-line-numbers">{(databaseSql || "-- Loading the allowlisted Oracle SQL definition…").split("\n").map((_, index) => <span key={index}>{index + 1}</span>)}</div><SqlCode sql={databaseSql || "-- Loading the allowlisted Oracle SQL definition…"} /></div><div className="sql-editor-footer"><span><i className="data-source-dot" /> {queryMode === "oracle" ? "Executed by the server against Oracle" : "Server-side Oracle query; no local data preview"}</span><span>{databaseSql ? databaseSql.split("\n").length : 1} lines</span></div></Card>
      <Card className="sql-results-card"><div className="sql-results-heading"><div><h2>Query results</h2><p>{active.name} · {results.length} rows{runCount > 0 ? ` · Run ${runCount}` : " · Not run"}</p></div><button className="icon-button" title="Download results as CSV" aria-label="Download query results as CSV" onClick={() => downloadSqlResults({ ...active, headers: resultHeaders }, results)} disabled={!results.length}><Download /></button></div><div className="table-scroll"><table className="data-table analytics-table"><thead><tr>{resultHeaders.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{results.slice(0, 12).map((row, rowIndex) => <tr key={rowIndex}>{row.map((value, columnIndex) => <td key={columnIndex} className={String(value) === "REVIEW" ? "loss-high" : ""}>{value instanceof Date ? value.toISOString() : String(value ?? "—")}</td>)}</tr>)}{!results.length && <tr><td colSpan={resultHeaders.length} className="empty-cell">{queryMode === "error" ? "Oracle query failed. No sample results are shown." : "Run this report to retrieve Oracle records."}</td></tr>}</tbody></table></div><div className="sql-results-footer"><span>{queryMode === "oracle" ? "Results returned from Oracle." : queryMode === "error" ? "Oracle unavailable · No sample results" : "No query executed yet."}</span><span>Showing {Math.min(results.length, 12)} of {results.length}</span></div></Card>
      </div>
    </div>
    <section className="sql-technique-section" aria-labelledby="sql-technique-title"><div className="section-heading"><div><span className="eyebrow"><span className="eyebrow-line" /> QUERY TOOLKIT</span><h2 id="sql-technique-title">Oracle SQL techniques</h2><p>Each pattern is paired with a representative query and a preview table above.</p></div></div><div className="sql-technique-grid">{SQL_TECHNIQUES.map((technique, index) => <article className="sql-technique-card" key={technique.name}><span className="sql-technique-number">{String(index + 1).padStart(2, "0")}</span><div><h3>{technique.name}</h3><p>{technique.purpose}</p></div></article>)}</div></section>
    <Card className="sql-guidance"><div className="guidance-icon"><Sparkles /></div><div><h2>Warehouse modeling note</h2><p>These examples assume a star schema with shipment, loss-event, date, storage, and transportation dimensions. Replace the table and column names with your Oracle schema when an authenticated database connection is available.</p></div></Card>
  </div>
}

function downloadSqlResults(query: Query, rows: unknown[][]) {
  const csv = [query.headers, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n")
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a"); link.href = url; link.download = `agritrack-${query.name.toLowerCase().replaceAll(" ", "-")}.csv`; link.click(); URL.revokeObjectURL(url)
}
