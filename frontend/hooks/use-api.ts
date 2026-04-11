import { useSession } from "next-auth/react";

export function useBackendToken(): string | null {
  const { data: session } = useSession();
  return session?.backendAccessToken ?? null;
}
