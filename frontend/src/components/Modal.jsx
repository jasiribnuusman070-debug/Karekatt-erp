export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="flex items-center justify-between mb-lg">
          <h3 className="text-headline-sm text-on-background font-semibold">{title}</h3>
          <button onClick={onClose} className="p-xs rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
