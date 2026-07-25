import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { QrCode as QrIcon, Download, Palette, Link2 } from "lucide-react";

export default function QrCodeTab({ links, apiBase }) {
  const [selectedLink, setSelectedLink] = useState(links[0] || null);
  const [qrUrl, setQrUrl] = useState("");
  const [darkColor, setDarkColor] = useState("#101820");
  const [lightColor, setLightColor] = useState("#ffffff");
  const [customText, setCustomText] = useState("");

  useEffect(() => {
    if (links.length > 0 && !selectedLink) {
      setSelectedLink(links[0]);
    }
  }, [links]);

  useEffect(() => {
    if (!selectedLink) return;
    generateQr();
  }, [selectedLink, darkColor, lightColor]);

  function generateQr() {
    if (!selectedLink) return;
    const targetUrl = `${selectedLink.short_url}?qr=true`;

    QRCode.toDataURL(targetUrl, {
      margin: 2,
      width: 300,
      color: {
        dark: darkColor,
        light: lightColor,
      },
    }).then((url) => setQrUrl(url));
  }

  function downloadSvg() {
    if (!selectedLink) return;
    const targetUrl = `${selectedLink.short_url}?qr=true`;
    QRCode.toString(targetUrl, {
      type: "svg",
      color: { dark: darkColor, light: lightColor },
    }).then((svgString) => {
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${selectedLink.short_code}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <QrIcon size={20} color="var(--accent-primary)" /> Custom QR Code Generator & Studio
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Design high-resolution vector PNG/SVG QR codes for print and web</p>
        </div>
      </div>

      {links.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
          <p>No short links found. Create a link to generate custom QR codes.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
          {/* Controls Form */}
          <div>
            <div className="form-group">
              <label>Select Short Link</label>
              <select
                className="form-input"
                value={selectedLink?.short_code || ""}
                onChange={(e) => {
                  const found = links.find((l) => l.short_code === e.target.value);
                  setSelectedLink(found || null);
                }}
              >
                {links.map((l) => (
                  <option key={l.short_code} value={l.short_code}>
                    /{l.short_code} - {l.original_url.substring(0, 40)}...
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Palette size={14} /> Pattern Color
                </label>
                <input
                  type="color"
                  className="form-input"
                  style={{ height: "44px", padding: "4px" }}
                  value={darkColor}
                  onChange={(e) => setDarkColor(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Palette size={14} /> Background Color
                </label>
                <input
                  type="color"
                  className="form-input"
                  style={{ height: "44px", padding: "4px" }}
                  value={lightColor}
                  onChange={(e) => setLightColor(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Brand Caption / Badge Text</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. SCAN ME FOR 20% OFF"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
              />
            </div>

            {selectedLink && (
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-color)", marginTop: "16px" }}>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>QR Scan Tracking:</div>
                <div style={{ fontSize: "1.2rem", fontWeight: "700", marginTop: "2px" }}>
                  {selectedLink.qr_scans || 0} Dedicated QR Scans
                </div>
              </div>
            )}
          </div>

          {/* Live Preview & Download Panel */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.2)", padding: "24px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
            {qrUrl && (
              <>
                <div style={{ background: lightColor, padding: "16px", borderRadius: "12px", textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
                  <img src={qrUrl} alt="QR Code Preview" style={{ display: "block", width: "200px", height: "200px" }} />
                  {customText && (
                    <div style={{ color: darkColor, fontWeight: "700", fontSize: "0.85rem", marginTop: "8px", textTransform: "uppercase" }}>
                      {customText}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                  <a className="btn-primary" href={qrUrl} download={`qr-${selectedLink?.short_code}.png`}>
                    <Download size={14} /> PNG Download
                  </a>
                  <button type="button" className="btn-secondary" onClick={downloadSvg}>
                    <Download size={14} /> SVG Vector
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
