import { useState, useEffect } from 'react';

const DEVICE_ID_KEY = 'nomos.device.id';

function generateDeviceId(): string {
  return 'device_' + crypto.randomUUID();
}

export function useDeviceId() {
  const [deviceId, setDeviceId] = useState<string>(() => {
    const stored = localStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;
    
    const newId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, newId);
    return newId;
  });

  useEffect(() => {
    const stored = localStorage.getItem(DEVICE_ID_KEY);
    if (!stored) {
      const newId = generateDeviceId();
      localStorage.setItem(DEVICE_ID_KEY, newId);
      setDeviceId(newId);
    }
  }, []);

  return deviceId;
}
