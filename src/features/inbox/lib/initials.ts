/**
 * Shared by both a Server Component (`[conversationId]/page.tsx`) and a
 * Client Component (`conversation-list.tsx`) — must stay a plain module with
 * no "use client" directive, or calling it from server code throws at
 * runtime ("Attempted to call initialsOf() from the server...").
 */
export function initialsOf(name: string) {
  return name
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
