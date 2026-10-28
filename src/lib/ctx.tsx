import { createContext, useContext } from "react";
import type { Conta, Model } from "./model";

export type View = "fila" | "calendario" | "publicados" | "execucoes";
export const VIEWS: View[] = ["fila", "calendario", "publicados", "execucoes"];

export interface Painel {
  m: Model;
  acc: Conta | "all";
  setAcc: (a: Conta | "all") => void;
  open: (id: string) => void;
  /** Pedidos de "Publicar agora" feitos nesta aba: id → hora do pedido. */
  saindo: Record<string, number>;
  publicar: (id: string) => Promise<void>;
  marcar: (id: string) => Promise<void>;
}

export const PainelCtx = createContext<Painel | null>(null);
export function usePainel() {
  const p = useContext(PainelCtx);
  if (!p) throw new Error("usePainel fora do painel");
  return p;
}
