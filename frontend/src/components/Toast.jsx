import { useEffect } from 'react';

const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const bgColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  };

  return (
    <div
      className={`fixed top-4 right-4 max-w-md ${bgColors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-start gap-2`}
    >
      <span className="min-w-0 flex-1 whitespace-pre-line text-sm leading-snug">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-white hover:text-gray-200"
      >
        ×
      </button>
    </div>
  );
};

export default Toast;

