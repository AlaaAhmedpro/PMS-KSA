import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useLocale } from "../../store/LocaleContext";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** Optional secondary line under the title */
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** Extra class on the dialog panel */
  className?: string;
  /** Extra class on the scrollable body */
  bodyClassName?: string;
}

const sizes = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  className,
  bodyClassName,
}: Props) {
  const { t } = useLocale();
  const hasHeader = title != null || subtitle != null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="ui-modal-root fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          <div
            className="ui-modal-backdrop absolute inset-0"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              "ui-modal relative z-10 flex w-full max-h-[min(90vh,52rem)] flex-col overflow-hidden",
              sizes[size],
              className,
            )}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {hasHeader ? (
              <div className="ui-modal__header">
                <div className="min-w-0 flex-1">
                  {title != null ? (
                    <h3 className="ui-modal__title">{title}</h3>
                  ) : null}
                  {subtitle != null ? (
                    <p className="ui-modal__subtitle">{subtitle}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t("ui.modal.close")}
                  className="ui-modal__close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : null}
            <div
              className={cn(
                "ui-modal__body min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [scrollbar-width:thin]",
                bodyClassName,
              )}
            >
              {children}
            </div>
            {footer ? (
              <div className="ui-modal__footer">{footer}</div>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Bordered content panel for tables / lists inside modals */
export function ModalPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("ui-modal-panel", className)}>{children}</div>;
}

/** Soft toolbar strip (filters / add row) inside modals */
export function ModalToolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("ui-modal-toolbar", className)}>{children}</div>;
}

/** Empty state block inside modals */
export function ModalEmpty({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("ui-modal-empty", className)}>{children}</div>;
}

/** Soft info / profile card inside modals */
export function ModalCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("ui-modal-card", className)}>{children}</div>;
}
