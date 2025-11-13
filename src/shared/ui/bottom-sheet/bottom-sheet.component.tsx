import * as Dialog from '@radix-ui/react-dialog';
import React from 'react';
import { IoClose } from 'react-icons/io5';
import clsx from 'clsx';

import './bottom-sheet.styles.scss';
import { RecIcon } from '../icon';

type BottomSheetProps = {
  /** Uncontrolled open state */
  defaultOpen?: boolean;
  /** Controlled open state */
  open?: boolean;
  /** Controlled state change */
  onOpenChange?: (open: boolean) => void;

  /** Optional trigger to open the sheet (e.g., a button). */
  trigger?: React.ReactNode;

  /** Title shown in the header (optional). */
  title?: React.ReactNode;

  /** Right-side header actions (e.g., “Clear”). */
  headerActions?: React.ReactNode;

  /** Content for the sticky footer (e.g., a “Done” button). */
  footer?: React.ReactNode;

  /** Include a top grab handle bar. */
  showHandle?: boolean;

  /** Show an explicit close (X) button. */
  showClose?: boolean;

  /** Sheet visual size. */
  size?: 'auto' | 'tall' | 'fullscreen';

  /** Disable dismiss via overlay click / ESC. */
  nonDismissable?: boolean;

  /** Additional className for the Content node. */
  className?: string;

  /** Content area (scrollable body). */
  children?: React.ReactNode;
};

const BottomSheet: React.FC<BottomSheetProps> = ({
  defaultOpen,
  open,
  onOpenChange,
  trigger,
  title,
  headerActions,
  footer,
  showHandle = true,
  showClose = true,
  size = 'auto',
  nonDismissable = false,
  className,
  children,
}) => {
  return (
    <Dialog.Root defaultOpen={defaultOpen} open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}

      <Dialog.Portal>
        <Dialog.Overlay
          className="bs__overlay"
          // Prevent dismiss if needed
          onPointerDown={nonDismissable ? (e) => e.preventDefault() : undefined}
        />

        <Dialog.Content
          className={clsx('bs', `bs--${size}`, className)}
          // Prevent ESC close if needed
          onEscapeKeyDown={nonDismissable ? (e) => e.preventDefault() : undefined}
          aria-label={typeof title === 'string' ? title : undefined}
        >
          {showHandle && <div className="bs__handle" aria-hidden />}

          {(title || headerActions || showClose) && (
            <header className="bs__header">
              {title ? <Dialog.Title className="bs__title">{title}</Dialog.Title> : <span />}

              <div className="bs__header-actions">
                {headerActions}
                {showClose && (
                  <Dialog.Close asChild>
                    <button className="bs__close" aria-label="Close">
                      <RecIcon icon={IoClose} size={18} />
                    </button>
                  </Dialog.Close>
                )}
              </div>
            </header>
          )}

          <div className="bs__body">{children}</div>

          {footer ? <footer className="bs__footer">{footer}</footer> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default BottomSheet;
