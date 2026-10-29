import { useRef } from "react";
import { CartesianGrid, ReferenceArea, ReferenceLine, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { ACC, cleanTitle, dLabel, ddmm, type Conta } from "@/lib/model";
import { LIM, NIVEL, fmtX, type RankItem } from "@/lib/ranking";

type Pt = { t: number; y: number; it: RankItem };
const PISO = 0.1;

// Área do gráfico dentro do SVG, igual às margens e eixos abaixo.
const M = { top: 10, right: 12, eixoY: 44, eixoX: 30 };
const MEIO_DIA = 43200000;

/**
 * Cada post é um ponto: data × vezes o normal da conta, em escala log (1× no meio).
 * Tocar em qualquer lugar seleciona o post mais perto do dedo, porque um ponto é pequeno demais para mirar no celular.
 */
export function RankChart({ itens, contas, valor, sel, onSelect, height = 300, dica = true }: {
  itens: RankItem[]; contas: Conta[]; valor: (it: RankItem) => string; sel: string | null; onSelect: (it: RankItem) => void; height?: number; dica?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const pts = itens.filter((i) => i.x != null).map((it) => ({ t: +new Date(it.p.quando), y: Math.max(PISO, it.x!), it }));
  if (pts.length < 2) return <p className="text-sm text-muted-foreground">O gráfico aparece quando houver pelo menos 2 posts com números.</p>;
  const topo = Math.max(LIM.viral * 1.6, ...pts.map((p) => p.y * 1.25));
  const t0 = Math.min(...pts.map((p) => p.t)) - MEIO_DIA, t1 = Math.max(...pts.map((p) => p.t)) + MEIO_DIA;
  const escolher = (e: React.PointerEvent) => {
    const r = box.current?.getBoundingClientRect(); if (!r) return;
    const w = r.width - M.eixoY - M.right, h = height - M.top - M.eixoX;
    const px = (p: Pt) => M.eixoY + ((p.t - t0) / (t1 - t0)) * w;
    const py = (p: Pt) => M.top + ((Math.log(topo) - Math.log(p.y)) / (Math.log(topo) - Math.log(PISO))) * h;
    const x = e.clientX - r.left, y = e.clientY - r.top;
    let melhor: Pt | null = null, d = Infinity;
    for (const p of pts) { const dd = (px(p) - x) ** 2 + (py(p) - y) ** 2; if (dd < d) { d = dd; melhor = p; } }
    if (melhor) onSelect(melhor.it);
  };
  const ativo = pts.filter((p) => p.it.p.id === sel);
  const config = Object.fromEntries(contas.map((c) => [c, { label: ACC[c].label, color: ACC[c].cor }])) satisfies ChartConfig;
  const ticks = [0.1, 0.25, 0.5, 1, 2, 3, 5, 10, 20, 50].filter((v) => v <= topo);
  return (
    <div ref={box} onPointerUp={escolher} className="cursor-pointer touch-pan-y select-none">
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <ScatterChart margin={{ top: M.top, right: M.right, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <ReferenceArea y1={LIM.fora} y2={topo} fill="var(--ok)" fillOpacity={0.07} ifOverflow="hidden" />
        <ReferenceArea y1={PISO} y2={LIM.flop} fill="var(--crit)" fillOpacity={0.06} ifOverflow="hidden" />
        <ReferenceLine y={1} stroke="var(--muted-foreground)" strokeDasharray="4 4" label={{ value: "normal da conta", position: "insideTopRight", fontSize: 11, fill: "var(--muted-foreground)" }} />
        <ReferenceLine y={LIM.viral} stroke="var(--ok)" strokeDasharray="2 4" label={{ value: "viralizou", position: "insideTopLeft", fontSize: 11, fill: "var(--ok)" }} />
        <ReferenceLine y={LIM.flop} stroke="var(--crit)" strokeDasharray="2 4" label={{ value: "flop", position: "insideBottomLeft", fontSize: 11, fill: "var(--crit)" }} />
        <XAxis dataKey="t" type="number" scale="time" domain={[t0, t1]} height={M.eixoX} tickFormatter={(t) => ddmm(t)} tickLine={false} axisLine={false} minTickGap={32} tickMargin={8} />
        <YAxis dataKey="y" type="number" scale="log" domain={[PISO, topo]} ticks={ticks} allowDataOverflow tickFormatter={(v) => fmtX(v)} width={M.eixoY} tickLine={false} axisLine={false} />
        <ZAxis range={dica ? [90, 90] : [140, 140]} />
        {dica ? <Tooltip
          cursor={false}
          content={({ payload }) => {
            const it = (payload?.[0]?.payload as Pt | undefined)?.it;
            if (!it) return null;
            return (
              <div className="grid max-w-64 gap-1 rounded-lg border bg-background px-3 py-2 text-xs shadow-xl">
                <span className="line-clamp-2 font-medium text-ink">{cleanTitle((it.p.legenda || "(sem legenda)").split("\n")[0])}</span>
                <span className="text-muted-foreground">{ACC[it.p.conta].label} · {dLabel(it.p.quando)}</span>
                <span className="num text-foreground">{valor(it)} · {fmtX(it.x)} o normal · {NIVEL[it.nivel]}</span>
                <span className="text-muted-foreground">Clique para ver embaixo</span>
              </div>
            );
          }}
        /> : null}
        {contas.map((c) => (
          <Scatter
            key={c}
            name={ACC[c].label}
            data={pts.filter((p) => p.it.p.conta === c)}
            fill={ACC[c].cor}
            stroke="var(--card)"
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        ))}
        {/* Anel em volta do post selecionado. */}
        {ativo.length ? <Scatter data={ativo} fill="transparent" stroke="var(--ink)" strokeWidth={2.5} shape={(p: any) => <circle cx={p.cx} cy={p.cy} r={11} fill="none" stroke="var(--ink)" strokeWidth={2.5} />} isAnimationActive={false} /> : null}
      </ScatterChart>
    </ChartContainer>
    </div>
  );
}
