// Browser-side device, browser, OS, language, timezone detection.
export type DeviceInfo = {
  device_type: "mobile" | "tablet" | "desktop";
  browser: string;
  os: string;
  language: string;
  timezone: string;
};

export function getDeviceInfo(): DeviceInfo {
  if (typeof window === "undefined") {
    return { device_type: "desktop", browser: "unknown", os: "unknown", language: "es", timezone: "UTC" };
  }
  const ua = navigator.userAgent;
  const isTablet = /iPad|Tablet|PlayBook/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua));
  const isMobile = !isTablet && /Mobi|Android|iPhone|iPod/i.test(ua);
  const device_type: DeviceInfo["device_type"] = isTablet ? "tablet" : isMobile ? "mobile" : "desktop";

  let browser = "Other";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\//.test(ua) || /Opera/.test(ua)) browser = "Opera";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua)) browser = "Safari";

  let os = "Other";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Linux/.test(ua)) os = "Linux";

  const language = (navigator.language || "es").slice(0, 8);
  let timezone = "UTC";
  try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch {}

  return { device_type, browser, os, language, timezone };
}
