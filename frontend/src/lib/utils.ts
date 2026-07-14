import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Standard shadcn/ui class-merging helper — required by any component
// generated via `npx shadcn add`.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
