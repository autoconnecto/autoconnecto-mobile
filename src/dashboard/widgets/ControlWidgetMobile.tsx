import type { MobileWidgetBindings } from "../hooks/useMobileWidgetBindings";
import { AttributeControlCardWidgetMobile } from "./controls/AttributeControlCardWidgetMobile";
import { GpioControlWidgetMobile } from "./controls/GpioControlWidgetMobile";
import { RpcWidgetMobile } from "./controls/RpcWidgetMobile";
import { SliderControlWidgetMobile } from "./controls/SliderControlWidgetMobile";
import {
  MiniSwitchWidgetMobile,
  SwitchWidgetMobile,
} from "./SwitchWidgetMobile";
import { ToggleButtonWidgetMobile } from "./controls/ToggleButtonWidgetMobile";
import { CONTROL_WIDGET_TYPES } from "../widgetRoutes";

export function isControlWidgetType(type: string) {
  return CONTROL_WIDGET_TYPES.has(type);
}

export function ControlWidgetMobile(props: MobileWidgetBindings) {
  const type = String(props.widget.type || "");

  switch (type) {
    case "miniSwitch":
      return <MiniSwitchWidgetMobile {...props} />;
    case "switch":
      return <SwitchWidgetMobile {...props} />;
    case "toggleButton":
      return <ToggleButtonWidgetMobile {...props} />;
    case "sliderControl":
      return <SliderControlWidgetMobile {...props} />;
    case "gpioControl":
      return <GpioControlWidgetMobile {...props} />;
    case "attributeControlCard":
      return <AttributeControlCardWidgetMobile {...props} />;
    case "rpc":
      return <RpcWidgetMobile {...props} />;
    default:
      return <SwitchWidgetMobile {...props} />;
  }
}
