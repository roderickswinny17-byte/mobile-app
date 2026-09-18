import { usePathname, useRouter } from "expo-router";
import { Gesture } from "react-native-gesture-handler";
import { tabs } from "@/assets/constants/data";

const SWIPE_THRESHOLD = 50; // px of horizontal movement to trigger a tab change

export function useSwipeTabNavigation() {
  const router = useRouter();
  const pathname = usePathname(); // e.g. "/home", "/subscriptions"

  const currentIndex = tabs.findIndex((tab) => pathname === `/${tab.name}`);

  const goToTab = (index: number) => {
    if (index < 0 || index >= tabs.length) return; // already at the first/last tab
    router.navigate(`/${tabs[index].name}` as never);
  };

  return Gesture.Pan()
    .activeOffsetX([-20, 20]) // only claims the gesture once it's clearly horizontal
    .failOffsetY([-15, 15])   // lets vertical scrolling pass through untouched
    .onEnd((event) => {
      if (currentIndex === -1) return;
      if (event.translationX < -SWIPE_THRESHOLD) {
        goToTab(currentIndex + 1); // swipe left -> next tab
      } else if (event.translationX > SWIPE_THRESHOLD) {
        goToTab(currentIndex - 1); // swipe right -> previous tab
      }
    });
}
