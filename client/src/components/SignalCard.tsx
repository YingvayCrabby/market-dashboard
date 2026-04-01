import { CheckCircle2, XCircle } from "lucide-react";

interface SignalCardProps {
  title: string;
  met: boolean;
  children: React.ReactNode;
}

export function SignalCard({ title, met, children }: SignalCardProps) {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        met
          ? "bg-emerald-500/5 border-emerald-500/20 dark:bg-emerald-500/8 dark:border-emerald-500/15"
          : "bg-red-500/5 border-red-500/20 dark:bg-red-500/8 dark:border-red-500/15"
      }`}
    >
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="flex items-center gap-1.5">
          {met ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-emerald-500">YES</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-xs font-bold text-red-500">NO</span>
            </>
          )}
        </div>
      </div>
      <div className="text-xs text-muted-foreground space-y-1">{children}</div>
    </div>
  );
}
