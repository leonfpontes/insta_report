import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { dLabel, ddmm, hm, n, type Pt } from "@/lib/model";

/** Linha de uma métrica no tempo, com tooltip ao tocar. `modo` decide o rótulo do eixo. */
export function TimeLine({ pts, label, modo, height = 200 }: { pts: Pt[]; label: string; modo: "hora" | "dia"; height?: number }) {
  if (pts.length < 2) return <p className="text-sm text-muted-foreground">A linha aparece depois da primeira coleta.</p>;
  const span = pts[pts.length - 1].t - pts[0].t;
  const curto = span < 3 * 86400000;
  const tick = (t: number) => (curto ? `${ddmm(t)} ${hm(t)}` : dLabel(t));
  const config = { v: { label, color: "var(--c, var(--ink))" } } satisfies ChartConfig;
  const inteiro = (v: number) => (Number.isInteger(v) ? n(v) : "");
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <LineChart data={pts} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={tick} tickLine={false} axisLine={false} minTickGap={36} tickMargin={8} />
        <YAxis width={40} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={inteiro} />
        <ChartTooltip
          cursor
          content={
            <ChartTooltipContent
              hideIndicator
              labelFormatter={(_, p) => {
                const x = p?.[0]?.payload as Pt | undefined;
                if (!x) return "";
                return x.origem ? "Publicação" : modo === "dia" ? dLabel(x.t) : `${dLabel(x.t)}, ${hm(x.t)}`;
              }}
              formatter={(v) => (
                <span className="flex w-full justify-between gap-4">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="num font-medium text-foreground">{n(v as number)}</span>
                </span>
              )}
            />
          }
        />
        <Line dataKey="v" type="linear" stroke="var(--color-v)" strokeWidth={2.5} dot={modo === "hora" && pts.length <= 60 ? { r: 2.5, fill: "var(--color-v)" } : false} activeDot={{ r: 5 }} isAnimationActive={false} />
      </LineChart>
    </ChartContainer>
  );
}
