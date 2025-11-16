import React, { useState } from 'react';

import { Button, Modal } from '@shared/ui';

import './confirm-modal.styles.scss';

interface ConfirmaModalProps {
  message: string;
  buttonLabel: string;
  loading?: boolean;
  handleConfirm: () => Promise<unknown> | unknown;
}

const ConfirmaModal: React.FC<ConfirmaModalProps> = ({
  message,
  buttonLabel,
  loading,
  handleConfirm,
}) => {
  const [open, setOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onConfirmClick = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await handleConfirm(); // await the thunk (via unwrap in caller)
      setOpen(false); // close only on success
    } catch (e) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="danger" type="button" onClick={() => setOpen(true)}>
        <span>{buttonLabel}</span>
      </Button>
      <Modal isOpen={open} onClose={() => (submitting ? null : setOpen(false))} title="Confirm">
        <div className="confirmation-modal">
          <p>{message}</p>
          {error && <p className="confirm-error">{error}</p>}
        </div>

        <Button
          variant="primary"
          type="button"
          onClick={onConfirmClick}
          isLoading={submitting || loading}
          disabled={submitting || loading}
          className="confirm-modal-btn"
        >
          <span>Confirm</span>
        </Button>
      </Modal>
    </>
  );
};

export default ConfirmaModal;
