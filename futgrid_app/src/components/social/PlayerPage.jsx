import { useParams } from "react-router-dom";
import ProfileCard from "./ProfileCard";

/** Shareable profile page: /oyuncu/:username */
export default function PlayerPage() {
  const { username } = useParams();
  return (
    <main className="min-h-[70vh] bg-page px-4 pb-20 pt-28 md:pt-32">
      <div className="mx-auto max-w-md overflow-hidden rounded-[20px] border border-line/10 bg-surface p-5 sm:p-6">
        <ProfileCard username={username ?? ""} />
      </div>
    </main>
  );
}
