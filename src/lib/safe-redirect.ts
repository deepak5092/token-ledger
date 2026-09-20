// Post-auth redirect targets arrive from user-controlled input (a ?next=
// query param, or the hidden field the login form carries it through in),
// so they can never be trusted as-is.
//
// Rejecting only "http://" / "//" prefixes is not enough: callers build
// absolute URLs by concatenating an origin that has no trailing slash, so
// a value starting with "@" or "." lands in the authority component and
// silently reassigns the host --
//   "https://app.example" + "@evil.com" -> host evil.com
//   "https://app.example" + ".evil.com" -> host app.example.evil.com
// Rather than enumerate those tricks, allow-list the one shape that is
// always safe: a single leading slash not followed by another slash or a
// backslash, i.e. an absolute path on this origin and nothing else.
const SAFE_PATH = /^\/(?![/\\])[^\\]*$/;

export const DEFAULT_NEXT = "/dashboard";

export function safeNextPath(next: string | null | undefined): string {
  if (!next) return DEFAULT_NEXT;
  return SAFE_PATH.test(next) ? next : DEFAULT_NEXT;
}
