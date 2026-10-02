import { MainShell } from "@/components/(main)";
import { WalletProviders } from "@/features/wallet";

export const dynamic = "force-dynamic";

export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <WalletProviders>
      <MainShell>{children}</MainShell>
    </WalletProviders>
  );
}
