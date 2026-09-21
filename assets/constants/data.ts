import type { Href } from "expo-router";
import { icons } from "./icons";

export const tabs = [
    { name: 'home', title: 'Home', icon: icons.home },
    { name: 'subscriptions', title: 'Subscriptions', icon: icons.wallet },
    { name: 'insights', title: 'Insights', icon: icons.activity },
    { name: 'settings', title: 'Settings', icon: icons.setting }

];

export const CATEGORIES = [
  { key: "happy", label: "Happy", emoji: "😄" },
  { key: "sad", label: "Sad", emoji: "😢" },
  { key: "love", label: "Love", emoji: "❤️" },
  { key: "party", label: "Party", emoji: "🎉" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

// Explicit literal map (not a template-literal path): with typedRoutes
// enabled in app.json, `/category/${key}` collapses to plain `string` and
// fails expo-router's generated Href union, so each route is spelled out.
export const CATEGORY_ROUTES: Record<CategoryKey, Href> = {
  happy: "/category/happy",
  sad: "/category/sad",
  love: "/category/love",
  party: "/category/party",
};