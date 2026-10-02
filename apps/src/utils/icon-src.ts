export function iconSrc(iconKey: string): string {
  return iconKey.startsWith("/") ? iconKey : `/crypto/${iconKey}.svg`;
}
