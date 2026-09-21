import { CATEGORIES } from "@/assets/constants/data";
import { CategorySongList } from "@/components/CategorySongList";

const meta = CATEGORIES.find((c) => c.key === "party")!;

export default function PartyCategory() {
  return <CategorySongList category={meta.key} label={meta.label} emoji={meta.emoji} />;
}
