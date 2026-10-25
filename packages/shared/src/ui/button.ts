// The landing page's button, shared by the web app and the extension pop-up as
// Tailwind classes. Each app's CSS must @source this folder so the classes exist.

// Lifts 1px on hover and presses to .97, only when motion is allowed. transform-none
// cancels the base layer's button:active scale so the two presses don't stack.
export const BUTTON_FEEL =
  "transition-[translate,scale,background-color,color,filter,box-shadow] duration-180 ease-out-soft active:duration-60 active:transform-none motion-safe:not-disabled:hover:-translate-y-px motion-safe:not-disabled:active:translate-y-0 motion-safe:not-disabled:active:scale-97";

export const BUTTON_PRIMARY = `${BUTTON_FEEL} bg-primary font-bold text-primary-foreground inset-shadow-[0_-3px_0_rgb(22_32_10/0.18)] hover:brightness-105`;

// Dark buttons keep their surface's own background; this is their lip and feel.
export const BUTTON_DARK = `${BUTTON_FEEL} font-semibold inset-shadow-[0_-3px_0_rgb(0_0_0/0.35)]`;
