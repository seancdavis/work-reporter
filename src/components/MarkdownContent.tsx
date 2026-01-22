import { cn } from "../lib/utils";

interface MarkdownContentProps {
  html: string;
  className?: string;
}

export function MarkdownContent({ html, className }: MarkdownContentProps) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none",
        "prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5",
        "prose-headings:text-gray-900 prose-p:text-gray-700",
        "prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline",
        "prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm",
        "prose-pre:bg-gray-100 prose-pre:p-3",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
