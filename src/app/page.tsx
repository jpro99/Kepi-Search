import { HomeMapLoader } from "./HomeMapLoader";

export default function Home() {
  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";
  return <HomeMapLoader maptilerKey={maptilerKey} />;
}
