export const revalidate = 3600;

import { MediaDetail } from "@/components/MediaDetail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MangaPage({ params }: Props) {
  const { id } = await params;
  return <MediaDetail id={id} mediaType="manga" />;
}
