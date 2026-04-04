// =============================================================================
// lib/export/pdf-export.tsx
// PDF Export — Faza 8.3
// Generează PDF cu plan de mese + lista invitați + sumar
// Font Roboto pentru suport diacritice românești
// wrap={false} pe mese — nu se taie între pagini
// =============================================================================

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// ─── Font cu diacritice ───────────────────────────────────────────────────────

Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAw.ttf",
      fontWeight: 700,
    },
  ],
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PdfGuest {
  display_name: string;
  rsvp_status: "pending" | "accepted" | "declined" | "maybe" | null;
  meal_choice: "standard" | "vegetarian" | null;
  dietary_notes: string | null;
  table_name: string | null;
}

export interface PdfTable {
  name: string;
  seat_count: number;
  guests: string[];
}

export interface PdfData {
  couple_names: string;
  wedding_date: string | null;
  location: string | null;
  generated_at: string;
  stats: {
    total: number;
    accepted: number;
    declined: number;
    pending: number;
    maybe: number;
    special_meals: number;
    has_allergies: number;
  };
  tables: PdfTable[];
  guests: PdfGuest[];
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 10,
    color: "#1E2340",
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
    backgroundColor: "#FFFFFF",
  },
  // Header
  header: {
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: "#C9907A",
    paddingBottom: 16,
  },
  coupleNames: {
    fontSize: 26,
    fontWeight: 700,
    color: "#1E2340",
    marginBottom: 4,
  },
  weddingMeta: {
    fontSize: 11,
    color: "#6E7490",
  },
  // Stats
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#C9907A",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statCard: {
    backgroundColor: "#F5F2EE",
    borderRadius: 6,
    padding: "8 12",
    minWidth: 80,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 700,
    color: "#1E2340",
  },
  statLabel: {
    fontSize: 8,
    color: "#9DA3BC",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  // Tables section
  tablesSection: {
    marginBottom: 24,
  },
  tableCard: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8DDD0",
    borderRadius: 6,
    padding: 12,
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  tableName: {
    fontSize: 11,
    fontWeight: 700,
    color: "#1E2340",
  },
  tableCapacity: {
    fontSize: 9,
    color: "#9DA3BC",
  },
  tableGuests: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  guestChip: {
    backgroundColor: "#F5F2EE",
    borderRadius: 4,
    padding: "3 7",
    fontSize: 9,
    color: "#1E2340",
  },
  emptyTable: {
    fontSize: 9,
    color: "#9DA3BC",
    fontStyle: "italic",
  },
  // Guests list
  guestsSection: {
    marginBottom: 24,
  },
  guestRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F5F2EE",
    paddingVertical: 5,
    alignItems: "center",
  },
  guestName: {
    flex: 3,
    fontSize: 9,
    color: "#1E2340",
  },
  guestStatus: {
    flex: 1,
    fontSize: 8,
    textAlign: "center",
  },
  guestMeal: {
    flex: 1,
    fontSize: 8,
    color: "#6E7490",
    textAlign: "center",
  },
  guestTable: {
    flex: 2,
    fontSize: 8,
    color: "#6E7490",
  },
  guestAllergies: {
    flex: 2,
    fontSize: 7,
    color: "#9DA3BC",
  },
  tableHeader2: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#C9907A",
    paddingBottom: 4,
    marginBottom: 4,
  },
  colHeader: {
    fontSize: 7,
    fontWeight: 700,
    color: "#9DA3BC",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#E8DDD0",
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: "#9DA3BC",
  },
});

// ─── Status helpers ───────────────────────────────────────────────────────────

function statusLabel(status: string | null): string {
  switch (status) {
    case "accepted": return "Confirmat";
    case "declined": return "Refuzat";
    case "maybe": return "Poate";
    default: return "În așteptare";
  }
}

function statusColor(status: string | null): string {
  switch (status) {
    case "accepted": return "#48BB78";
    case "declined": return "#E53E3E";
    case "maybe": return "#ECC94B";
    default: return "#9DA3BC";
  }
}

function mealLabel(meal: string | null): string {
  if (meal === "vegetarian") return "Vegetarian";
  if (meal === "standard") return "Standard";
  return "—";
}

// ─── PDF Document ─────────────────────────────────────────────────────────────

export function WeddingPdfDocument({ data }: { data: PdfData }) {
  return (
    <Document
      title={`Plan mese — ${data.couple_names}`}
      author="WeddingList"
      subject="Plan de mese nuntă"
    >
      {/* ── Pagina 1: Header + Stats + Plan Mese ── */}
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.coupleNames}>{data.couple_names}</Text>
          <Text style={styles.weddingMeta}>
            {data.wedding_date
              ? new Date(data.wedding_date).toLocaleDateString("ro-RO", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : ""}
            {data.location ? ` · ${data.location}` : ""}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Sumar invitați</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{data.stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: "#48BB78" }]}>{data.stats.accepted}</Text>
              <Text style={styles.statLabel}>Confirmați</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: "#E53E3E" }]}>{data.stats.declined}</Text>
              <Text style={styles.statLabel}>Refuzați</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: "#9DA3BC" }]}>{data.stats.pending}</Text>
              <Text style={styles.statLabel}>În așteptare</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: "#ECC94B" }]}>{data.stats.maybe}</Text>
              <Text style={styles.statLabel}>Poate</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: "#C9907A" }]}>{data.stats.special_meals}</Text>
              <Text style={styles.statLabel}>Vegetarieni</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: "#C9907A" }]}>{data.stats.has_allergies}</Text>
              <Text style={styles.statLabel}>Alergii</Text>
            </View>
          </View>
        </View>

        {/* Plan mese */}
        <View style={styles.tablesSection}>
          <Text style={styles.sectionTitle}>Plan de mese</Text>
          {data.tables.map((table, i) => (
            <View key={i} style={styles.tableCard} wrap={false}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableName}>{table.name}</Text>
                <Text style={styles.tableCapacity}>
                  {table.guests.length}/{table.seat_count} locuri
                </Text>
              </View>
              {table.guests.length === 0 ? (
                <Text style={styles.emptyTable}>Masă goală</Text>
              ) : (
                <View style={styles.tableGuests}>
                  {table.guests.map((g, j) => (
                    <Text key={j} style={styles.guestChip}>{g}</Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>weddinglist.ro</Text>
          <Text style={styles.footerText}>
            Generat {new Date(data.generated_at).toLocaleDateString("ro-RO")}
          </Text>
        </View>
      </Page>

      {/* ── Pagina 2: Lista completă invitați ── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.coupleNames}>{data.couple_names}</Text>
          <Text style={styles.weddingMeta}>Listă completă invitați</Text>
        </View>

        <View style={styles.guestsSection}>
          <Text style={styles.sectionTitle}>Invitați</Text>

          {/* Column headers */}
          <View style={styles.tableHeader2}>
            <Text style={[styles.colHeader, { flex: 3 }]}>Nume</Text>
            <Text style={[styles.colHeader, { flex: 1, textAlign: "center" }]}>Status</Text>
            <Text style={[styles.colHeader, { flex: 1, textAlign: "center" }]}>Meniu</Text>
            <Text style={[styles.colHeader, { flex: 2 }]}>Masă</Text>
            <Text style={[styles.colHeader, { flex: 2 }]}>Alergii</Text>
          </View>

          {data.guests.map((g, i) => (
            <View key={i} style={styles.guestRow} wrap={false}>
              <Text style={styles.guestName}>{g.display_name}</Text>
              <Text style={[styles.guestStatus, { color: statusColor(g.rsvp_status) }]}>
                {statusLabel(g.rsvp_status)}
              </Text>
              <Text style={styles.guestMeal}>{mealLabel(g.meal_choice)}</Text>
              <Text style={styles.guestTable}>{g.table_name ?? "—"}</Text>
              <Text style={styles.guestAllergies}>{g.dietary_notes ?? ""}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>weddinglist.ro</Text>
          <Text style={styles.footerText}>
            Generat {new Date(data.generated_at).toLocaleDateString("ro-RO")}
          </Text>
        </View>
      </Page>
    </Document>
  );
}