import type { Metadata } from "next";
import { WithdrawalForm } from "@/components/live/withdrawal";
export const metadata: Metadata = {
  title: "Rétractation",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <WithdrawalForm />;
}
