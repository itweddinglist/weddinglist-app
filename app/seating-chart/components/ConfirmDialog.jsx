"use client";
export default function ConfirmDialog({ confirmDialog, setConfirmDialog }) {
  if (!confirmDialog) return null;
  return (
    <div
      className="sc-overlay"
      onClick={(e) => e.target === e.currentTarget && setConfirmDialog(null)}
    >
      <div className="sc-confirm">
        <div className="conf-title">{confirmDialog.title}</div>
        <div className="conf-sub">{confirmDialog.sub}</div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="conf-cancel" onClick={() => setConfirmDialog(null)}>
            Anuleaza
          </button>
          <button
            className="conf-ok"
            onClick={() => {
              confirmDialog?.onOk?.();
              setConfirmDialog(null);
            }}
          >
            Confirma
          </button>
        </div>
      </div>
    </div>
  );
}
