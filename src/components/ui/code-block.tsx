"use client";
import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { IconCheck, IconCopy } from "@tabler/icons-react";

// VS Code-like dark theme with navy accent
const customDarkTheme = {
  'code[class*="language-"]': {
    color: '#d4d4d4',
    background: 'none',
    fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
    fontSize: '14px',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    wordWrap: 'normal',
    lineHeight: '1.6',
    tabSize: '2',
    hyphens: 'none',
  },
  'pre[class*="language-"]': {
    color: '#d4d4d4',
    background: '#1e1e1e',
    fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
    fontSize: '14px',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    wordWrap: 'normal',
    lineHeight: '1.6',
    tabSize: '2',
    hyphens: 'none',
    padding: '1rem',
    margin: '0',
    overflow: 'auto',
    borderRadius: '0',
  },
  'token.comment': {
    color: '#6a9955',
    fontStyle: 'italic',
  },
  'token.prolog': {
    color: '#6a9955',
  },
  'token.doctype': {
    color: '#6a9955',
  },
  'token.cdata': {
    color: '#6a9955',
  },
  'token.string': {
    color: '#ce9178',
  },
  'token.attr-value': {
    color: '#ce9178',
  },
  'token.number': {
    color: '#b5cea8',
  },
  'token.boolean': {
    color: '#569cd6',
  },
  'token.null': {
    color: '#569cd6',
  },
  'token.keyword': {
    color: '#569cd6',
  },
  'token.operator': {
    color: '#d4d4d4',
  },
  'token.property': {
    color: '#9cdcfe',
  },
  'token.function': {
    color: '#dcdcaa',
  },
  'token.punctuation': {
    color: '#d4d4d4',
  },
  'token.selector': {
    color: '#d7ba7d',
  },
  'token.important': {
    color: '#569cd6',
    fontWeight: 'bold',
  },
  'token.atrule': {
    color: '#c586c0',
  },
  'token.regex': {
    color: '#d16969',
  },
  'token.entity': {
    color: '#4ec9b0',
  },
  'token.url': {
    color: '#4ec9b0',
  },
};

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
        style={customDarkTheme}
        showLineNumbers={true}
        lineNumberStyle={{
          color: '#6e7681',
          backgroundColor: '#262626',
          paddingLeft: '1rem',
          paddingRight: '1rem',
          borderRight: '1px solid #404040',
          minWidth: '3rem',
          textAlign: 'right',
          userSelect: 'none',
          fontSize: '13px',
        }}
        customStyle={{
          margin: 0,
          background: '#1e1e1e',
          fontSize: '14px',
          lineHeight: '1.6',
          padding: '1rem 1rem 1rem 0',
        }}
        codeTagProps={{
          style: {
            fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
            fontSize: '14px',
          }
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
} 