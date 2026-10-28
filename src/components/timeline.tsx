import { lazy, Suspense, type ComponentProps } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// O gráfico (recharts) é o maior pedaço do painel: carrega depois da primeira tela.
const Chart = lazy(() => import("@/components/charts").then((m) => ({ default: m.TimeLine })));

export function TimeLine(props: ComponentProps<typeof Chart>) {
  return (
    <Suspense fallback={<Skeleton className="w-full" style={{ height: props.height ?? 200 }} />}>
      <Chart {...props} />
    </Suspense>
  );
}
