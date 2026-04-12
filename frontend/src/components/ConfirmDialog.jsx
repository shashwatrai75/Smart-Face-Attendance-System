import { createPortal } from 'react-dom';

const ConfirmDialog = ({ message, onConfirm, onCancel }) => {
  const root =
    typeof document !== 'undefined' ? document.body : null;
  if (!root) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:border dark:border-gray-700 dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-4 text-gray-800 dark:text-gray-200">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm?.();
            }}
            className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>,
    root
  );
};

export default ConfirmDialog;
