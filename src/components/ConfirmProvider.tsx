import React, { createContext, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as Icons from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
}

type ConfirmFunction = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFunction | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions | null;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    options: null,
    resolve: null,
  });

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        options,
        resolve,
      });
    });
  };

  const handleConfirm = () => {
    if (modalState.resolve) {
      modalState.resolve(true);
    }
    setModalState({ isOpen: false, options: null, resolve: null });
  };

  const handleCancel = () => {
    if (modalState.resolve) {
      modalState.resolve(false);
    }
    setModalState({ isOpen: false, options: null, resolve: null });
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {modalState.isOpen && modalState.options && (
          <div
            className="modal-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              zIndex: 99999,
              display: 'grid',
              placeItems: 'center',
              padding: '24px',
            }}
            onClick={handleCancel}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '400px',
                background: 'var(--card-solid)',
                border: '1px solid var(--card-border)',
                borderRadius: '24px',
                padding: '24px',
                boxShadow: 'var(--shadow)',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    display: 'grid',
                    placeItems: 'center',
                    backgroundColor: modalState.options.type === 'danger' || modalState.options.type === 'warning'
                      ? 'rgba(255, 138, 107, 0.15)'
                      : 'rgba(198, 242, 78, 0.15)',
                    color: modalState.options.type === 'danger' || modalState.options.type === 'warning'
                      ? 'var(--coral)'
                      : 'var(--accent-deep)',
                    flexShrink: 0,
                  }}
                >
                  {modalState.options.type === 'danger' || modalState.options.type === 'warning' ? (
                    <Icons.AlertTriangle size={20} />
                  ) : (
                    <Icons.HelpCircle size={20} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <h3
                    className="font-display font-black"
                    style={{
                      fontSize: '18px',
                      color: 'var(--ink)',
                      lineHeight: '1.2',
                      marginBottom: '8px',
                    }}
                  >
                    {modalState.options.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '13.5px',
                      color: 'var(--ink-soft)',
                      lineHeight: '1.5',
                      fontWeight: 500,
                    }}
                  >
                    {modalState.options.message}
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  marginTop: '22px',
                }}
              >
                <button
                  onClick={handleCancel}
                  className="btn soft"
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    borderRadius: '10px',
                  }}
                >
                  {modalState.options.cancelText || 'Cancel'}
                </button>
                <button
                  onClick={handleConfirm}
                  className="btn primary"
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    borderRadius: '10px',
                    backgroundColor: modalState.options.type === 'danger' ? 'var(--coral)' : undefined,
                    color: modalState.options.type === 'danger' ? '#fff' : undefined,
                    boxShadow: modalState.options.type === 'danger' ? '0 10px 24px -12px var(--coral)' : undefined,
                  }}
                >
                  {modalState.options.confirmText || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
