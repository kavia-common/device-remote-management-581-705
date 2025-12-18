import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// PUBLIC_INTERFACE
export function cn(...inputs: ClassValue[]): string {
  /** Utility function to merge Tailwind CSS class names with proper precedence. */
  return twMerge(clsx(inputs));
}
