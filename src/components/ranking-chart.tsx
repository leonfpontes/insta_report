import { CartesianGrid, ReferenceArea, ReferenceLine, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { ACC, cleanTitle, dLabel, ddmm, type Conta } from "@/lib/model";
import { LIM, NIVEL, fmtX, type RankItem } from "@/lib/ranking";

type Pt = { t: number; y: number; it: RankItem };
const PISO = 0.1;

/** Cada post é um ponto: data × vezes o normal da conta, em escala log (1× no meio). */
export function RankChart({ itens, contas, valor, onPick, height = 300 }: {
  itens: RankItem[]; contas: Conta[]; valor: (it: RankItem) => string; onPick: (it: RankItem) => void; height?: number;
}) {
  const pts = itens.filter((i) => i.x != null).map((it) => ({ t: +new Date(it.p.quando), y: Math.max(PISO, it.x!), it }));
  if (pts.length < 2) return <p className="text-sm text-muted-foreground">O gráfico aparece quando houver pelo menos 2 posts com números.</p>;
  const topo = Math.max(LIM.viral * 1.6, ...pts.map((p) => p.y * 1.25));
  const config = Object.fromEntries(contas.map((c) => [c, { label: ACC[c].label, color: ACC[c].cor }])) satisfies ChartConfig;
  const ticks = [0.1, 0.25, 0.5, 1, 2, 3, 5, 10, 20, 50].filter((v) => v <= topo);
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <ScatterChart margin={{ top: 10, right: 12, left: 0, bottom: 0 }} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <ReferenceArea y1={LIM.fora} y2={topo} fill="var(--ok)" fillOpacity={0.07} ifOverflow="hidden" />
        <ReferenceArea y1={PISO} y2={LIM.flop} fill="var(--crit)" fillOpacity={0.06} ifOverflow="hidden" />
        <ReferenceLine y={1} stroke="var(--muted-foreground)" strokeDasharray="4 4" label={{ value: "normal da conta", position: "insideTopRight", fontSize: 11, fill: "var(--muted-foreground)" }} />
        <ReferenceLine y={LIM.viral} stroke="var(--ok)" strokeDasharray="2 4" label={{ value: "viralizou", position: "insideTopLeft", fontSize: 11, fill: "var(--ok)" }} />
        <ReferenceLine y={LIM.flop} stroke="var(--crit)" strokeDasharray="2 4" label={{ value: "flop", position: "insideBottomLeft", fontSize: 11, fill: "var(--crit)" }} />
        <XAxis dataKey="t" type="number" scale="time" domain={["dataMin - 43200000", "dataMax + 43200000"]} tickFormatter={(t) => ddmm(t)} tickLine={false} axisLine={false} minTickGap={32} tickMargin={8} />
        <YAxis dataKey="y" type="number" scale="log" domain={[PISO, topo]} ticks={ticks} allowDataOverflow tickFormatter={(v) => fmtX(v)} width={44} tickLine={false} axisLine={false} />
        <ZAxis range={[90, 90]} />
        <Tooltip
          cursor={false}
          content={({ payload }) => {
            const it = (payload?.[0]?.payload as Pt | undefined)?.it;
            if (!it) return null;
            return (
              <div className="grid max-w-64 gap-1 rounded-lg border bg-background px-3 py-2 text-xs shadow-xl">
                <span className="line-clamp-2 font-medium text-ink">{cleanTitle((it.p.legenda || "(sem legenda)").split("\n")[0])}</span>
                <span className="text-muted-foreground">{ACC[it.p.conta].label} · {dLabel(it.p.quando)}</span>
                <span className="num text-foreground">{valor(it)} · {fmtX(it.x)} o normal · {NIVEL[it.nivel]}</span>
                <span className="text-muted-foreground">Toque para abrir</span>
              </div>
            );
          }}
        />
        {contas.map((c) => (
          <Scatter
            key={c}
            name={ACC[c].label}
            data={pts.filter((p) => p.it.p.conta === c)}
            fill={ACC[c].cor}
            stroke="var(--card)"
            strokeWidth={1.5}
            isAnimationActive={false}
            className="cursor-pointer"
            onClick={(d: any) => d?.payload?.it && onPick(d.payload.it)}
          />
        ))}
      </ScatterChart>
    </ChartContainer>
  );
}
