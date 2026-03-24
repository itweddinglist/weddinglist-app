"use client";

import { useState, useEffect } from "react";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let consent = null;
    try {
      consent = localStorage.getItem("cookie_consent");
    } catch {}
    const timer = setTimeout(() => {
      if (!consent) setVisible(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const accept = () => { try { localStorage.setItem("cookie_consent", "accepted"); } catch {} setVisible(false); };
  const decline = () => { try { localStorage.setItem("cookie_consent", "declined"); } catch {} setVisible(false); };

  if (!visible) return null;

  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: "#1e293b", color: "#f8fafc", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", zIndex: 9999, flexWrap: "wrap" }}>
      <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.5 }}>
        Folosim cookie-uri esentiale pentru functionarea platformei.{" "}
        <a href="/privacy.html" target="_blank" rel="noopener noreferrer" style={{ color: "#93c5fd", textDecoration: "underline" }}>Politica de confidentialitate</a>
      </p>
      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
        <button onClick={decline} style={{ padding: "8px 16px", backgroundColor: "transparent", color: "#94a3b8", border: "1px solid #475569", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem" }}>Refuz</button>
        <button onClick={accept} style={{ padding: "8px 16px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem" }}>Accept</button>
      </div>
    </div>
  );
}
