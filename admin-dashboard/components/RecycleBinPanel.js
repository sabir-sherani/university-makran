import { LuTrash2, LuRotateCcw, LuX, LuAlertTriangle } from 'react-icons/lu';

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function RecycleBinPanel({ open, onClose, items, loading, onRestore, onPermanentDelete, onEmptyTrash, label = 'item' }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#1e1e2e,#3a1c1c)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center">
              <LuTrash2 size={18} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base">Recycle Bin</h3>
              <p className="text-white/50 text-xs">{items.length} deleted {label}{items.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
            <LuX size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="w-7 h-7 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <LuTrash2 size={40} className="mx-auto mb-3 text-gray-200" />
              <p className="font-medium">Recycle bin is empty</p>
              <p className="text-sm mt-1">Deleted items will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <div key={item._id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-200 transition-all">
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                    <LuTrash2 size={15} className="text-red-400" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{item.title || item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Deleted {timeAgo(item.deletedAt)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => onRestore(item._id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
                      title="Restore"
                    >
                      <LuRotateCcw size={12} /> Restore
                    </button>
                    <button
                      onClick={() => onPermanentDelete(item._id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                      title="Delete permanently"
                    >
                      <LuX size={12} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <LuAlertTriangle size={13} className="text-amber-400" />
              Permanently deleted items cannot be recovered.
            </div>
            <button
              onClick={onEmptyTrash}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 transition-colors shrink-0"
            >
              Empty Trash
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
