import { useEffect, useState } from "react";

/** true enquanto a media query vale (ex.: "(min-width: 768px)"). */
export function useMedia(q: string) {
  const [ok, setOk] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setOk(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [q]);
  return ok;
}

export const useDesktop = () => useMedia("(min-width: 768px)");
