function normalizeHashtag(tag: string): string {
  const trimmed = tag.trim().replace(/^#+/, "");
  return trimmed ? `#${trimmed}` : "";
}

export interface ComposeInput {
  rawCaption: string;
  hashtags: string[];
  defaultCaption?: string | null;
  defaultHashtags?: string[];
  applyDefaultCaption?: boolean;
  applyDefaultHashtags?: boolean;
}

export interface ComposeResult {
  caption: string;
  hashtags: string[];
}

// Appends the user's saved default caption/hashtags to a post unless the
// caller opted out (e.g. the user manually removed them before publishing).
export function composePost({
  rawCaption,
  hashtags,
  defaultCaption,
  defaultHashtags = [],
  applyDefaultCaption = true,
  applyDefaultHashtags = true,
}: ComposeInput): ComposeResult {
  const parts = [rawCaption.trim()].filter(Boolean);
  if (applyDefaultCaption && defaultCaption?.trim()) {
    parts.push(defaultCaption.trim());
  }

  const merged = new Set<string>();
  for (const tag of hashtags) {
    const normalized = normalizeHashtag(tag);
    if (normalized) merged.add(normalized);
  }
  if (applyDefaultHashtags) {
    for (const tag of defaultHashtags) {
      const normalized = normalizeHashtag(tag);
      if (normalized) merged.add(normalized);
    }
  }

  return {
    caption: parts.join("\n\n"),
    hashtags: Array.from(merged),
  };
}
