"use client";

import * as Popover from "@radix-ui/react-popover";
import { Bell } from "lucide-react";
import { Link } from "@/lib/nav";
import { useDemo } from "@/lib/store";
import type { Notification } from "@/lib/types";
import { fmtDateTime } from "@/lib/utils";

export function NotificationBell({ to, projectId }: { to: Notification["to"]; projectId?: string }) {
  const all = useDemo((s) => s.notifications);
  const list = all.filter((n) => n.to === to && (!projectId || n.projectId === projectId)).slice(0, 12);
  const unread = list.filter((n) => !n.read).length;
  return (
    <Popover.Root onOpenChange={(o) => !o && unread && useDemo.getState().markRead(to)}>
      <Popover.Trigger className="relative rounded-md p-2.5 text-prune hover:bg-prune-50" aria-label={`Notifications${unread ? ` : ${unread} non lue${unread > 1 ? "s" : ""}` : ""}`}>
        <Bell className="size-6" />
        {unread > 0 && <span className="absolute right-1 top-1 flex min-w-5 items-center justify-center rounded-full bg-terre px-1 text-[11px] font-bold text-white">{unread}</span>}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className="z-50 w-[min(92vw,380px)] rounded-lg border border-line bg-white shadow-lift">
          <p className="border-b border-line px-4 py-3 font-serif text-lg font-semibold text-prune">Notifications</p>
          {list.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">Rien de nouveau pour l'instant.</p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
              {list.map((n) => (
                <li key={n.id} className={n.read ? "" : "bg-terre-50/50"}>
                  <Popover.Close asChild>
                    <Link href={n.href ?? "#"} className="block px-4 py-3 no-underline hover:bg-creme-200">
                      <p className="text-[15px] font-semibold text-ink">{n.title}</p>
                      <p className="line-clamp-2 text-sm text-ink-muted">{n.body}</p>
                      <p className="mt-1 text-xs text-ink-soft">{fmtDateTime(n.at)}</p>
                    </Link>
                  </Popover.Close>
                </li>
              ))}
            </ul>
          )}
          <p className="border-t border-line px-4 py-2 text-xs text-ink-muted">Les e-mails correspondants sont simulés (menu « E-mails »).</p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
