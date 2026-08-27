/**
 * Toast helpers over the Base UI toast manager.
 *
 * The manager's own surface is `toast.add({ title, description, type })`. Call sites
 * across the app say `toast.success("Link copied", { description })`, which reads better
 * at the point of use and keeps the type from being a stringly-typed field every caller
 * has to remember. This is the one place that translates between the two.
 *
 * Nothing here renders — the surface lives in `components/ui/toast.tsx`.
 */
import { toast as manager } from "@/components/ui/toast";

type Options = {
  description?: React.ReactNode;
  /** ms before auto-dismiss; 0 pins the toast until it is closed. */
  duration?: number;
  action?: { label: string; onClick: () => void };
};

type Kind = "success" | "error" | "info" | "warning" | "loading";

/**
 * Errors get 6s, everything else 4s.
 *
 * Long enough to read two lines, short enough not to camp on the content underneath —
 * and a failure is the one message worth re-reading, so it earns the extra beat.
 */
const DEFAULT_TIMEOUT: Record<Kind, number> = {
  success: 4000,
  info: 4000,
  warning: 5000,
  error: 6000,
  // A loading toast is closed by whatever it is waiting on, never by a timer.
  loading: 0,
};

function emit(type: Kind, title: React.ReactNode, options: Options = {}): string {
  const { description, duration, action } = options;
  return manager.add({
    title,
    description,
    type,
    timeout: duration ?? DEFAULT_TIMEOUT[type],
    // Screen readers interrupt for failures and wait their turn for everything else.
    priority: type === "error" ? "high" : "low",
    ...(action
      ? { actionProps: { children: action.label, onClick: action.onClick } }
      : {}),
  });
}

export const toast = {
  success: (title: React.ReactNode, options?: Options) => emit("success", title, options),
  error: (title: React.ReactNode, options?: Options) => emit("error", title, options),
  info: (title: React.ReactNode, options?: Options) => emit("info", title, options),
  warning: (title: React.ReactNode, options?: Options) => emit("warning", title, options),
  loading: (title: React.ReactNode, options?: Options) => emit("loading", title, options),
  /** Drives one toast through loading -> success/error instead of stacking three. */
  promise: manager.promise,
  update: manager.update,
  /** No id closes the newest toast, matching the manager's own behaviour. */
  dismiss: (id?: string) => manager.close(id),
  add: manager.add,
};
