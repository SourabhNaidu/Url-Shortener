import React, { useState } from "react";
import Papa from "papaparse";
import { FileText, Upload, Download, CheckCircle, AlertCircle, Shield } from "lucide-react";

export default function BulkCsvTab({ token, apiBase, onLinksCreated }) {
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div className="glass-panel" style={{ textAlign: "center", padding: "40px" }}>
        <Shield size={36} style={{ marginBottom: "12px", opacity: 0.6 }} />
        <h3>Sign in required for Bulk Link Creation</h3>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
          Batch import up to 50 URLs at once using CSV upload or raw copy-paste data.
        </p>
      </div>
    );
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data.map((row) => ({
          url: row.original_url || row.url || Object.values(row)[0],
          alias: row.custom_alias || row.alias || Object.values(row)[1] || undefined,
        }));
        setCsvText(JSON.stringify(parsed, null, 2));
      },
      error: (err) => setError(`CSV Parse error: ${err.message}`),
    });
  }

  async function handleBatchSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    let payloadLinks = [];

    try {
      if (csvText.trim().startsWith("[")) {
        payloadLinks = JSON.parse(csvText);
      } else {
        const lines = csvText.trim().split("\n");
        payloadLinks = lines.map((line) => {
          const parts = line.split(",");
          return { url: parts[0]?.trim(), alias: parts[1]?.trim() || undefined };
        }).filter((item) => Boolean(item.url));
      }

      if (payloadLinks.length === 0) {
        throw new Error("No valid links found in input payload");
      }

      const res = await fetch(`${apiBase}/api/links/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ links: payloadLinks }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk shorten request failed");

      setResult(data);
      onLinksCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function exportCsvResults() {
    if (!result || !result.results) return;
    const csv = Papa.unparse(result.results);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shortened-links-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FileText size={20} color="var(--accent-primary)" /> Bulk Link Creation Workbench
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Upload CSV or paste original_url,custom_alias rows</p>
        </div>
      </div>

      {error && <div style={{ color: "var(--accent-danger)", fontSize: "0.9rem", marginBottom: "16px" }}>{error}</div>}

      <form onSubmit={handleBatchSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "20px" }}>
          <div>
            <div className="form-group">
              <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Upload size={14} /> Upload CSV File
              </label>
              <input type="file" accept=".csv" className="form-input" onChange={handleFileUpload} />
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                Columns: original_url, custom_alias
              </p>
            </div>
          </div>

          <div>
            <div className="form-group">
              <label>Or Paste Raw Rows / JSON</label>
              <textarea
                className="form-input"
                style={{ height: "120px", fontFamily: "monospace", fontSize: "0.85rem" }}
                placeholder={`https://example.com/summer-sale,summer2026\nhttps://example.com/product/123,prod123`}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
              />
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={loading || !csvText.trim()}>
          {loading ? "Batch Generating Short Links..." : "Generate Bulk Short Links"}
        </button>
      </form>

      {result && (
        <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3>Batch Processing Complete ({result.created_count} Created, {result.failed_count} Failed)</h3>
            {result.results.length > 0 && (
              <button className="btn-secondary" onClick={exportCsvResults}>
                <Download size={14} /> Download Export CSV
              </button>
            )}
          </div>

          {result.results.length > 0 && (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Original URL</th>
                  <th>Short Code</th>
                  <th>Short Link</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((r, i) => (
                  <tr key={i}>
                    <td>{r.original_url}</td>
                    <td><code>{r.short_code}</code></td>
                    <td>
                      <a href={r.short_url} target="_blank" rel="noreferrer">
                        {r.short_url}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
