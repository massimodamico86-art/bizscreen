
const Toast = ({ message, type = 'success', onClose }) => {
  const icons = {
    success: <Check size={20} aria-hidden="true" />,
    error: <AlertCircle size={20} aria-hidden="true" />,
    info: <Info size={20} aria-hidden="true" />
  };

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  };

  const ariaRoles = {
    success: 'status',
    error: 'alert',
    info: 'status'
  };

  return (
    <div
      className={`fixed bottom-4 right-4 ${colors[type] || colors.info} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 z-50`}
      role={ariaRoles[type] || 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      {icons[type] || icons.info}
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-2 hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent rounded p-1"
        aria-label="Close notification"
      >
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
};

export default Toast;
