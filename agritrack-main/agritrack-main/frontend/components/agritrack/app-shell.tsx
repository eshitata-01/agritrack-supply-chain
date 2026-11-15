"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Activity, Bell, ChevronDown, ChevronLeft, CircleHelp, Code2, Database, FileBarChart2, LayoutDashboard, Leaf, Menu, PackageSearch, Search, ShieldAlert, Sprout, Truck, Warehouse, X } from "lucide-react"
import { DashboardView } from "@/components/agritrack/dashboard-view"
import { CropAnalyticsView, StorageMonitoringView, TransportationView } from "@/components/agritrack/analytics-views"
import { RecordsView } from "@/components/agritrack/records-view"
import { LossDetectionView, ReportsView, SqlInsightsView } from "@/components/agritrack/insight-views"
import { ShipmentDetailDialog, ShipmentTrackingView } from "@/components/agritrack/shipment-tracking-view"
import { getLossPercentage, getShipmentStatus, type CropDefinition, type Shipment } from "@/lib/agritrack-data"
import { ApiError, createRecord, deleteRecord, getAgriTrackData, updateRecord, type FacilityRecord, type RouteRecord } from "@/services/api"

type NavItem = { label: string; icon: typeof LayoutDashboard; badge?: string }
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "OVERVIEW", items: [{ label: "Dashboard", icon: LayoutDashboard }] },
  { label: "OPERATIONS", items: [
    { label: "Supply Chain Records", icon: Database },
    { label: "Crop Analytics", icon: Sprout },
    { label: "Storage Monitoring", icon: Warehouse },
    { label: "Transportation", icon: Truck },
    { label: "Shipment Tracking", icon: PackageSearch },
    { label: "Loss Detection", icon: ShieldAlert, badge: "Live" },
  ] },
  { label: "INSIGHTS", items: [
    { label: "Reports", icon: FileBarChart2 },
    { label: "SQL Insights", icon: Code2 },
  ] },
]

function Sidebar({ activePage, onNavigate, collapsed, setCollapsed, mobileOpen, closeMobile }: {
  activePage: string
  onNavigate: (page: string) => void
  collapsed: boolean
  setCollapsed: (value: boolean) => void
  mobileOpen: boolean
  closeMobile: () => void
}) {
  return <>
    {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={closeMobile} />}
    <aside className={`app-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`} aria-label="Primary navigation">
      <div className="brand-row"><div className="brand-symbol"><Leaf aria-hidden="true" /></div><div className="brand-copy"><strong>agri<span>track</span></strong><small>SUPPLY CHAIN INTELLIGENCE</small></div><button className="icon-button mobile-close" onClick={closeMobile} aria-label="Close navigation"><X /></button></div>
      <div className="workspace-switcher"><div className="workspace-avatar">NV</div><div className="workspace-copy"><strong>Navami Ventures</strong><small>Operations workspace</small></div><ChevronDown aria-hidden="true" /></div>
      <nav className="sidebar-nav">{NAV_GROUPS.map((group) => <div className="nav-group" key={group.label}><span className="nav-group-label">{group.label}</span>{group.items.map(({ label, icon: Icon, badge }) => <button className={`nav-item ${activePage === label ? "active" : ""}`} key={label} onClick={() => onNavigate(label)} title={collapsed ? label : undefined} aria-current={activePage === label ? "page" : undefined}><Icon aria-hidden="true" /><span>{label}</span>{badge && <small>{badge}</small>}</button>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-help"><span className="help-icon"><CircleHelp /></span><div><strong>Need a hand?</strong><small>Explore the project guide</small></div><span className="help-arrow">↗</span></div><div className="sidebar-user"><div className="user-avatar">AK</div><div className="user-copy"><strong>Arjun Kumar</strong><small>Workspace admin</small></div><button className="icon-button user-menu-button" aria-label="Open account menu"><span>•••</span></button></div><button className="collapse-button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}><ChevronLeft /><span>{collapsed ? "Expand sidebar" : "Collapse sidebar"}</span></button></div>
    </aside>
  </>
}

function GlobalSearch({ shipments, value, onValue, onSelect }: { shipments: Shipment[]; value: string; onValue: (value: string) => void; onSelect: (shipment: Shipment) => void }) {
  const [open, setOpen] = useState(false)
  const results = useMemo(() => value.trim().length < 2 ? [] : shipments.filter((item) => `${item.id} ${item.crop} ${item.region} ${item.origin} ${item.destination} ${item.route} ${getShipmentStatus(item)}`.toLowerCase().includes(value.toLowerCase())).slice(0, 5), [shipments, value])
  return <div className="global-search-wrap"><label className="global-search"><Search aria-hidden="true" /><input value={value} onFocus={() => setOpen(true)} onChange={(event) => { onValue(event.target.value); setOpen(true) }} placeholder="Search records, crops, routes..." aria-label="Search shipments and crops" /><kbd>⌘ K</kbd></label>
    {open && value.trim().length >= 2 && <div className="search-results" role="listbox" aria-label="Search results">{results.length ? results.map((shipment) => <button role="option" aria-selected="false" key={shipment.id} onClick={() => { onSelect(shipment); onValue(""); setOpen(false) }}><span className="search-result-icon"><PackageSearch /></span><span><strong>{shipment.id} · {shipment.crop}</strong><small>{shipment.origin} → {shipment.destination} · {shipment.region}</small></span><span className={`search-result-status ${getLossPercentage(shipment) >= 5 ? "loss-high" : ""}`}>{getShipmentStatus(shipment)}</span></button>) : <div className="search-empty">No matching shipment records.</div>}<button className="search-dismiss" onClick={() => setOpen(false)}>Close search</button></div>}
  </div>
}

export function AgriTrackApp() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [cropCatalog, setCropCatalog] = useState<CropDefinition[]>([])
  const [facilityCatalog, setFacilityCatalog] = useState<FacilityRecord[]>([])
  const [routeCatalog, setRouteCatalog] = useState<RouteRecord[]>([])
  const [regionCatalog, setRegionCatalog] = useState<string[]>([])
  const [dataMode, setDataMode] = useState<"loading" | "oracle" | "error">("loading")
  const [dataError, setDataError] = useState("")
  const [activePage, setActivePage] = useState("Dashboard")
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [helpOpen, setHelpOpen] = useState(false)
  const cropNames = useMemo(() => cropCatalog.map((crop) => crop.name), [cropCatalog])
  const highRisk = shipments.filter((item) => getLossPercentage(item) >= 5)
  const delayed = shipments.filter((item) => item.status === "Delayed")

  const loadData = useCallback(async () => {
    setDataMode("loading")
    setDataError("")
    try {
      const data = await getAgriTrackData()
      setShipments(data.shipments)
      setCropCatalog(data.crops)
      setFacilityCatalog(data.facilities)
      setRouteCatalog(data.routes)
      setRegionCatalog(data.regions)
      setDataMode("oracle")
    } catch (error) {
      setShipments([])
      setCropCatalog([])
      setFacilityCatalog([])
      setRouteCatalog([])
      setRegionCatalog([])
      setDataMode("error")
      setDataError(error instanceof ApiError ? error.message : "The Oracle API could not load dashboard data.")
    }
  }, [])

  useEffect(() => { void loadData() }, [loadData])

  useEffect(() => {
    if (!toastMessage) return
    const timer = window.setTimeout(() => setToastMessage(""), 3600)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); document.querySelector<HTMLInputElement>(".global-search input")?.focus() }
      if (event.key === "Escape") { setNotificationOpen(false); setProfileOpen(false); setHelpOpen(false) }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  function navigate(page: string) {
    setActivePage(page)
    setMobileOpen(false)
    setNotificationOpen(false)
    setProfileOpen(false)
    setHelpOpen(false)
  }

  function notify(message: string) {
    setToastMessage(message)
  }

  async function refreshOracleData() {
    const data = await getAgriTrackData()
    setShipments(data.shipments)
    setCropCatalog(data.crops)
    setFacilityCatalog(data.facilities)
    setRouteCatalog(data.routes)
    setRegionCatalog(data.regions)
  }

  async function persistRecord(resource: "shipment" | "crop", record: Record<string, unknown>, isNew: boolean, isDelete = false, syncLossEvents = false) {
    if (dataMode !== "oracle") throw new Error("Oracle is not connected; record changes were not saved.")
    const id = Number(String(record.id ?? "").replace(/^[A-Z]+-/, ""))
    if (isDelete) await deleteRecord(resource, id)
    else if (isNew) await createRecord(resource, record)
    else await updateRecord(resource, id, { ...record, syncLossEvents })
  }

  async function applyShipments(next: Shipment[]) {
    if (dataMode !== "oracle") { notify(dataError || "Oracle is not connected; no changes were saved."); return }
    const previous = shipments
    try {
      for (const item of previous) if (!next.some((candidate) => candidate.id === item.id)) await persistRecord("shipment", item as unknown as Record<string, unknown>, false, true)
      for (const item of next) {
        const prior = previous.find((candidate) => candidate.id === item.id)
        if (!prior || JSON.stringify(prior) !== JSON.stringify(item)) await persistRecord("shipment", item as unknown as Record<string, unknown>, !prior, false, Boolean(prior && JSON.stringify(prior.stageLoss) !== JSON.stringify(item.stageLoss)))
      }
      await refreshOracleData()
      notify("Oracle records saved. Analytics refreshed.")
    } catch (error) {
      await loadData()
      notify(error instanceof Error ? error.message : "Oracle save failed.")
    }
  }

  async function applyCrops(next: CropDefinition[]) {
    if (dataMode !== "oracle") { notify(dataError || "Oracle is not connected; no changes were saved."); return }
    const previous = cropCatalog
    try {
      for (const item of previous) if (!next.some((candidate) => candidate.id === item.id)) await persistRecord("crop", { ...item, name: item.name }, false, true)
      for (const item of next) {
        const prior = previous.find((candidate) => candidate.id === item.id)
        if (!prior) await persistRecord("crop", { ...item, name: item.name }, true)
        else if (JSON.stringify(prior) !== JSON.stringify(item)) await persistRecord("crop", { ...item, name: item.name }, false)
      }
      await refreshOracleData()
      notify("Crop catalog saved to Oracle.")
    } catch (error) {
      await loadData()
      notify(error instanceof Error ? error.message : "Oracle save failed.")
    }
  }

  let content
  if (activePage === "Dashboard") content = <DashboardView shipments={shipments} crops={cropNames} dataMode={dataMode} onOpenShipment={setSelectedShipment} onNavigate={navigate} />
  else if (activePage === "Supply Chain Records") content = <RecordsView shipments={shipments} crops={cropCatalog} facilities={facilityCatalog} routes={routeCatalog} regions={regionCatalog} dataMode={dataMode} onChangeShipments={applyShipments} onChangeCrops={applyCrops} onNotify={notify} />
  else if (activePage === "Crop Analytics") content = <CropAnalyticsView shipments={shipments} crops={cropNames} regions={regionCatalog} />
  else if (activePage === "Storage Monitoring") content = <StorageMonitoringView shipments={shipments} crops={cropNames} regions={regionCatalog} />
  else if (activePage === "Transportation") content = <TransportationView shipments={shipments} crops={cropNames} regions={regionCatalog} />
  else if (activePage === "Shipment Tracking") content = <ShipmentTrackingView shipments={shipments} onSelect={setSelectedShipment} />
  else if (activePage === "Loss Detection") content = <LossDetectionView shipments={shipments} crops={cropNames} regions={regionCatalog} />
  else if (activePage === "Reports") content = <ReportsView shipments={shipments} crops={cropNames} dataMode={dataMode} />
  else content = <SqlInsightsView />

  const today = new Intl.DateTimeFormat("en", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).format(new Date())

  return <div className="agritrack-app">
    <Sidebar activePage={activePage} onNavigate={navigate} collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} closeMobile={() => setMobileOpen(false)} />
    <div className={`app-main ${collapsed ? "sidebar-collapsed" : ""}`}>
      <header className="topbar"><button className="mobile-menu-button icon-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu /></button><div className="topbar-breadcrumb"><span>AgriTrack</span><span className="breadcrumb-slash">/</span><strong>{activePage}</strong></div><span className={`data-mode-indicator ${dataMode}`}>{dataMode === "loading" ? "Connecting" : dataMode === "oracle" ? "Oracle live" : "Database error"}</span><GlobalSearch shipments={shipments} value={search} onValue={setSearch} onSelect={(shipment) => { navigate("Shipment Tracking"); setSelectedShipment(shipment) }} /><div className="topbar-actions"><span className="topbar-date">{today}</span><div className="topbar-popover-wrap"><button className={`icon-button topbar-icon ${notificationOpen ? "selected" : ""}`} aria-label={`Notifications, ${highRisk.length + delayed.length} items`} aria-expanded={notificationOpen} onClick={() => { setNotificationOpen((open) => !open); setProfileOpen(false) }}><Bell /><i className="notification-dot" /></button>{notificationOpen && <div className="topbar-popover notification-popover"><div className="popover-heading"><strong>Operations alerts</strong><span>{highRisk.length + delayed.length} to review</span></div>{highRisk.slice(0, 3).map((shipment) => <button key={`risk-${shipment.id}`} onClick={() => { setSelectedShipment(shipment); setNotificationOpen(false) }}><span className="popover-alert-icon red"><ShieldAlert /></span><span><strong>{shipment.id} · {shipment.crop}</strong><small>{getLossPercentage(shipment).toFixed(1)}% recorded loss · {shipment.region}</small></span></button>)}{delayed.slice(0, 2).map((shipment) => <button key={`delay-${shipment.id}`} onClick={() => { setSelectedShipment(shipment); setNotificationOpen(false) }}><span className="popover-alert-icon amber"><Activity /></span><span><strong>{shipment.id} is delayed</strong><small>{shipment.origin} to {shipment.destination}</small></span></button>)}{!highRisk.length && !delayed.length && <p className="popover-empty">All shipments look on track.</p>}<button className="popover-footer-link" onClick={() => navigate("Loss Detection")}>Open loss detection <span>→</span></button></div>}</div><div className="topbar-popover-wrap"><button className="profile-top-button" onClick={() => { setProfileOpen((open) => !open); setNotificationOpen(false) }} aria-expanded={profileOpen}><span className="user-avatar small-avatar">AK</span><ChevronDown aria-hidden="true" /></button>{profileOpen && <div className="topbar-popover profile-popover"><div className="profile-popover-header"><span className="user-avatar">AK</span><div><strong>Arjun Kumar</strong><small>Navami Ventures</small></div></div><button onClick={() => { setProfileOpen(false); setHelpOpen(true) }}>Workspace information</button><button onClick={() => navigate("SQL Insights")}>Data source settings</button><div className="profile-footer">{dataMode === "oracle" ? "Oracle workspace · Live data" : dataMode === "loading" ? "Checking data connection…" : "Database unavailable · Edits disabled"}</div></div>}</div></div></header>
      <main className="main-content" id="main-content">
        {dataMode === "loading" && <div className="database-status-banner" role="status">Connecting to Oracle and loading dashboard records…</div>}
        {dataMode === "error" && <div className="database-status-banner error" role="alert"><div><strong>Oracle data unavailable</strong><span>{dataError || "Dashboard records were not loaded."}</span></div><button className="button-quiet" onClick={() => void loadData()}>Retry connection</button></div>}
        {content}
      </main>
      <footer className="app-footer"><span>© 2026 AgriTrack · Project prototype</span><span>{dataMode === "loading" ? "Connecting to Oracle…" : dataMode === "oracle" ? "Live Oracle data" : "Oracle unavailable · No sample data displayed"}</span></footer>
    </div>
    {selectedShipment && <ShipmentDetailDialog shipment={selectedShipment} onClose={() => setSelectedShipment(null)} />}
    {toastMessage && <div className="toast-message" role="status"><span className="toast-check">✓</span>{toastMessage}<button aria-label="Dismiss notification" onClick={() => setToastMessage("")}>×</button></div>}
    {helpOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setHelpOpen(false) }}><section className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title"><div className="modal-heading"><div><span className="modal-eyebrow">WORKSPACE GUIDE</span><h2 id="help-title">About this project</h2></div><button className="icon-button" onClick={() => setHelpOpen(false)} aria-label="Close"><X /></button></div><p className="help-modal-copy">AgriTrack is an agricultural supply-chain dashboard for monitoring produce movement and post-harvest loss. {dataMode === "oracle" ? "This workspace is currently reading its operational records from Oracle." : dataMode === "loading" ? "The app is checking Oracle availability." : "Oracle could not be reached, so the app is showing a connection error without substituting sample records."}</p><div className="help-modal-points"><div><strong>Data model</strong><span>{shipments.length} loaded shipment records across {cropCatalog.length} crops.</span></div><div><strong>Data lifecycle</strong><span>{dataMode === "oracle" ? "Supported shipment and crop edits are sent to Oracle and reload the shared analytics." : "Edits are disabled until Oracle data is available."}</span></div><div><strong>Oracle integration</strong><span>The SQL Insights page executes the eight allowlisted reports on the server when Oracle is available.</span></div></div><button className="button-primary" onClick={() => { setHelpOpen(false); navigate("Supply Chain Records") }}>Open data management <span aria-hidden="true">→</span></button></section></div>}
  </div>
}
