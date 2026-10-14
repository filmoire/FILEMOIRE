import { asset, Link } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex shrink-0 items-center rounded-md", className)} aria-label="Filémoire — accueil">
      <img src={asset("/brand/filemoire-logo.png")} alt="Filémoire" width={180} height={39} className="h-9 w-auto sm:h-10" />
    </Link>
  );
}
