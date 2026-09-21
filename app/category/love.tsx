import { CATEGORIES } from "@/assets/constants/data";
import { CategorySongList } from "@/components/CategorySongList";

const meta = CATEGORIES.find((c) => c.key === "love")!;

export default function LoveCategory() {
  return <CategorySongList category={meta.key} label={meta.label} emoji={meta.emoji} />;
}
