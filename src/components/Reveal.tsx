import { ReactNode, useEffect, useState } from "react";
export function Reveal({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), 40);
    return () => clearTimeout(t);
  }, []);
  return <div className={show ? "reveal show" : "reveal"}>{children}</div>;
}
