// Pre-launch checklist (spec §12) assigns filling these in as a human task.
// Placeholders below MUST be replaced before go-live.
export const AGENT = {
  displayName: 'smylo',
  // E.164 format, no leading "+", e.g. "6591234567" for a Singapore mobile.
  whatsappNumber: 'REPLACE_WITH_AGENT_WHATSAPP_NUMBER',
  whitelistedEmails: [] as string[],
} as const;
