"use client"

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { getCropTotals, getMonthlyTrend, getRegionTotals, getStageTotals } from "@/lib/agritrack-data"

type MonthlyPoint = ReturnType<typeof getMonthlyTrend>[number]
type StagePoint = ReturnType<typeof getStageTotals>[number]
type CropPoint = ReturnType<typeof getCropTotals>[number]
type RegionPoint = ReturnType<typeof getRegionTotals>[number]

type Props = {
  monthly: MonthlyPoint[]
  stages: StagePoint[]
  crops: CropPoint[]
  regions: RegionPoint[]
}

const lineConfig = {
  loss: { label: "Produce lost (t)", color: "var(--chart-1)" },
  collected: { label: "Collected (t)", color: "var(--chart-2)" },
}

const stageConfig = {
  lossTonnes: { label: "Loss (t)", color: "var(--chart-1)" },
}

const cropConfig = {
  lossTonnes: { label: "Loss (t)", color: "var(--chart-1)" },
}

const regionConfig = {
  lossTonnes: { label: "Loss (t)", color: "var(--chart-1)" },
}

const stageColors = ["#14532d", "#2f855a", "#72a77d", "#c0d9bd"]

export function DashboardCharts({ monthly, stages, crops, regions }: Props) {
  const cropChartData = [...crops].sort((a, b) => a.lostKg - b.lostKg).map((item) => ({
    crop: item.crop,
    lossTonnes: Number((item.lostKg / 1000).toFixed(2)),
    lossPct: item.lossPct,
  }))

  return (
    <>
      <Card className="chart-card trend-card">
        <CardHeader className="chart-card-header">
          <div>
            <CardTitle>Supply chain loss trend</CardTitle>
            <p className="card-subtitle">Monthly losses compared with produce collected</p>
          </div>
          <span className="chart-period">Last 12 months</span>
        </CardHeader>
        <CardContent className="chart-card-content">
          <ChartContainer config={lineConfig} className="chart-frame trend-frame">
            <LineChart data={monthly} margin={{ top: 8, right: 12, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={10} />
              <YAxis axisLine={false} tickLine={false} tickMargin={8} tickFormatter={(value: number) => `${value}t`} />
              <Tooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="loss" stroke="var(--color-loss)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--color-loss)", strokeWidth: 0 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="collected" stroke="var(--color-collected)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ChartContainer>
          <div className="chart-legend">
            <span><i className="legend-dot legend-loss" /> Produce lost</span>
            <span><i className="legend-dot legend-collected" /> Collected</span>
          </div>
        </CardContent>
      </Card>

      <Card className="chart-card stage-card">
        <CardHeader className="chart-card-header">
          <div>
            <CardTitle>Loss by supply stage</CardTitle>
            <p className="card-subtitle">Share of total recorded loss</p>
          </div>
          <span className="chart-kicker">Stage analysis</span>
        </CardHeader>
        <CardContent className="chart-card-content stage-content">
          <ChartContainer config={stageConfig} className="chart-frame donut-frame">
            <PieChart>
              <Tooltip content={<ChartTooltipContent />} />
              <Pie data={stages} dataKey="lossTonnes" nameKey="stage" innerRadius={58} outerRadius={82} paddingAngle={3} stroke="none">
                {stages.map((entry, index) => <Cell key={entry.stage} fill={stageColors[index % stageColors.length]} />)}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="stage-legend">
            {stages.map((stage, index) => (
              <div className="stage-legend-item" key={stage.stage}>
                <span className="stage-swatch" style={{ backgroundColor: stageColors[index % stageColors.length] }} />
                <span className="stage-legend-name">{stage.stage}</span>
                <strong>{stage.lossTonnes.toFixed(1)}t</strong>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="chart-card crop-card">
        <CardHeader className="chart-card-header">
          <div>
            <CardTitle>Crop-wise loss analysis</CardTitle>
            <p className="card-subtitle">Total produce lost by crop, tonnes</p>
          </div>
          <span className="chart-kicker">6 crop types</span>
        </CardHeader>
        <CardContent className="chart-card-content">
          <ChartContainer config={cropConfig} className="chart-frame bar-frame">
            <BarChart data={cropChartData} layout="vertical" margin={{ top: 2, right: 12, left: 4, bottom: 2 }}>
              <CartesianGrid strokeDasharray="3 5" horizontal={false} stroke="var(--border)" />
              <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(value: number) => `${value}`} />
              <YAxis type="category" dataKey="crop" axisLine={false} tickLine={false} width={76} />
              <Tooltip content={<ChartTooltipContent />} />
              <Bar dataKey="lossTonnes" fill="var(--color-lossTonnes)" radius={[0, 5, 5, 0]} barSize={15} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="chart-card region-card">
        <CardHeader className="chart-card-header">
          <div>
            <CardTitle>Regional loss comparison</CardTitle>
            <p className="card-subtitle">Recorded loss across sourcing regions</p>
          </div>
          <span className="chart-kicker">5 regions</span>
        </CardHeader>
        <CardContent className="chart-card-content">
          <ChartContainer config={regionConfig} className="chart-frame region-frame">
            <BarChart data={regions.map((item) => ({ region: item.region.replace(" ", "\n"), lossTonnes: item.lossTonnes }))} margin={{ top: 6, right: 6, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="region" axisLine={false} tickLine={false} tickMargin={10} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(value: number) => `${value}t`} />
              <Tooltip content={<ChartTooltipContent />} />
              <Bar dataKey="lossTonnes" fill="var(--color-lossTonnes)" radius={[5, 5, 0, 0]} barSize={32} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </>
  )
}
