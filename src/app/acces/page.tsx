import { AccessScreen } from "@/components/live/auth";
export const dynamic = "force-dynamic";
export default function AccessPage() {
  const localInbox =
    process.env.NODE_ENV === "development" &&
    process.env.FILEMOIRE_LOCAL === "true";
  return <AccessScreen localInbox={localInbox} />;
}
