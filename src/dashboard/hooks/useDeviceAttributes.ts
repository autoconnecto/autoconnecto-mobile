import { useEffect, useState } from "react";
import type { DeviceAttribute } from "../../api/attributes";
import { attributeStore } from "../../realtime/attribute.store";

export function useDeviceAttributes(deviceId: string | null | undefined) {
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(!!deviceId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deviceId) {
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = attributeStore.subscribe(deviceId, () => {
      setVersion((v) => v + 1);
      setLoading(false);
    });

    return unsubscribe;
  }, [deviceId]);

  const attributes: DeviceAttribute[] = deviceId
    ? attributeStore.getAttributes(deviceId)
    : [];

  function getValue(
    key: string,
    preferredScopes: string[] = ["CLIENT", "SHARED"]
  ) {
    if (!deviceId) return undefined;
    return attributeStore.getValue(deviceId, key, preferredScopes);
  }

  return {
    attributes,
    getValue,
    loading,
    error,
    version,
  };
}
