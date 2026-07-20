import "server-only";

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new Error("INVALID_ORIGIN");
}

export const SUPPORT_MESSAGE_LIMIT = 4000;
export const SUPPORT_ATTACHMENT_LIMIT = 5 * 1024 * 1024;
export const SUPPORT_ATTACHMENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

