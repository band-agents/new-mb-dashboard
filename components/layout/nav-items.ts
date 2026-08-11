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

export const NAV_ITEMS = [
  { href: "overview", label: "Overview", icon: LayoutDashboard },
  { href: "campaigns", label: "Campaigns", icon: Megaphone },
  { href: "ad-sets", label: "Ad Sets", icon: Layers },
  { href: "ads", label: "Ads", icon: ImageIcon },
  { href: "creatives", label: "Creatives", icon: Sparkles },
  { href: "audiences", label: "Audiences", icon: Users },
  { href: "performance", label: "Performance", icon: LineChart },
  { href: "conversions", label: "Conversions", icon: Target },
  { href: "budget", label: "Budget & Spend", icon: Wallet },
  { href: "reports", label: "Reports", icon: FileText },
  { href: "alerts", label: "Alerts & Insights", icon: BellRing },
  { href: "account", label: "Account", icon: Settings },
] as const;
