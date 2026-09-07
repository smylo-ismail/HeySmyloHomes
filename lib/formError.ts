import type { ZodError } from 'zod';

/** Turns the first Zod issue into a self-diagnosing message — which field, and why —
 *  instead of a bare "Invalid input" that gives the user nowhere to go. */
export function firstIssueMessage(error: ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'Please check your inputs.';
  const field = issue.path.join('.');
  return field ? `${field}: ${issue.message}` : issue.message;
}
