"use client";
import Link from "next/link";

const MODULES = [
  {
    id: "seating-chart",
    icon: "🪑",
    label: "Plan Mese",
    description: "Aranjează invitații la mese vizual",
    path: "/seating-chart",
    stat: "5 mese · 42 locuri",
    color: "#C9907A",
    progress: 78,
  },
  {
    id: "guest-list",
    icon: "👥",
    label: "Listă Invitați",
    description: "Gestionează invitații și RSVP-urile",
    path: "/guest-list",
    stat: "12 invitați · 9 confirmați",
    color: "#48BB78",
    progress: 75,
  },
  {
    id: "budget",
    icon: "💰",
    label: "Buget",
    description: "Urmărește cheltuielile nunții",
    path: "/budget",
    stat: "0 RON cheltuit",
    color: "#ECC94B",
    progress: 0,
  },
  {
    id: "checklist",
    icon: "✅",
    label: "Checklist",
    description: "Task-uri organizate pe perioade",
    path: "/checklist",
    stat: "0 task-uri",
    color: "#48BB78",
    progress: 0,
  },
  {
    id: "timeline",
    icon: "⏰",
    label: "Timeline",
    description: "Desfășurătorul zilei nunții",
    path: "/timeline",
    stat: "0 evenimente",
    color: "#C9907A",
    progress: 0,
  },
  {
    id: "vendors",
    icon: "🤝",
    label: "Furnizori",
    description: "Contacte și contracte furnizori",
    path: "/vendors",
    stat: "0 furnizori",
    color: "#9F7AEA",
    progress: 0,
  },
  {
    id: "gift-registry",
    icon: "🎁",
    label: "Wishlist",
    description: "Lista de cadouri dorită",
    path: "/gift-registry",
    stat: "0 dorințe",
    color: "#F687B3",
    progress: 0,
  },
  {
    id: "moodboard",
    icon: "🖼️",
    label: "Moodboard",
    description: "Inspirație vizuală pentru nuntă",
    path: "/moodboard",
    stat: "0 imagini",
    color: "#76E4F7",
    progress: 0,
  },
  {
    id: "notes",
    icon: "📝",
    label: "Notițe",
    description: "Idei rapide și memento-uri",
    path: "/notes",
    stat: "0 notițe",
    color: "#ECC94B",
    progress: 0,
  },
  {
    id: "export",
    icon: "📄",
    label: "Export",
    description: "Generează rapoarte PDF",
    path: "/export",
    stat: "PDF · Print",
    color: "#C9907A",
    progress: 0,
  },
  {
    id: "settings",
    icon: "⚙️",
    label: "Setări",
    description: "Configurează detaliile nunții",
    path: "/settings",
    stat: "Configurează",
    color: "#7A7F99",
    progress: 0,
  },
];

export default function Dashboard() {
  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div
          style={{
            fontSize: "0.68rem",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color: "var(--rose)",
            marginBottom: "0.3rem",
          }}
        >
          Bun venit
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "2.2rem",
            fontWeight: 300,
            color: "var(--navy)",
          }}
        >
          Andreea & <em style={{ fontStyle: "italic", color: "var(--rose)" }}>Alexandru</em>
        </h1>
        <p style={{ color: "var(--muted)", marginTop: "0.4rem", fontSize: "0.9rem" }}>
          15 septembrie 2026 · Grand Hotel Ballroom
        </p>
      </div>

      {/* Stats rapide */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem",
          marginBottom: "2.5rem",
        }}
      >
        {[
          { label: "Invitați", value: "12", sub: "9 confirmați" },
          { label: "Mese", value: "5", sub: "42 locuri" },
          { label: "Buget", value: "0%", sub: "din total achitat" },
          { label: "Zile rămase", value: String(Math.max(0, Math.ceil((new Date("2026-09-15") - new Date()) / (1000 * 60 * 60 * 24)))), sub: "15 sep 2026" },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "1.2rem 1.5rem",
              boxShadow: "0 2px 12px rgba(26,31,58,0.07)",
              borderTop: "3px solid var(--rose)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "2rem",
                fontWeight: 300,
                color: "var(--navy)",
                lineHeight: 1,
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "var(--navy)",
                marginTop: "0.3rem",
              }}
            >
              {s.label}
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.15rem" }}>
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Module grid */}
      <div
        style={{
          fontSize: "0.68rem",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--muted)",
          marginBottom: "1rem",
        }}
      >
        Module
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "1rem",
        }}
      >
        {MODULES.map((m) => (
          <Link key={m.id} href={m.path} style={{ textDecoration: "none" }}>
            <div
              style={{
                background: "white",
                borderRadius: "14px",
                padding: "1.3rem 1.5rem",
                boxShadow: "0 2px 12px rgba(26,31,58,0.07)",
                cursor: "pointer",
                transition: "all 0.2s",
                borderLeft: `4px solid ${m.color}`,
                height: "100%",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.8rem",
                  marginBottom: "0.6rem",
                }}
              >
                <span style={{ fontSize: "1.4rem" }}>{m.icon}</span>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.1rem",
                    fontWeight: 400,
                    color: "var(--navy)",
                  }}
                >
                  {m.label}
                </div>
              </div>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "var(--muted)",
                  marginBottom: "0.8rem",
                  lineHeight: 1.4,
                }}
              >
                {m.description}
              </div>
              <div style={{ fontSize: "0.68rem", color: m.color, fontWeight: 500 }}>{m.stat}</div>
              {m.progress > 0 && (
                <div
                  style={{
                    marginTop: "0.6rem",
                    height: "3px",
                    background: "#F0EAE0",
                    borderRadius: "2px",
                  }}
                >
                  <div
                    style={{
                      width: `${m.progress}%`,
                      height: "100%",
                      background: m.color,
                      borderRadius: "2px",
                    }}
                  />
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
