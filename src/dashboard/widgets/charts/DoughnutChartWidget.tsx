import { PieChartWidgetMobile } from "./PieChartWidget";

/** Doughnut uses the same rendering path as pie with innerRadius from config. */
export function DoughnutChartWidgetMobile(
  props: Parameters<typeof PieChartWidgetMobile>[0]
) {
  const widget = {
    ...props.widget,
    config: {
      ...(props.widget.config as Record<string, unknown>),
      innerRadius:
        (props.widget.config as Record<string, unknown>)?.innerRadius ?? 48,
    },
  };
  return <PieChartWidgetMobile {...props} widget={widget} />;
}
