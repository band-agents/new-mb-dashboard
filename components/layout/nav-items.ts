import {
  LayoutDashboard,
  Megaphone,
  Layers,
  Image as ImageIcon,
  Sparkles,
  Users,
  LineChart,
  Target,
  Wallet,
  FileText,
  BellRing,
  Settings,
} from "lucide-react";

// labelKey maps to lib/i18n/dictionaries/{en,ar}.ts under "nav".
export const NAV_ITEMS = [
  { href: "overview", labelKey: "overview", icon: LayoutDashboard },
  { href: "campaigns", labelKey: "campaigns", icon: Megaphone },
  { href: "ad-sets", labelKey: "adSets", icon: Layers },
  { href: "ads", labelKey: "ads", icon: ImageIcon },
  { href: "creatives", labelKey: "creatives", icon: Sparkles },
  { href: "audiences", labelKey: "audiences", icon: Users },
  { href: "performance", labelKey: "performance", icon: LineChart },
  { href: "conversions", labelKey: "conversions", icon: Target },
  { href: "budget", labelKey: "budget", icon: Wallet },
  { href: "reports", labelKey: "reports", icon: FileText },
  { href: "alerts", labelKey: "alerts", icon: BellRing },
  { href: "account", labelKey: "account", icon: Settings },
] as const;
