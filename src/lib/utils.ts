import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { customAlphabet } from "nanoid";
import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getBaseUrl(): string {
  if (process.env.DOMAIN_URL) return process.env.DOMAIN_URL.replace(/\/$/, "");
  return "http://localhost:3000";
}

export const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  6,
);

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(n);
}

export function setFormErrors<T extends FieldValues>(
  errors: Record<string, string[] | undefined>,
  setError: UseFormSetError<T>,
) {
  for (const [field, messages] of Object.entries(errors)) {
    const message = messages?.[0];
    if (message) {
      setError(field as FieldPath<T>, { message });
    }
  }
}
