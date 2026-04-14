"use client";

import { useState, useEffect, useCallback } from "react";
import sdk from "@farcaster/miniapp-sdk";
import { FarcasterContext } from "@/types/game";

const GUEST_CONTEXT: FarcasterContext = { fid: 0, username: "Guest" };
const LOCAL_TEST_ENABLED = process.env.NEXT_PUBLIC_FARCASTER_LOCAL_TEST === "true";

function getLocalMockContext(): FarcasterContext {
  const fallbackFid = 123456;
  const configuredFid = Number(process.env.NEXT_PUBLIC_FARCASTER_MOCK_FID);
  const fid = Number.isInteger(configuredFid) && configuredFid > 0 ? configuredFid : fallbackFid;

  const configuredUsername = process.env.NEXT_PUBLIC_FARCASTER_MOCK_USERNAME?.trim();
  const username = configuredUsername && configuredUsername.length > 0 ? configuredUsername : `fid:${fid}`;

  return { fid, username };
}

function getGuestContext(): FarcasterContext {
  if (typeof window === "undefined") return GUEST_CONTEXT;

  try {
    const fidKey = "templeSprintGuestFid";
    const nameKey = "templeSprintGuestName";

    const existingFid = Number(window.localStorage.getItem(fidKey));
    const fid =
      Number.isInteger(existingFid) && existingFid > 0
        ? existingFid
        : Math.floor(900000000 + Math.random() * 99999999);

    const existingName = window.localStorage.getItem(nameKey)?.trim();
    const username = existingName && existingName.length > 0 ? existingName : `guest_${String(fid).slice(-5)}`;

    window.localStorage.setItem(fidKey, String(fid));
    window.localStorage.setItem(nameKey, username);

    return { fid, username };
  } catch {
    return GUEST_CONTEXT;
  }
}

export function useFarcaster() {
  const [context, setContext] = useState<FarcasterContext>(GUEST_CONTEXT);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFarcaster, setIsFarcaster] = useState(false);

  useEffect(() => {
    let mounted = true;
    const queryParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const queryMockEnabled = queryParams?.get("fc_mock") === "1";
    const shouldUseLocalMock = LOCAL_TEST_ENABLED || queryMockEnabled;

    const load = async () => {
      if (shouldUseLocalMock) {
        if (mounted) {
          setContext(getLocalMockContext());
          setIsFarcaster(true);
          setIsLoaded(true);
        }
        return;
      }

      try {
        const inMiniApp = await sdk.isInMiniApp();

        if (!mounted) return;

        if (inMiniApp) {
          const ctx = await sdk.context;

          if (ctx?.user) {
            setContext({
              fid: ctx.user.fid,
              username: ctx.user.username ?? `fid:${ctx.user.fid}`,
              displayName: ctx.user.displayName ?? undefined,
              pfpUrl: ctx.user.pfpUrl ?? undefined,
            });
          } else {
            setContext(getGuestContext());
          }

          setIsFarcaster(true);
          await sdk.actions.ready();
        } else {
          setContext(getGuestContext());
        }
      } catch {
        // Running outside Farcaster (browser dev) — use stable guest identity
        if (mounted) setContext(getGuestContext());
      } finally {
        if (mounted) setIsLoaded(true);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const shareScore = useCallback(
    async (score: number, appUrl: string) => {
      const text = `🏃 I just scored ${score} in Temple Sprint! Can you beat me? Play now 👇`;
      const castUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(appUrl)}`;
      try {
        if (isFarcaster) {
          await sdk.actions.openUrl(castUrl);
        } else {
          window.open(castUrl, "_blank");
        }
      } catch {
        window.open(castUrl, "_blank");
      }
    },
    [isFarcaster]
  );

  return { context, isLoaded, isFarcaster, shareScore };
}
