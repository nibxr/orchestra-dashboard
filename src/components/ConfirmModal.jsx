import React, { useState, createContext, useContext } from 'react';
import { Icon } from './Icon';

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in" onClick={state.onCancel}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      {/* Modal */}
      <div
        className="relative bg-white dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800/60 rounded-2xl shadow-2xl w-full max-w-sm mx-4 animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Content — centered, minimal */}
        <div className="px-8 pt-8 pb-6 text-center">
          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full mb-4 ${
            isDanger ? 'bg-red-500/10' : 'bg-neutral-100 dark:bg-neutral-800'
          }`}>
            {isDanger ? (
              <Icon name="alert-triangle" size={18} className="text-red-500" />
            ) : (
              <Icon name="information-circle-contained" size={18} className="text-neutral-500" />
            )}
          </div>
          <h3 className="font-lastik text-body-xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            {state.title}
          </h3>
          {state.message && (
            <p className="text-body-md text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">{state.message}</p>
          )}
        </div>

        {/* Input for prompt */}
        {state.isPrompt && (
          <div className="px-8 pb-6">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                state.onInputChange?.(e.target.value);
              }}
              className="w-full bg-neutral-50 dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors placeholder-neutral-400 dark:placeholder-neutral-600"
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
        <div className="flex items-center gap-3 px-8 pb-8">
          <button
            onClick={state.onCancel}
            className="flex-1 px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-xl text-sm font-medium transition-all duration-200"
          >
            {state.cancelText}
          </button>
          <button
            onClick={state.onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              isDanger
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-white hover:bg-neutral-200 text-black'
            }`}
          >
            {state.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
