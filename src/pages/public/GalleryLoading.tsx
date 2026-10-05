import { useEffect, useRef, useState } from "react";

/** Browser-native animations: no animation library or React updates per frame. */
export function GalleryLoading({ label = "Carregando foto…" }: { label?: string }) {
  const ornament = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = ornament.current;
    if (!element) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animation: Animation | undefined;
    const update = () => {
      animation?.cancel();
      if (!motion.matches) animation = element.animate(
        [{ transform: "rotate(0deg)", opacity: .45 }, { transform: "rotate(180deg)", opacity: 1 }, { transform: "rotate(360deg)", opacity: .45 }],
        { duration: 2600, iterations: Infinity, easing: "ease-in-out" },
      );
    };
    update();
    motion.addEventListener("change", update);
    return () => { animation?.cancel(); motion.removeEventListener("change", update); };
  }, []);
  return <span className="gallery-loading" role="status">
    <span className="gallery-loading-jewel" ref={ornament} aria-hidden="true">✦</span>
    <span>{label}</span>
  </span>;
}

export function GalleryImage(props: { src: string; alt: string; className?: string; eager?: boolean; onReady?: () => void }) {
  return <ImageFrame key={props.src} {...props} />;
}

function ImageFrame({ src, alt, className = "", eager = false, onReady }: { src: string; alt: string; className?: string; eager?: boolean; onReady?: () => void }) {
  const frame = useRef<HTMLSpanElement>(null);
  const readyCallback = useRef(onReady);
  useEffect(() => { readyCallback.current = onReady; }, [onReady]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let active = true;
    let started = false;
    let timer: number | undefined;
    let animation: Animation | undefined;
    const image = new Image();
    const start = () => {
      if (started) return;
      started = true;
      timer = window.setTimeout(() => { active = false; setState("error"); }, 30000);
      image.onload = async () => {
        try {
          await image.decode();
          if (!active) return;
          window.clearTimeout(timer);
          // Reuse the decoded element, including for no-store image responses.
          image.alt = alt;
          image.className = className;
          frame.current?.appendChild(image);
          setState("ready");
          readyCallback.current?.();
          if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            animation = image.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: "ease-out" });
          }
        } catch { if (active) { window.clearTimeout(timer); setState("error"); } }
      };
      image.onerror = () => { if (active) { window.clearTimeout(timer); setState("error"); } };
      image.src = src;
    };
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { start(); observer.disconnect(); }
    }, { rootMargin: "200px" });
    if (eager) start();
    else if (frame.current) observer.observe(frame.current);
    return () => { active = false; observer.disconnect(); window.clearTimeout(timer); animation?.cancel(); image.onload = null; image.onerror = null; image.remove(); };
  }, [src, alt, className, eager]);
  return <span ref={frame} className={`gallery-image-frame gallery-image-${state}`} aria-busy={state === "loading"}>
    {state === "loading" && <GalleryLoading />}
    {state === "error" && <span className="gallery-image-error" role="status">Foto indisponível. Tente abrir novamente.</span>}
  </span>;
}
