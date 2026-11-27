import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import AchievementGrid from "../social/AchievementGrid";

/** Own achievements on the account page. */
export default function MyAchievements() {
  const [items, setItems] = useState(null);
  useEffect(() => {
    let alive = true;
    api
      .get("/me/achievements")
      .then((data) => alive && setItems(data.entries ?? []))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, []);
  if (!items?.length) return null;
  return (
    <section className="rounded-[14px] border border-line/10 bg-line/3 p-4 md:p-5">
      <AchievementGrid items={items} />
    </section>
  );
}
