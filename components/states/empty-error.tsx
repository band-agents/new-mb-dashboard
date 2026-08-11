import { AlertTriangle, Inbox, Lock, PlugZap, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function StateShell({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center",
        className
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
        {icon}
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="max-w-sm text-xs text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export function EmptyState({
  title = "No data yet",
  description = "There's nothing to show for the selected filters.",
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return <StateShell icon={<Inbox className="h-5 w-5" />} title={title} description={description} action={action} />;
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this data. Please try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <StateShell
      icon={<AlertTriangle className="h-5 w-5 text-warning" />}
      title={title}
      description={description}
      action={
        onRetry && (
          <Button size="sm" variant="secondary" onClick={onRetry} className="mt-1">
            Retry
          </Button>
        )
      }
    />
  );
}

export function NoConnectionState({ description }: { description?: string }) {
  return (
    <StateShell
      icon={<PlugZap className="h-5 w-5" />}
      title="No Meta account connected"
      description={description ?? "Connect a Meta ad account to see live data, or continue exploring in Demo Mode."}
    />
  );
}

export function NoPermissionState() {
  return (
    <StateShell
      icon={<Lock className="h-5 w-5" />}
      title="Missing permissions"
      description="This Meta connection doesn't have the permissions required to read this data. Reconnect the account with the needed scopes."
    />
  );
}

export function ApiUnavailableState() {
  return (
    <StateShell
      icon={<WifiOff className="h-5 w-5" />}
      title="Meta API unavailable"
      description="We couldn't reach the Meta Graph API right now. This may be a temporary rate limit or outage — showing the last cached data where available."
    />
  );
}
