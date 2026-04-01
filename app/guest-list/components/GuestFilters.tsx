// =============================================================================
// app/guest-list/components/GuestFilters.tsx
// Search + filtre status / parte / grup
// =============================================================================

import { Search, X } from "lucide-react";

interface Group {
  id: string;
  name: string;
}

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  filterStatus: string;
  onFilterStatusChange: (v: string) => void;
  filterSide: string;
  onFilterSideChange: (v: string) => void;
  filterGroup: string;
  onFilterGroupChange: (v: string) => void;
  groups: Group[];
}

const selectStyle = {
  border: "1px solid var(--cream-line)",
  borderRadius: "8px",
  background: "white",
  color: "var(--navy)",
  fontSize: "0.82rem",
  padding: "0.5rem 0.75rem",
  outline: "none",
  cursor: "pointer",
};

export default function GuestFilters({
  search, onSearchChange,
  filterStatus, onFilterStatusChange,
  filterSide, onFilterSideChange,
  filterGroup, onFilterGroupChange,
  groups,
}: Props) {
  const hasActiveFilters =
    search || filterStatus !== "all" || filterSide !== "all" || filterGroup !== "all";

  const clearAll = () => {
    onSearchChange("");
    onFilterStatusChange("all");
    onFilterSideChange("all");
    onFilterGroupChange("all");
  };

  return (
    <div
      className="flex items-center gap-3 mb-6 flex-wrap"
      style={{
        background: "white",
        borderRadius: "12px",
        padding: "1rem 1.25rem",
        boxShadow: "0 2px 12px rgba(26,31,58,0.07)",
      }}
    >
      {/* Search */}
      <div className="relative flex-1 min-w-48">
        <Search
          size={15}
          strokeWidth={1.8}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--muted)" }}
        />
        <input
          type="text"
          placeholder="Caută invitat..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg outline-none"
          style={{
            border: "1px solid var(--cream-line)",
            background: "var(--ivory)",
            color: "var(--navy)",
            fontSize: "0.82rem",
          }}
        />
        {search && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--muted)" }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Filter Status */}
      <select
        value={filterStatus}
        onChange={(e) => onFilterStatusChange(e.target.value)}
        style={selectStyle}
      >
        <option value="all">Toate statusurile</option>
        <option value="attending">Confirmați</option>
        <option value="pending">În așteptare</option>
        <option value="invited">Invitați</option>
        <option value="declined">Refuzați</option>
        <option value="maybe">Poate</option>
      </select>

      {/* Filter Parte */}
      <select
        value={filterSide}
        onChange={(e) => onFilterSideChange(e.target.value)}
        style={selectStyle}
      >
        <option value="all">Toate părțile</option>
        <option value="bride">Mireasă</option>
        <option value="groom">Mire</option>
        <option value="both">Ambii</option>
        <option value="other">Altele</option>
      </select>

      {/* Filter Grup */}
      {groups.length > 0 && (
        <select
          value={filterGroup}
          onChange={(e) => onFilterGroupChange(e.target.value)}
          style={selectStyle}
        >
          <option value="all">Toate grupurile</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      )}

      {/* Clear all */}
      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
          style={{ color: "var(--muted)", background: "var(--cream)" }}
        >
          <X size={12} />
          Resetează
        </button>
      )}
    </div>
  );
}