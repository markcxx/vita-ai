"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownContentProps = {
  children: string;
};

const markdownComponents = {
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      className="text-primary transition-colors hover:text-blue-700 hover:underline dark:hover:text-blue-300"
      rel="noreferrer"
      target="_blank"
      {...props}
    />
  ),
  blockquote: (props: React.BlockquoteHTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="my-4 border-0 border-l-4 border-solid border-l-gray-300 px-4 py-0 text-gray-500 dark:border-l-gray-600 dark:text-gray-400"
      {...props}
    />
  ),
  code({ children, className }: { children?: React.ReactNode; className?: string }) {
    const inline = !className && !String(children).includes("\n");
    if (inline) {
      return (
        <code className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[0.92em] text-gray-800 dark:bg-white/[0.08] dark:text-gray-100">
          {children}
        </code>
      );
    }

    return (
      <pre className="my-4 overflow-x-auto rounded-xl border border-gray-200 bg-gray-950 px-4 py-3 text-sm text-gray-100 shadow-sm dark:border-white/10">
        <code>{String(children).replace(/\n$/, "")}</code>
      </pre>
    );
  },
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="mb-4 mt-6 text-2xl font-semibold text-gray-900 dark:text-gray-100" {...props} />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="mb-4 mt-6 text-xl font-semibold text-gray-900 dark:text-gray-100" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mb-4 mt-6 text-lg font-semibold text-gray-900 dark:text-gray-100" {...props} />
  ),
  ol: (props: React.OlHTMLAttributes<HTMLOListElement>) => (
    <ol
      className="mb-4 ml-2 list-inside list-decimal space-y-1 text-gray-700 dark:text-gray-300"
      {...props}
    />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-4 leading-relaxed last:mb-0" {...props} />
  ),
  pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  table: (props: React.TableHTMLAttributes<HTMLTableElement>) => (
    <div className="markdown-table-wrapper">
      <table className="markdown-table" {...props} />
    </div>
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul
      className="mb-4 ml-2 list-inside list-disc space-y-1 text-gray-700 dark:text-gray-300"
      {...props}
    />
  ),
};

export function MarkdownContent({ children }: MarkdownContentProps) {
  return (
    <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
      {children}
    </ReactMarkdown>
  );
}
