"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { formatDate, formatKg, getLossPercentage, getLossQuantity, getShipmentStatus, type Shipment } from "@/lib/agritrack-data"

const PAGE_SIZE = 8

export function ShipmentDetailDialog({ shipment, onClose }: { shipment: Shipment | null; onClose: () => void }) {
  if (!shipment) return null
  const stages = [
    { label: "Harvest / collection", quantity: shipment.qtyDispatched, loss: shipment.stageLoss.harvest, note: "Harvest weight" },
    { label: "Storage", quantity: shipment.qtyDispatched - shipment.stageLoss.harvest, loss: shipment.stageLoss.storage, note: `${shipment.storageDays} days in storage` },
    { label: "Transportation", quantity: shipment.qtyDispatched - shipment.stageLoss.harvest - shipment.stageLoss.storage, loss: shipment.stageLoss.transportation, note: `${shipment.transitHours} hour transit` },
    { label: "Delivery", quantity: shipment.qtyReceived, loss: shipment.stageLoss.delivery, note: shipment.actualDate ? `Delivered ${formatDate(shipment.actualDate)}` : `Expected ${formatDate(shipment.expectedDate)}` },
  ]
  const status = getShipmentStatus(shipment)
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="shipment-modal" role="dialog" aria-modal="true" aria-labelledby="shipment-detail-title">
      <div className="modal-heading"><div><span className="modal-eyebrow">SUPPLY CHAIN JOURNEY</span><h2 id="shipment-detail-title">{shipment.id}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close shipment details"><X /></button></div>
      <div className="shipment-summary"><div><span className="summary-label">Crop</span><strong>{shipment.crop}</strong></div><div><span className="summary-label">Shipment status</span><span className={`status-pill ${status.toLowerCase().replaceAll(" ", "-")}`}><i />{status}</span></div><div><span className="summary-label">Total loss</span><strong className={getLossPercentage(shipment) >= 5 ? "loss-high" : "loss-normal"}>{formatKg(getLossQuantity(shipment))} kg · {getLossPercentage(shipment).toFixed(1)}%</strong></div></div>
      <div className="journey-route"><div><span>ORIGIN</span><strong>{shipment.origin}</strong><small>{shipment.region}</small></div><div className="journey-line"><i /><span>{shipment.route}</span><i /></div><div className="journey-destination"><span>DESTINATION</span><strong>{shipment.destination}</strong><small>{shipment.actualDate ? formatDate(shipment.actualDate) : "In progress"}</small></div></div>
      <div className="journey-heading"><h3>Quantity through each stage</h3><span>Loss values are stage-specific</span></div>
      <div className="journey-stages">
        {stages.map((stage, index) => <div className="journey-stage" key={stage.label}>
          <div className="journey-stage-top"><span className="stage-step">0{index + 1}</span><span className="journey-stage-label">{stage.label}</span></div>
          <strong>{formatKg(stage.quantity)} <small>kg</small></strong>
          <span className="journey-stage-note">{stage.note}</span>
          <div className="stage-loss-row"><span>Stage loss</span><strong>{formatKg(stage.loss)} kg</strong></div>
        </div>)}
      </div>
      <div className="shipment-detail-meta"><div><span>Facility</span><strong>{shipment.facility}</strong></div><div><span>Route ID</span><strong>{shipment.routeId}</strong></div><div><span>Vehicle</span><strong>{shipment.vehicleId}</strong></div><div><span>Dispatched</span><strong>{formatDate(shipment.dispatchDate)}</strong></div><div><span>Expected</span><strong>{formatDate(shipment.expectedDate)}</strong></div><div><span>Actual delivery</span><strong>{formatDate(shipment.actualDate)}</strong></div></div>
      <div className="modal-footer"><p>Loss = quantity entered − quantity received.</p><button className="button-quiet" onClick={onClose}>Close details</button></div>
    </section>
  </div>
}

export function ShipmentTrackingView({ shipments, onSelect }: { shipments: Shipment[]; onSelect: (shipment: Shipment) => void }) {
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("All statuses")
  const [regionFilter, setRegionFilter] = useState("All regions")
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<"newest" | "oldest" | "highest-loss">("newest")
  const regions = [...new Set(shipments.map((shipment) => shipment.region))]
  const filtered = useMemo(() => shipments.filter((shipment) => {
    const termMatch = !query || `${shipment.id} ${shipment.crop} ${shipment.origin} ${shipment.destination} ${shipment.route}`.toLowerCase().includes(query.toLowerCase())
    const status = getShipmentStatus(shipment)
    return termMatch && (statusFilter === "All statuses" || status === statusFilter) && (regionFilter === "All regions" || shipment.region === regionFilter)
  }).sort((a, b) => sort === "highest-loss" ? getLossPercentage(b) - getLossPercentage(a) : sort === "oldest" ? a.dispatchDate.localeCompare(b.dispatchDate) : b.dispatchDate.localeCompare(a.dispatchDate)), [shipments, query, statusFilter, regionFilter, sort])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const highRisk = shipments.filter((shipment) => getLossPercentage(shipment) >= 5).length
  const inTransit = shipments.filter((shipment) => shipment.status === "In Transit").length
  const delayed = shipments.filter((shipment) => shipment.status === "Delayed").length

  return <div className="page-stack">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> END-TO-END VISIBILITY</div><h1>Shipment tracking</h1><p>Follow produce from the farm gate through to final delivery.</p></div><span className="data-source-badge"><i /> Tracking {shipments.length} shipments</span></div>
    <div className="tracking-stat-strip"><div><span>In transit</span><strong>{inTransit}</strong><i className="strip-green" /></div><div><span>Delayed</span><strong>{delayed}</strong><i className="strip-amber" /></div><div><span>High risk</span><strong>{highRisk}</strong><i className="strip-red" /></div><div><span>Delivered</span><strong>{shipments.filter((item) => item.status === "Delivered").length}</strong><i className="strip-sage" /></div></div>
    <Card className="records-card tracking-card">
      <div className="table-toolbar"><label className="search-control"><Search /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Search shipment, crop or route..." aria-label="Search shipments" /></label><div className="toolbar-filters"><label className="filter-select"><select value={regionFilter} onChange={(event) => { setRegionFilter(event.target.value); setPage(1) }}><option>All regions</option>{regions.map((region) => <option key={region}>{region}</option>)}</select></label><label className="filter-select"><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1) }}><option>All statuses</option><option>Delivered</option><option>In Transit</option><option>Delayed</option><option>High Risk</option></select></label><label className="filter-select"><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest-loss">Highest loss</option></select></label></div></div>
      <div className="table-scroll"><table className="data-table tracking-table"><thead><tr><th>Shipment ID</th><th>Crop</th><th>Origin</th><th>Destination</th><th>Dispatch date</th><th>Expected delivery</th><th>Dispatched</th><th>Received</th><th>Loss</th><th>Status</th><th><span className="sr-only">Details</span></th></tr></thead><tbody>
        {visible.map((shipment) => { const status = getShipmentStatus(shipment); return <tr key={shipment.id} className="clickable-row" onClick={() => onSelect(shipment)}><td className="id-cell">{shipment.id}</td><td>{shipment.crop}</td><td>{shipment.origin}</td><td>{shipment.destination}</td><td>{formatDate(shipment.dispatchDate)}</td><td>{formatDate(shipment.expectedDate)}</td><td>{formatKg(shipment.qtyDispatched)} kg</td><td>{formatKg(shipment.qtyReceived)} kg</td><td className={getLossPercentage(shipment) >= 5 ? "loss-high" : "loss-normal"}>{formatKg(getLossQuantity(shipment))} kg</td><td><span className={`status-pill ${status.toLowerCase().replaceAll(" ", "-")}`}><i />{status}</span></td><td><button className="icon-button row-open" aria-label={`Open ${shipment.id} details`} onClick={(event) => { event.stopPropagation(); onSelect(shipment) }}>↗</button></td></tr> })}
        {!visible.length && <tr><td colSpan={11} className="empty-cell">No shipments match the selected filters.</td></tr>}
      </tbody></table></div>
      <div className="table-footer"><span>Showing <strong>{filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filtered.length)}</strong> of <strong>{filtered.length}</strong> shipments</span><div className="pagination"><button className="icon-button" disabled={page <= 1} aria-label="Previous page" onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft /></button><span>Page {page} of {pageCount}</span><button className="icon-button" disabled={page >= pageCount} aria-label="Next page" onClick={() => setPage((value) => Math.min(pageCount, value + 1))}><ChevronRight /></button></div></div>
    </Card>
    <div className="tracking-journey-banner"><div className="journey-banner-icon">↗</div><div><strong>Every shipment tells a story</strong><p>Open any row to explore its harvest, storage, transportation, and delivery quantities.</p></div><span className="banner-stage-flow">Harvest <i>→</i> Storage <i>→</i> Transit <i>→</i> Delivery</span></div>
  </div>
}
