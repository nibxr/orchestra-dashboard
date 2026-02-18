import React, { useState, createContext, useContext } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

const ConfirmContext = createContext();

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider = ({ children }) => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'danger', // 'danger' or 'info'
    onConfirm: null,
    onCancel: null,
  });

  const confirm = ({
    title = 'Are you sure?',
    message = '',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
  }) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        variant,
        onConfirm: () => {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  };

  const prompt = ({
    title = 'Enter value',
    message = '',
    defaultValue = '',
    confirmText = 'OK',
    cancelText = 'Cancel',
  }) => {
    return new Promise((resolve) => {
      let inputValue = defaultValue;

      setConfirmState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        variant: 'info',
        isPrompt: true,
        defaultValue,
        onInputChange: (value) => {
          inputValue = value;
        },
        onConfirm: () => {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
          resolve(inputValue);
        },
        onCancel: () => {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
          resolve(null);
        },
      });
    });
  };

  return (
    <ConfirmContext.Provider value={{ confirm, prompt }}>
      {children}
      <ConfirmModal state={confirmState} />
    </ConfirmContext.Provider>
  );
};

const ConfirmModal = ({ state }) => {
  const [inputValue, setInputValue] = useState(state.defaultValue || '');

  if (!state.isOpen) return null;

  const isDanger = state.variant === 'danger';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={state.onCancel}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-2xl w-full max-w-md mx-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-start gap-3 p-6 pb-4">
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              isDanger
                ? 'bg-red-500/10 text-red-500'
                : 'bg-lime-500/10 text-lime-500'
            }`}
          >
            {isDanger ? (
              <AlertTriangle size={20} />
            ) : (
              <Info size={20} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
              {state.title}
            </h3>
            {state.message && (
              <p className="text-sm text-neutral-400">{state.message}</p>
            )}
          </div>
          <button
            onClick={state.onCancel}
            className="flex-shrink-0 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Input for prompt */}
        {state.isPrompt && (
          <div className="px-6 pb-4">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                state.onInputChange?.(e.target.value);
              }}
              className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-lime-600 dark:focus:border-lime-500 transition-colors"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  state.onConfirm();
                } else if (e.key === 'Escape') {
                  state.onCancel();
                }
              }}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 p-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <button
            onClick={state.onCancel}
            className="flex-1 px-4 py-2 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
          >
            {state.cancelText}
          </button>
          <button
            onClick={state.onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isDanger
                ? 'bg-red-500 hover:bg-red-600 text-neutral-900 dark:text-white'
                : 'bg-lime-500 hover:bg-lime-600 text-black'
            }`}
          >
            {state.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
