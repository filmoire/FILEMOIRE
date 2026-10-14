"use client";

import * as T from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = T.Root;
export const TabsContent = T.Content;

export function TabsList({ className, ...p }: T.TabsListProps) {
  return <T.List className={cn("inline-flex w-full gap-1 rounded-lg border border-line bg-creme-200 p-1", className)} {...p} />;
}
export function TabsTrigger({ className, ...p }: T.TabsTriggerProps) {
  return (
    <T.Trigger
      className={cn(
        "flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md px-4 text-[15px] font-medium text-ink-muted transition-colors hover:text-prune data-[state=active]:bg-white data-[state=active]:text-prune data-[state=active]:shadow-soft [&_svg]:size-5",
        className,
      )}
      {...p}
    />
  );
}
