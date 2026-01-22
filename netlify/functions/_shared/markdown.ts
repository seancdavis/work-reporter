import { marked } from "marked";

// Configure marked for GFM and line breaks
marked.setOptions({
  gfm: true,
  breaks: true,
});

export function parseMarkdown(content: string | null | undefined): string | null {
  if (!content) return null;
  return marked.parse(content) as string;
}
