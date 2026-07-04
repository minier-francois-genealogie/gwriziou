import { useCallback, useState } from "react";
import { api } from "../api/client";
import type { PhotoPersonne } from "../types/api";
import { formatNom } from "../utils/format";

export interface PhotoModalState {
  photos: PhotoPersonne[];
  personName: string;
}

export function usePhotoModal() {
  const [photoModal, setPhotoModal] = useState<PhotoModalState | null>(null);
  const [loading, setLoading] = useState(false);

  const openPhotos = useCallback(
    (photos: PhotoPersonne[], personName: string) => {
      if (photos.length === 0) return;
      setPhotoModal({ photos, personName });
    },
    [],
  );

  const openPhotosForPerson = useCallback(
    async (id: string, nom: string, prenoms: string | null) => {
      setLoading(true);
      try {
        const detail = await api.personne(id);
        if (detail.photos.length === 0) return;
        setPhotoModal({
          photos: detail.photos,
          personName: formatNom(nom, prenoms),
        });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const closePhotos = useCallback(() => setPhotoModal(null), []);

  return {
    photoModal,
    photoLoading: loading,
    openPhotos,
    openPhotosForPerson,
    closePhotos,
  };
}
