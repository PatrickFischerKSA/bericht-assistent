export function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const [key, ...valueParts] = part.split("=");
      cookies[key] = decodeURIComponent(valueParts.join("=") || "");
      return cookies;
    }, {});
}
