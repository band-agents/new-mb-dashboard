import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

const STEP_LABELS: Record<string, string> = {
  pageViews: "Page Views",
  viewContent: "View Content",
  addToCart: "Add to Cart",
  initiateCheckout: "Initiate Checkout",
  purchases: "Purchase",
  leads: "Lead",
  registrations: "Complete Registration",
};

export function ConversionFunnel({ funnel }: { funnel: Record<string, number> }) {
  const steps = Object.entries(funnel).filter(([, v]) => v > 0);
  if (steps.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-xs text-muted-foreground">
          No standard event data is available for this account yet. Once the Meta Pixel/CAPI events are
          connected, tracked events will appear here.
        </p>
      </Card>
    );
  }
  const max = Math.max(...steps.map(([, v]) => v));

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold">Conversion funnel</h3>
      <div className="space-y-2.5">
        {steps.map(([key, value]) => {
          const pct = max > 0 ? (value / max) * 100 : 0;
          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{STEP_LABELS[key] ?? key}</span>
                <span className="font-medium">{formatNumber(value)}</span>
              </div>
              <div className="h-2 rounded-full bg-surface-muted">
                <div className="h-2 rounded-full bg-brand" style={{ width: `${Math.max(pct, 3)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Only events with recorded activity for this account and period are shown.
      </p>
    </Card>
  );
}
