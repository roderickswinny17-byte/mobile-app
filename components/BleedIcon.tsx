import Svg, { Path, Rect } from "react-native-svg";

type Props = { size?: number; color?: string };

// Bleed's mark: a card (what you're paying with) with a drop escaping its
// corner -- money leaking out unnoticed. Terracotta (#D9785C) is this app's
// actual --color-primary, not the error-red -- this is a brand mark, not a
// status color, even though it's used inside warning-styled UI.
export function BleedIcon({ size = 24, color = "#D9785C" }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="6" width="16" height="12" rx="2" stroke={color} strokeWidth="1.6" />
      <Rect x="2" y="9" width="16" height="2.2" fill={color} />
      <Path d="M18.5 11c1.8 2.2 2.7 3.7 2.7 5a2.7 2.7 0 1 1-5.4 0c0-1.3.9-2.8 2.7-5Z" fill={color} />
    </Svg>
  );
}
