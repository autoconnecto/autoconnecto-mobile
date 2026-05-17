import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

const CHART_HEIGHT = 220;

type Props = {
  children: ReactNode;
  height?: number;
};

export function MobileChartArea({ children, height = CHART_HEIGHT }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [plotWidth, setPlotWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const width = Math.floor(el.getBoundingClientRect().width);
      if (width > 0) setPlotWidth(width);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [height]);

  const sizedChild =
    plotWidth > 0
      ? Children.map(children, (child) => {
          if (!isValidElement(child)) return child;
          return cloneElement(child as ReactElement<Record<string, unknown>>, {
            width: plotWidth,
            height,
          });
        })
      : null;

  return (
    <div
      ref={containerRef}
      className="mobile-chart-area"
      style={{
        width: "100%",
        height,
        minHeight: height,
        position: "relative",
      }}
    >
      {sizedChild}
    </div>
  );
}
