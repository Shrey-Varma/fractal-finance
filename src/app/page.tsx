'use client';

import { useState } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const res = await fetch("/api/parse-rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResponse(data.rule);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">FlowFin: Finance Automation</h1>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='e.g., "Move 10% of my paycheck to my TFSA"'
        className="w-full p-2 border rounded mb-4"
        rows={4}
      />
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Parsing..." : "Submit"}
      </button>

      {error && <p className="text-red-600 mt-4">{error}</p>}

      {response && (
        <pre className="mt-6 bg-gray-100 p-4 rounded text-sm">
          {JSON.stringify(response, null, 2)}
        </pre>
      )}
    </main>
  );
}
