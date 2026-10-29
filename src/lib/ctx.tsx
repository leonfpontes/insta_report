import { createContext, useContext } from "react";
import type { Conta, Model } from "./model";

export type View = "fila" | "pedidos" | "calendario" | "publicados" | "execucoes";
export const VIEWS: View[] = ["fila", "pedidos", "calendario", "publicados", "execucoes"];

export interface Painel {
  m: Model;
  /** Contas ligadas no topo (pode estar vazia). */
  sel: Conta[];
  /** Contas que o painel mostra: as ligadas, ou todas quando nenhuma ou todas estão ligadas. */
  ativas: Conta[];
  todas: boolean;
  toggle: (k: Conta) => void;
  /** Liga só esta conta. */
  so: (k: Conta) => void;
  /** Busca pelo título ou legenda, a mesma em todas as visões. */
  q: string;
  setQ: (q: string) => void;
  open: (id: string) => void;
  /** Pedidos de "Publicar agora" feitos nesta aba: id → hora do pedido. */
  saindo: Record<string, number>;
  publicar: (id: string) => Promise<void>;
  marcar: (id: string) => Promise<void>;
  /** Relê os dados do painel (depois de criar ou aprovar um pedido). */
  recarregar: () => Promise<void>;
}

export const PainelCtx = createContext<Painel | null>(null);
export function usePainel() {
  const p = useContext(PainelCtx);
  if (!p) throw new Error("usePainel fora do painel");
  return p;
}
