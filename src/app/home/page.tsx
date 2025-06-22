'use client';

import { useState } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [userReprompt, setUserReprompt] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showReprompt, setShowReprompt] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const res = await fetch("/api/parse_rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, userReprompt })
      });

      const data = await res.json();
      if (!res.ok) {
        // If parsing failed, show the reprompt field for next attempt
        setShowReprompt(true);
        throw new Error(data.error);
      }

      setResponse(data.rule);
      // Reset reprompt field on success
      setShowReprompt(false);
      setUserReprompt("");
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Fractal - Personal Finance Automation</h1>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='e.g., "Move 10% of my paycheck to my TFSA"'
        className="w-full p-2 border rounded mb-4"
        rows={4}
      />
      
      {showReprompt && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            The parsing failed. Please provide additional context to help the model understand:
          </label>
          <textarea
            value={userReprompt}
            onChange={(e) => setUserReprompt(e.target.value)}
            placeholder='e.g., "This should be a weekly notification, not a transaction-based rule"'
            className="w-full p-2 border rounded"
            rows={3}
          />
        </div>
      )}
      
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
