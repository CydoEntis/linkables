import { Toaster as Sonner, type ToasterProps } from "sonner"

// Dark only until a light theme is drawn (ADR-0006), so no theme provider.
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="bottom-center"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--accent)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--line-strong)",
          "--border-radius": "var(--radius-lg)",
        } as React.CSSProperties
      }
      toastOptions={{ classNames: { toast: "font-sans text-sm font-semibold" } }}
      {...props}
    />
  )
}

export { Toaster }
