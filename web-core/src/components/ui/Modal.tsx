import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
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
  children,
  footer,
  size = "md",
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          <div
            className="absolute inset-0 bg-steel-950/45"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              "surface relative z-10 flex w-full max-h-[min(90vh,52rem)] flex-col overflow-hidden rounded-md",
              sizes[size],
            )}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {title ? (
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-steel-100 px-5 py-3.5 dark:border-steel-800">
                <h3 className="text-[16px] font-bold text-steel-800 dark:text-steel-100">
                  {title}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="إغلاق"
                  className="rounded p-1.5 text-steel-400 transition-colors duration-150 hover:bg-steel-100 hover:text-steel-700 dark:hover:bg-steel-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : null}
            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-5 py-4 [scrollbar-width:thin]">
              {children}
            </div>
            {footer ? (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-steel-100 px-5 py-3.5 dark:border-steel-800">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
