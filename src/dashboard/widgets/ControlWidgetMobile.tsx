import type { MobileWidgetBindings } from "../hooks/useMobileWidgetBindings";
import {
  MiniSwitchWidgetMobile,
  SwitchWidgetMobile,
} from "./SwitchWidgetMobile";

const CONTROL_TYPES = new Set([
  "switch",
  "miniSwitch",
]);

export function isControlWidgetType(type: string) {
  return CONTROL_TYPES.has(type);
}

export function ControlWidgetMobile(props: MobileWidgetBindings) {
  const type = String(props.widget.type || "");

  if (type === "miniSwitch") {
    return <MiniSwitchWidgetMobile {...props} />;
  }

  return <SwitchWidgetMobile {...props} />;
}
