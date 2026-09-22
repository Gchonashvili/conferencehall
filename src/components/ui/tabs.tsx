"use client";

import { Tabs as RadixTabs } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Tabs = RadixTabs.Root;

export function TabsList({ className, ...props }: ComponentProps<typeof RadixTabs.List>) {
  return <RadixTabs.List className={cn("mb-4 flex gap-6", className)} {...props} />;
}

/** Text tabs, active one in coral: "Upcoming / History" in the reference. */
export function TabsTrigger({ className, ...props }: ComponentProps<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      className={cn(
        "cursor-pointer border-b-2 border-transparent pb-1 text-sm font-semibold data-[state=active]:border-coral-strong data-[state=active]:text-coral-strong",
        className,
      )}
      {...props}
    />
  );
}

export const TabsContent = RadixTabs.Content;
