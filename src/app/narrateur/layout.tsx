import { RoleShell } from "@/components/shell/role-shell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RoleShell role="narrateur">{children}</RoleShell>;
}
