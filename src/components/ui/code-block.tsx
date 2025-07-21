"use client";
import React from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { IconCheck, IconCopy } from "@tabler/icons-react";

type CodeBlockProps = {
  code: string;
  language?: string;
  className?: string;
};

export function CodeBlock({ code, language = "json", className }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className={`relative rounded-lg overflow-hidden border border-gray-700 ${className || ""}`}>
      <div className="flex items-center justify-between px-4 py-3 text-white text-sm border-b border-gray-700" style={{ backgroundColor: '#1c4587' }}>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="font-medium ml-2">{language.toUpperCase()}</span>
        </div>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1 px-3 py-1.5 rounded hover:bg-white hover:bg-opacity-10 transition-colors text-sm"
        >
          {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        showLineNumbers={true}
        customStyle={{
          margin: 0,
          background: '#1e1e1e',
          color: '#d4d4d4',
          fontSize: '14px',
          lineHeight: '1.6',
          padding: '1rem',
          fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
} 