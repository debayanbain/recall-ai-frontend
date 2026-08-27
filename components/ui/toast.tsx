"use client"

import * as React from "react"
import { Toast as ToastPrimitive } from "@base-ui/react/toast"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon, CheckIcon, InfoIcon, TriangleAlertIcon, LoaderIcon } from "lucide-react"

/**
 * Base UI toast, with this app's surface treatment applied.
 *
 * Customised from the shadcn `base-sera` source, which ships a square, flat, single-
 * weight card: corners rounded to match every other surface here, a tinted status
 * badge instead of a bare glyph, and typography/contrast set against the app tokens.
 * The palette is the app's -- a white card, the brand indigo on the action and on a
 * loading toast (`--brand-accent`); success/warning/error/info keep their own semantic
 * hues, since a failure that reads as brand-coloured is a failure nobody sees.
 * Re-running `shadcn add toast` will overwrite all of it.
 *
 * Call it through `@/lib/toast`, which wraps the manager in `success` / `error` / `info`
 * helpers rather than raw `toast.add({ type })` calls.
 */

const toast = ToastPrimitive.createToastManager()

function ToastProvider({ ...props }: ToastPrimitive.Provider.Props) {
  return <ToastPrimitive.Provider {...props} />
}

function ToastPortal({ ...props }: ToastPrimitive.Portal.Props) {
  return <ToastPrimitive.Portal data-slot="toast-portal" {...props} />
}

function ToastViewport({ className, ...props }: ToastPrimitive.Viewport.Props) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        // z-60 clears the sticky header and the mobile bottom nav; dialogs still sit above.
        // Bottom offset on mobile clears the bottom nav rather than covering it.
        "pointer-events-none fixed inset-x-4 bottom-24 z-60 mx-auto w-auto max-w-[380px] outline-none sm:right-6 sm:bottom-6 sm:left-auto sm:mx-0 sm:w-full",
        className
      )}
      {...props}
    />
  )
}

function Toast({ className, ...props }: ToastPrimitive.Root.Props) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      className={cn(
        "group/toast pointer-events-auto absolute right-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom border bg-popover text-popover-foreground will-change-transform outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        // Radius matches the app's cards -- the base-sera source ships square corners,
        // which read as a system alert next to everything else here.
        "rounded-2xl",
        // Contact shadow to seat the card + a wide soft one for lift. One large blur on
        // its own reads as a smudge on a light background.
        "shadow-[0_1px_2px_oklch(0.18_0.03_280/0.06),0_12px_32px_-12px_oklch(0.18_0.03_280/0.28)] dark:shadow-[0_1px_2px_oklch(0_0_0/0.4),0_16px_40px_-16px_oklch(0_0_0/0.7)]",
        // No status rail on the edge: the tinted badge is the whole signal, and a
        // second coloured element on a card this small competed with it rather than
        // reinforcing it. Colour is still never alone -- the glyph carries the meaning.
        "[--gap:0.75rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))]",
        "h-(--height) [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] [transition:transform_500ms_cubic-bezier(0.22,1,0.36,1),opacity_500ms,height_150ms]",
        "after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
        "data-expanded:h-(--toast-height) data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]",
        "data-limited:opacity-0 data-starting-style:[transform:translateY(150%)]",
        "[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]",
        "data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
        "data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
        "data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
        "data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
        "data-expanded:data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
        "data-expanded:data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
        "data-expanded:data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
        "data-expanded:data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
        className
      )}
      {...props}
    />
  )
}

function ToastContent({ className, ...props }: ToastPrimitive.Content.Props) {
  return (
    <ToastPrimitive.Content
      data-slot="toast-content"
      className={cn(
        "flex h-full items-start gap-3 overflow-hidden p-4 transition-opacity duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] data-behind:opacity-0 data-expanded:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function ToastTitle({ className, ...props }: ToastPrimitive.Title.Props) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn(
        "text-[0.9375rem] leading-snug font-semibold tracking-[-0.008em]",
        className
      )}
      {...props}
    />
  )
}

function ToastDescription({
  className,
  ...props
}: ToastPrimitive.Description.Props) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      // muted-foreground measures 6.03:1 on the light popover and 6.79:1 on the dark
      // card, both clear of the 4.5:1 body-text bar. Clamped to two lines: a toast is a
      // glance, and a tall card covers the thing it is reporting on.
      className={cn(
        "line-clamp-2 text-[0.8125rem] leading-normal text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function ToastAction({
  className,
  render = <Button variant="outline" size="sm" />,
  ...props
}: ToastPrimitive.Action.Props) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      render={render}
      // Tinted rather than filled: the toast reports, the action is an offer. Shape,
      // weight and casing stay the app's Button so it is not a one-off control.
      className={cn(
        "shrink-0 border-brand-accent/25 text-brand-accent hover:border-brand-accent/40 hover:bg-brand-accent/10 hover:text-brand-accent",
        className
      )}
      {...props}
    />
  )
}

function ToastClose({
  className,
  children,
  render = <Button variant="ghost" size="icon-sm" />,
  ...props
}: ToastPrimitive.Close.Props) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label="Close toast"
      render={render}
      className={cn(
        // after:-inset-2 keeps a 44px touch target behind a 28px control, so the card's
        // padding stays tight without failing the touch minimum.
        "relative shrink-0 rounded-full text-muted-foreground after:absolute after:-inset-2 after:content-[''] hover:text-foreground",
        // Quiet until wanted -- but keyboard users never hover, and touch has no hover
        // at all, so both get it unconditionally.
        "opacity-0 transition-opacity duration-150 ease-out group-hover/toast:opacity-100 focus-visible:opacity-100 max-[640px]:opacity-100 [@media(hover:none)]:opacity-100",
        className
      )}
      {...props}
    >
      {children ?? (
        <XIcon aria-hidden="true" />
      )}
    </ToastPrimitive.Close>
  )
}

/**
 * Status badge.
 *
 * The tint carries the meaning and the glyph repeats it, so the status survives
 * greyscale, colour blindness, and a dark theme. Every `-fg` on `-soft` pair here was
 * measured against WCAG AA (5.8:1 at worst) rather than picked by eye.
 */
const TONES = {
  success: "bg-success-soft text-success-fg",
  info: "bg-info-soft text-info-fg",
  warning: "bg-warning-soft text-warning-fg",
  error: "bg-destructive-soft text-destructive-fg",
  // Brand rather than grey: a loading toast is the app working, not a neutral state.
  loading: "bg-primary-soft text-brand-accent",
} as const

function ToastIcon({ type }: { type: string | undefined }) {
  const tone = type as keyof typeof TONES | undefined

  if (!tone || !(tone in TONES)) {
    return null
  }

  const glyph = {
    success: <CheckIcon aria-hidden="true" strokeWidth={2.5} />,
    info: <InfoIcon aria-hidden="true" strokeWidth={2.25} />,
    warning: <TriangleAlertIcon aria-hidden="true" strokeWidth={2.25} />,
    error: <TriangleAlertIcon aria-hidden="true" strokeWidth={2.25} />,
    loading: <LoaderIcon className="animate-spin" aria-hidden="true" strokeWidth={2.25} />,
  }[tone]

  return (
    <span
      data-slot="toast-icon"
      className={cn(
        // mt-px optically centres the badge on the title's cap height; centring on the
        // line box leaves it sitting a hair high.
        "mt-px grid size-8 shrink-0 place-items-center rounded-full [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        TONES[tone]
      )}
    >
      {glyph}
    </span>
  )
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager()

  return toasts.map((toastItem) => (
    <Toast key={toastItem.id} toast={toastItem}>
      <ToastContent>
        <ToastIcon type={toastItem.type} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <ToastTitle />
          <ToastDescription />
        </div>
        <ToastAction className="mt-px" />
        <ToastClose className="-mt-1 -mr-1" />
      </ToastContent>
    </Toast>
  ))
}

function Toaster({
  children,
  toastManager = toast,
  ...props
}: ToastPrimitive.Provider.Props) {
  return (
    <ToastProvider toastManager={toastManager} {...props}>
      {children}
      <ToastPortal>
        <ToastViewport>
          <ToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  )
}

const createToastManager = ToastPrimitive.createToastManager
const useToastManager = ToastPrimitive.useToastManager

export {
  Toaster,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  createToastManager,
  toast,
  useToastManager,
}
