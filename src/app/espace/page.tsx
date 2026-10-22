import { Suspense } from "react";
import { Workspace } from "@/components/live/workspace";
export default function Page() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-10">
          Filémoire…
        </p>
      }
    >
      <Workspace />
    </Suspense>
  );
}
