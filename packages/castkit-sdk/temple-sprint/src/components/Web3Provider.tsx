"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { injected, metaMask } from "wagmi/connectors";
import { PrivyProvider } from "@privy-io/react-auth";
import { ReactNode, useState } from "react";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [injected(), metaMask()],
  transports: {
    [sepolia.id]: http(),
  },
});

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  const content = (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );

  if (!PRIVY_APP_ID) {
    return content;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "light",
          accentColor: "#d97706",
          logo: "/og.png",
        },
        loginMethods: ["email", "wallet"],
        defaultChain: sepolia,
        embeddedWallets: {
          createOnLogin: "off",
        },
      }}
    >
      {content}
    </PrivyProvider>
  );
}
