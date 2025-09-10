'use client'

import * as React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceArea,
} from 'recharts'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select' // path: adjust if your Select lives elsewhere
import { useAnimalTimeSeries } from '@/hooks/use-analytics'

type Resolution = '5min' | '15min' | '1hour' | '1day'

interface AnimalPageProps {
  params: {
    id: string
  }
}

type ApiPoint = {
  timestamp: string
  avgTemperature?: string | number
  avgHeartRate?: string | number
  readingCount?: string | number
}

type SeriesPoint = {
  ts: string
  temperature?: number | null
  heartRate?: number | null
  readingCount?: number | null
}

const fmt = new Intl.DateTimeFormat(undefined, {
  year: '2-digit',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

function asNum(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = typeof v === 'string' ? parseFloat(v) : (v as number)
  return Number.isFinite(n) ? n : null
}

function mean(nums: Array<number | null | undefined>): number | null {
  const arr = nums.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
  if (!arr.length) return null
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function stdDev(nums: Array<number | null | undefined>): number | null {
  const m = mean(nums)
  if (m == null) return null
  const arr = nums.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
  const v = arr.reduce((acc, n) => acc + Math.pow(n - m, 2), 0) / arr.length
  return Math.sqrt(v)
}

export default function AnimalPage({ params }: AnimalPageProps) {
  // ---- Stable hooks (never behind conditionals) ----
  const routeId = params?.id ?? '' // keep stable; don't early-return before hooks
  const [resolution, setResolution] = React.useState<Resolution>('15min')
  const [hours, setHours] = React.useState<number>(24)
  const [showTemp, setShowTemp] = React.useState<boolean>(true)
  const [showHr, setShowHr] = React.useState<boolean>(true)

  // Build metrics string (fallback to both if user turns both off)
  const metrics = React.useMemo(() => {
    const m: string[] = []
    if (showTemp) m.push('temperature')
    if (showHr) m.push('heartRate')
    return m.length ? m.join(',') : 'temperature,heartRate'
  }, [showTemp, showHr])

  const { data, isLoading, error } = useAnimalTimeSeries(routeId, resolution, hours, metrics)

  // ---- Safe transforms (pure, no hooks) ----
  const payload = data?.data
  const rawPoints: ApiPoint[] = (payload?.data ?? []) as ApiPoint[]

  const series: SeriesPoint[] = React.useMemo(() => {
    const sorted = [...rawPoints].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    return sorted.map((p) => ({
      ts: p.timestamp,
      temperature: asNum(p.avgTemperature ?? null),
      heartRate: asNum(p.avgHeartRate ?? null),
      readingCount: asNum(p.readingCount ?? null),
    }))
  }, [rawPoints])

  const tempValues = series.map((d) => d.temperature ?? null)
  const hrValues = series.map((d) => d.heartRate ?? null)
  const tempAvg = payload?.analytics?.temperature?.average ?? mean(tempValues)
  const tempStd = payload?.analytics?.temperature?.stdDev ?? stdDev(tempValues)
  const hrAvg = payload?.analytics?.heartRate?.average ?? mean(hrValues)
  const hrStd = payload?.analytics?.heartRate?.stdDev ?? stdDev(hrValues)
  const latest = series.at(-1)

  // ---- UI ----
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Animal {(payload?.animalId ?? routeId) || '—'} — Time Series</h2>
        <p className="text-sm text-muted-foreground">
          Resolution:{' '}
          <span className="font-medium">
            {payload?.resolution ?? resolution}
          </span>{' '}
          · Range:{' '}
          <span className="font-medium">
            {payload?.summary?.timeRange?.from
              ? fmt.format(new Date(payload.summary.timeRange.from))
              : '—'}{' '}
            →{' '}
            {payload?.summary?.timeRange?.to
              ? fmt.format(new Date(payload.summary.timeRange.to))
              : '—'}
          </span>
        </p>
        {data?.timestamp && (
          <p className="text-xs text-muted-foreground mt-1">
            Last updated: {fmt.format(new Date(data.timestamp))}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="min-w-[180px]">
          <label className="block text-xs mb-1 text-muted-foreground">Resolution</label>
          <Select value={resolution} onValueChange={(v: Resolution) => setResolution(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Bucket</SelectLabel>
                <SelectItem value="5min">5 minutes</SelectItem>
                <SelectItem value="15min">15 minutes</SelectItem>
                <SelectItem value="1hour">1 hour</SelectItem>
                <SelectItem value="1day">1 day</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[180px]">
          <label className="block text-xs mb-1 text-muted-foreground">Window</label>
          <Select value={String(hours)} onValueChange={(v) => setHours(Number(v))}>
            <SelectTrigger>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Hours</SelectLabel>
                <SelectItem value="6">Last 6h</SelectItem>
                <SelectItem value="12">Last 12h</SelectItem>
                <SelectItem value="24">Last 24h</SelectItem>
                <SelectItem value="48">Last 48h</SelectItem>
                <SelectItem value="72">Last 72h</SelectItem>
                <SelectItem value="168">Last 7d</SelectItem>
                <SelectItem value="720">Last 30d</SelectItem>
                <SelectItem value="4320">Last 6m</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={showTemp}
              onChange={(e) => setShowTemp(e.target.checked)}
            />
            Temperature (°C)
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={showHr}
              onChange={(e) => setShowHr(e.target.checked)}
            />
            Heart Rate (bpm)
          </label>
        </div>
      </div>

      {/* Status messages (do NOT change hook order) */}
      {(!routeId || routeId.length === 0) && (
        <div className="rounded-md border p-3 text-sm">
          Missing animal id in route.
        </div>
      )}

      {isLoading && (
        <div className="text-sm text-muted-foreground">Loading data…</div>
      )}

      {error && (
        <div className="text-sm text-red-600">Something went wrong loading data.</div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Temperature</h3>
            <span className="text-xs text-muted-foreground">{resolution}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground">Current</div>
              <div className="text-lg font-semibold">
                {latest?.temperature != null ? `${latest.temperature.toFixed(2)} °C` : '—'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Average</div>
              <div className="text-lg font-semibold">
                {tempAvg != null ? `${(+tempAvg).toFixed(2)} °C` : '—'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Min</div>
              <div className="text-lg font-semibold">
                {payload?.analytics?.temperature?.min != null
                  ? `${payload.analytics.temperature.min} °C`
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Max</div>
              <div className="text-lg font-semibold">
                {payload?.analytics?.temperature?.max != null
                  ? `${payload.analytics.temperature.max} °C`
                  : '—'}
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            σ:&nbsp;{tempStd != null ? tempStd.toFixed(2) : '—'} · Trend:&nbsp;
            {payload?.analytics?.temperature?.trend ?? '—'}
          </div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Heart Rate</h3>
            <span className="text-xs text-muted-foreground">{resolution}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground">Current</div>
              <div className="text-lg font-semibold">
                {latest?.heartRate != null ? `${latest.heartRate.toFixed(0)} bpm` : '—'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Average</div>
              <div className="text-lg font-semibold">
                {hrAvg != null ? `${(+hrAvg).toFixed(0)} bpm` : '—'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Min</div>
              <div className="text-lg font-semibold">
                {payload?.analytics?.heartRate?.min != null
                  ? `${payload.analytics.heartRate.min} bpm`
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Max</div>
              <div className="text-lg font-semibold">
                {payload?.analytics?.heartRate?.max != null
                  ? `${payload.analytics.heartRate.max} bpm`
                  : '—'}
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            σ:&nbsp;{hrStd != null ? hrStd.toFixed(0) : '—'} · Trend:&nbsp;
            {payload?.analytics?.heartRate?.trend ?? '—'}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-2xl border p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Time Series</h3>
          <div className="text-xs text-muted-foreground">
            Points: {series.length.toLocaleString()}
            {payload?.summary?.coverage != null ? ` · Coverage: ${payload.summary.coverage}%` : ''}
          </div>
        </div>

        <div className="h-[420px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 10, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="ts"
                tickFormatter={(v) => fmt.format(new Date(v))}
                minTickGap={24}
              />
              <YAxis
                yAxisId="temp"
                domain={['auto', 'auto']}
                allowDecimals
                tickFormatter={(v) => `${Number(v).toFixed(1)}°`}
              />
              <YAxis
                yAxisId="hr"
                orientation="right"
                domain={['auto', 'auto']}
                tickFormatter={(v) => `${Math.round(Number(v))}`}
              />
              <Tooltip
                labelFormatter={(v) => fmt.format(new Date(v))}
                formatter={(value: any, name: string) => {
                  if (name === 'temperature') return [`${Number(value).toFixed(2)} °C`, 'Temperature']
                  if (name === 'heartRate') return [`${Math.round(Number(value))} bpm`, 'Heart Rate']
                  return [value, name]
                }}
              />
              <Legend />

              {/* Keep child count stable; just toggle visibility */}
              <Line
                type="monotone"
                name="temperature"
                yAxisId="temp"
                dataKey="temperature"
                dot={false}
                strokeWidth={2}
                connectNulls
                hide={!showTemp}
              />
              <Line
                type="monotone"
                name="heartRate"
                yAxisId="hr"
                dataKey="heartRate"
                dot={false}
                strokeWidth={2}
                connectNulls
                hide={!showHr}
                stroke='#ef4444'
              />

              <Brush
                dataKey="ts"
                height={24}
                tickFormatter={(v) =>
                  new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              />
              {/* Typical bovine temp band (~38.0–39.3 °C). Remove if N/A. */}
              <ReferenceArea yAxisId="temp" y1={38.0} y2={39.3} fillOpacity={0.08} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Raw payload (collapsible) */}
      <details className="rounded-2xl border p-4">
        <summary className="cursor-pointer font-medium">Raw response payload</summary>
        <pre className="mt-3 max-h-[360px] overflow-auto text-xs bg-muted/30 p-3 rounded">
{JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  )
}
