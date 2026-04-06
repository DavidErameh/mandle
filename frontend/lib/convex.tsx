import { ConvexProvider as ConvexProviderBase } from "convex/react";
import { ConvexReactClient } from "convex/react";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "";

const convexClient = CONVEX_URL ? new ConvexReactClient(CONVEX_URL) : null;

export function ConvexProvider({ children }: { children: React.ReactNode }) {
  if (!convexClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F] text-[#8B98A5]">
        <div className="text-center">
          <p className="text-lg mb-2">Convex not configured</p>
          <p className="text-sm">Set NEXT_PUBLIC_CONVEX_URL in .env.local</p>
        </div>
      </div>
    );
  }
  return (
    <ConvexProviderBase client={convexClient}>
      {children}
    </ConvexProviderBase>
  );
}

export { convexClient };
export const convexUrl = CONVEX_URL;
export const isConfigured = Boolean(CONVEX_URL);
