// =============================================================================
// app/(public)/layout.tsx
// Layout pentru rutele publice — fără sidebar, fără nav
// Folosit de: /rsvp/[token]
// =============================================================================

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}