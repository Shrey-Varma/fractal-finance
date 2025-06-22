'use client';

import { useState } from "react";
import PlaidLinkButton from "@/components/PlaidLinkButton";
import RefreshDataButton from "@/components/RefreshDataButton";
import AccountsOverview from "@/components/AccountsOverview";

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
      const res = await fetch("/api/parse_rule", {
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
      <h1 className="text-2xl font-bold mb-4">Fractal - Personal Finance Automation</h1>
      
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Connect Your Bank Account</h2>
        <p className="text-sm text-gray-600 mb-4">
          Link your bank account to enable automatic transaction monitoring and rule execution.
        </p>
        <div className="flex gap-3 flex-wrap">
          <PlaidLinkButton />
          <RefreshDataButton />
        </div>
      </div>

      <AccountsOverview />

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Create Financial Rules</h2>
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
      </div>

      {error && <p className="text-red-600 mt-4">{error}</p>}

      {response && (
        <pre className="mt-6 bg-gray-100 p-4 rounded text-sm">
          {JSON.stringify(response, null, 2)}
        </pre>
      )}
    </main>
  );
}
