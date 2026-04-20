import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ cityId: string }> };

export default async function CityAliasPage({ params }: PageProps) {
  const { cityId } = await params;
  redirect(`/?city=${encodeURIComponent(cityId)}`);
}
