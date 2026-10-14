"use client";

import { Info } from "lucide-react";
import { PhotoGrid, PhotoUploader } from "@/components/narrator/photos";
import { Alert } from "@/components/ui/alert";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { isLocked, isLowRes } from "@/lib/rules";
import { useNarratorProject } from "@/lib/session";

export function PhotosScreen() {
  const p = useNarratorProject()!;
  const locked = isLocked(p);
  const low = p.photos.filter(isLowRes).length;
  return (
    <div className="container-page max-w-6xl py-10">
      <PageHeader eyebrow="Mes photos" title="Les images de votre histoire" intro="Ajoutez une légende, une date et les personnes présentes, puis rattachez chaque photo à un souvenir." />
      {!locked && (
        <div className="mt-6">
          <PhotoUploader project={p} />
        </div>
      )}
      <Alert tone="info" className="mt-4">
        <Info className="mr-1 inline size-4" aria-hidden />
        Prototype : les photos importées sont conservées uniquement dans ce navigateur (IndexedDB), sans chiffrement ni sauvegarde. N'importez pas de vraies photos de famille.
      </Alert>
      {low > 0 && <Alert tone="warning" className="mt-4" title={`${low} photo(s) en résolution faible`}>Elles pourraient être floues à l'impression. Si vous avez un meilleur original, importez-le ; sinon, vous pouvez les garder.</Alert>}
      <div className="mt-8">
        {p.photos.length ? <PhotoGrid project={p} photos={p.photos} locked={locked} /> : <EmptyState title="Aucune photo pour l'instant">Les photos rendent le livre vivant : une maison, un visage, un objet.</EmptyState>}
      </div>
    </div>
  );
}
