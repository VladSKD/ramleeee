import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface A11yCtx {
  highContrast: boolean;
  toggleHighContrast: () => void;
  largeText: boolean;
  toggleLargeText: () => void;
}

const Ctx = createContext<A11yCtx>({
  highContrast: false,
  toggleHighContrast: () => {},
  largeText: false,
  toggleLargeText: () => {},
});

export function A11yProvider({ children }: { children: ReactNode }) {
  const [highContrast, setHc] = useState(false);
  const [largeText, setLt] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHc(localStorage.getItem("ramle-hc") === "1");
    setLt(localStorage.getItem("ramle-lt") === "1");
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("hc", highContrast);
    document.documentElement.style.fontSize = largeText ? "18px" : "";
    if (typeof window !== "undefined") {
      localStorage.setItem("ramle-hc", highContrast ? "1" : "0");
      localStorage.setItem("ramle-lt", largeText ? "1" : "0");
    }
  }, [highContrast, largeText]);

  return (
    <Ctx.Provider
      value={{
        highContrast,
        toggleHighContrast: () => setHc((v) => !v),
        largeText,
        toggleLargeText: () => setLt((v) => !v),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useA11y = () => useContext(Ctx);