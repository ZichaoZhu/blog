import version from "../../.generated/version.json";
/** Minimal deployment identity only. Never return the server-side paper catalog. */
export function GET():Response {
 return Response.json(version,{headers:{"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow"}});
}
