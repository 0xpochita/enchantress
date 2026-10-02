import "@/styles/landing.css";
import { LandingShell } from "@/components/(landing)";

export default function LandingLayout({ children }: LayoutProps<"/">) {
  return <LandingShell>{children}</LandingShell>;
}
