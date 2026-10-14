import { PublicShell } from "@/components/shell/public-shell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
