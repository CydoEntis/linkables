// Names are stored as typed; the UI shows them with a capital first letter.
export function displayName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}
