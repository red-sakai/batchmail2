export const AUTH_COOKIE = "batchmail_auth";
export const AUTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export const AUTH_COOKIE_BASE = {
  path: "/",
  sameSite: "lax" as const,
};

export const isSecureCookie = () => process.env.NODE_ENV === "production";
