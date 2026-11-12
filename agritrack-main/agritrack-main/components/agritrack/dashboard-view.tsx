"use client"

import { ArrowDownRight, ArrowUpRight, Boxes, CircleAlert, PackageCheck, PackageMinus, Percent, Warehouse } from "lucide-react"
import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { DashboardCharts } from "@/components/agritrack/dashboard-charts"
import {
  FACILITIES,
  formatDate,
  formatKg,
  formatTonnes,
  getCropTotals,
  getFacilityTotals,
  getLossPercentage,
  getLossQuantity,
  getMonthlyTrend,
  getRegionTotals,
  getRouteTotals,
  getStageTotals,
  type Shipment,
} from "@/lib/agritrack-data"

type Props = {
  shipments: Shipment[]
  crops: string[]
  onOpenShipment: (shipment: Shipment) => void
  onNavigate: (page: string) => void
}

type Period = "12 months" | "6 months" | "Year to date"

function totalMetrics(shipments: Shipment[]) {
  return {
    collected: shipments.reduce((sum, shipment) => sum + shipment.qtyDispatched, 0),
    lost: shipments.reduce((sum, shipment) => sum + getLossQuantity(shipment), 0),
    shipments: shipments.length,
    facilities: new Set(shipments.map((shipment) => shipment.facilityId)).size,
    highRisk: shipments.filter((shipment) => getLossPercentage(shipment) >= 5).length,
  }
}

function changeFor(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

function KpiCard({
  label,
  value,
  unit,
  change,
  icon: Icon,
  tone = "green",
}: {
  label: string
  value: string
  unit?: string
  change: number
  icon: typeof PackageCheck
  tone?: "green" | "amber" | "red" | "slate"
}) {
  const positive = tone === "red" ? change < 0 : change >= 0
  return (
    <Card className="kpi-card">
      <CardContent className="kpi-content">
        <div className={`kpi-icon ${tone}`}><Icon aria-hidden="true" /></div>
        <div className="kpi-label-row"><span className="kpi-label">{label}</span><span className="kpi-menu-dot" aria-hidden="true">•••</span></div>
        <div className="kpi-value">{value}<span>{unit}</span></div>
        <div className={`kpi-change ${positive ? "change-good" : "change-bad"}`}>
          {change >= 0 ? <ArrowUpRight aria-hidden="true" /> : <ArrowDownRight aria-hidden="true" />}
          <strong>{Math.abs(change).toFixed(1)}%</strong>
          <span>vs earlier records</span>
        </div>
      </CardContent>
    </Card>
  )
}

function InsightRow({ icon, title, name, detail, tone }: { icon: string; title: string; name: string; detail: string; tone: string }) {
  return (
    <div className="insight-row">
      <span className={`insight-icon ${tone}`} aria-hidden="true">{icon}</span>
      <div className="insight-copy"><span>{title}</span><strong>{name}</strong><small>{detail}</small></div>
      <span className="insight-arrow" aria-hidden="true">↗</span>
    </div>
  )
}

export function DashboardView({ shipments, crops, onOpenShipment, onNavigate }: Props) {
  const [period, setPeriod] = useState<Period>("12 months")
  const [cropFilter, setCropFilter] = useState("All crops")

  const filtered = useMemo(() => {
    const latestDate = shipments.reduce((latest, shipment) => shipment.dispatchDate > latest ? shipment.dispatchDate : latest, "")
    const cutoff = new Date(`${latestDate || "2026-11-10"}T00:00:00`)
    if (period === "12 months") cutoff.setFullYear(cutoff.getFullYear() - 1)
    if (period === "6 months") cutoff.setMonth(cutoff.getMonth() - 6)
    if (period === "Year to date") cutoff.setMonth(0, 1)
    return shipments.filter((shipment) => {
      const dateMatches = new Date(`${shipment.dispatchDate}T00:00:00`) >= cutoff
      const cropMatches = cropFilter === "All crops" || shipment.crop === cropFilter
      return dateMatches && cropMatches
    })
  }, [shipments, period, cropFilter])

  const metrics = totalMetrics(filtered)
  const sortedForCompare = [...filtered].sort((a, b) => a.dispatchDate.localeCompare(b.dispatchDate))
  const midpoint = Math.floor(sortedForCompare.length / 2)
  const earlier = totalMetrics(sortedForCompare.slice(0, midpoint))
  const recent = totalMetrics(sortedForCompare.slice(midpoint))
  const percentLoss = metrics.collected ? (metrics.lost / metrics.collected) * 100 : 0
  const previousPercent = earlier.collected ? (earlier.lost / earlier.collected) * 100 : 0
  const recentPercent = recent.collected ? (recent.lost / recent.collected) * 100 : 0
  const changes = {
    collected: changeFor(recent.collected, earlier.collected),
    lost: changeFor(recent.lost, earlier.lost),
    lossPct: changeFor(recentPercent, previousPercent),
    shipments: changeFor(recent.shipments, earlier.shipments),
    facilities: changeFor(recent.facilities, earlier.facilities),
    highRisk: changeFor(recent.highRisk, earlier.highRisk),
  }

  const cropTotals = getCropTotals(filtered)
  const stageTotals = getStageTotals(filtered)
  const regionTotals = getRegionTotals(filtered)
  const facilityTotals = getFacilityTotals(filtered)
  const routeTotals = getRouteTotals(filtered)
  const highestCrop = cropTotals[0]
  const highestStage = stageTotals[0]
  const highestFacility = facilityTotals[0]
  const highestRoute = routeTotals[0]
  const monthly = getMonthlyTrend(filtered)
  const recentShipments = [...filtered].sort((a, b) => b.dispatchDate.localeCompare(a.dispatchDate)).slice(0, 5)
  const activeFacilities = new Set(filtered.map((item) => item.facilityId)).size || FACILITIES.length

  return (
    <div className="page-stack">
      <div className="page-heading dashboard-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> AGRICULTURAL INTELLIGENCE</div>
          <h1>Supply chain overview</h1>
          <p>A clear picture of your produce, from harvest to destination.</p>
        </div>
        <div className="dashboard-filters">
          <label className="select-wrap" aria-label="Filter by crop">
            <select value={cropFilter} onChange={(event) => setCropFilter(event.target.value)}>
              <option>All crops</option>
              {crops.map((crop) => <option key={crop}>{crop}</option>)}
            </select>
          </label>
          <label className="select-wrap" aria-label="Filter by date range">
            <select value={period} onChange={(event) => setPeriod(event.target.value as Period)}>
              <option>12 months</option><option>6 months</option><option>Year to date</option>
            </select>
          </label>
        </div>
      </div>

      <section className="kpi-grid" aria-label="Supply chain key metrics">
        <KpiCard label="Produce collected" value={formatTonnes(metrics.collected)} unit=" t" change={changes.collected} icon={Boxes} tone="green" />
        <KpiCard label="Produce lost" value={formatTonnes(metrics.lost)} unit=" t" change={changes.lost} icon={PackageMinus} tone="amber" />
        <KpiCard label="Overall loss rate" value={percentLoss.toFixed(1)} unit="%" change={changes.lossPct} icon={Percent} tone="red" />
        <KpiCard label="Total shipments" value={metrics.shipments.toLocaleString("en-IN")} change={changes.shipments} icon={PackageCheck} tone="slate" />
        <KpiCard label="Storage facilities" value={String(activeFacilities)} change={changes.facilities} icon={Warehouse} tone="green" />
        <KpiCard label="High-risk shipments" value={String(filtered.filter((shipment) => getLossPercentage(shipment) >= 5).length)} change={changes.highRisk} icon={CircleAlert} tone="red" />
      </section>

      <section className="chart-grid" aria-label="Loss analysis charts">
        <DashboardCharts monthly={monthly} stages={stageTotals} crops={cropTotals} regions={regionTotals} />
      </section>

      <section className="dashboard-bottom-grid">
        <Card className="table-card recent-card">
          <div className="section-card-heading">
            <div><h2>Recent shipments</h2><p>Latest movements in your supply chain</p></div>
            <button className="text-action" onClick={() => onNavigate("Shipment Tracking")}>View all <span aria-hidden="true">→</span></button>
          </div>
          <div className="table-scroll">
            <table className="data-table recent-table">
              <thead><tr><th>Shipment</th><th>Crop</th><th>Route</th><th>Dispatch date</th><th>Status</th><th>Loss</th><th><span className="sr-only">Open details</span></th></tr></thead>
              <tbody>
                {recentShipments.map((shipment) => {
                  const pct = getLossPercentage(shipment)
                  const status = pct >= 5 ? "High Risk" : shipment.status
                  return <tr key={shipment.id} onClick={() => onOpenShipment(shipment)} className="clickable-row">
                    <td className="id-cell">{shipment.id}</td><td>{shipment.crop}</td><td>{shipment.origin} <span className="route-arrow">→</span> {shipment.destination}</td><td>{formatDate(shipment.dispatchDate)}</td>
                    <td><span className={`status-pill ${status.toLowerCase().replaceAll(" ", "-")}`}><i />{status}</span></td>
                    <td className={pct >= 5 ? "loss-high" : "loss-normal"}>{pct.toFixed(1)}%</td>
                    <td><button className="icon-button row-open" aria-label={`View ${shipment.id} details`} onClick={(event) => { event.stopPropagation(); onOpenShipment(shipment) }}>↗</button></td>
                  </tr>
                })}
                {recentShipments.length === 0 && <tr><td colSpan={7} className="empty-cell">No shipments match these filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="insights-card">
          <div className="section-card-heading insight-heading"><div><div className="insight-title-row"><span className="insight-spark">✦</span><h2>Critical insights</h2></div><p>Patterns found in your current data</p></div><span className="live-dot" title="Calculated from current records" /></div>
          <div className="insight-list">
            <InsightRow icon="↗" title="Highest-loss crop" name={highestCrop?.crop ?? "No data"} detail={highestCrop ? `${highestCrop.lossPct.toFixed(1)}% average loss rate` : "Add shipments to explore"} tone="insight-green" />
            <InsightRow icon="◉" title="Loss-heavy stage" name={highestStage?.stage ?? "No data"} detail={highestStage ? `${formatTonnes(highestStage.lossKg)} t recorded` : "No stage records available"} tone="insight-amber" />
            <InsightRow icon="⌂" title="Facility to review" name={highestFacility?.facility ?? "No data"} detail={highestFacility ? `${highestFacility.lossPct.toFixed(1)}% storage loss` : "No storage records available"} tone="insight-red" />
            <InsightRow icon="⇢" title="Route to review" name={highestRoute?.route ?? "No data"} detail={highestRoute ? `${highestRoute.lossPct.toFixed(1)}% route loss` : "No route records available"} tone="insight-blue" />
          </div>
          <button className="insights-link" onClick={() => onNavigate("Loss Detection")}>Explore loss detection <span aria-hidden="true">→</span></button>
        </Card>
      </section>
      <p className="data-footnote">Metrics reflect {filtered.length} shipment records · Values are calculated from the sample dataset</p>
    </div>
  )
}
