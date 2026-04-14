'use client';
import { SDKProvider } from '../sdk-modules/src/react/SDKProvider.js';
import CastKitPlayground from '../sdk-modules/src/react/CastKitPlayground.jsx';

// Import our powerful plugins!
import { IdentityModule } from '../sdk-modules/src/modules/identity/IdentityModule.js';
import { StorageModule } from '../sdk-modules/src/modules/storage/StorageModule.js';
import { TipModule } from '../sdk-modules/src/modules/tip/TipModule.js';
import { WatchlistModule } from '../sdk-modules/src/modules/watchlist/WatchlistModule.js';
import { SocialModule } from '../sdk-modules/src/modules/social/SocialModule.js';
import { SubscriptionModule } from '../sdk-modules/src/modules/subscription/SubscriptionModule.js';

export default function Home() {
  const baseSepoliaRpcUrl =
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://base-sepolia-rpc.publicnode.com';
  const ethSepoliaRpcUrl =
    process.env.NEXT_PUBLIC_ETH_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
  
  // 1. Create instances of our plugins
  const plugins = [
    new IdentityModule({ neynarApiKey: process.env.NEXT_PUBLIC_NEYNAR_API_KEY }),
    new StorageModule(),
    new TipModule(),
    new WatchlistModule({ pollIntervalMs: 12000, maxBlocksPerTick: 20 }),
    new SocialModule({ endpoint: '/api/castkit/social/feed' }),
    new SubscriptionModule({
      chainId: 84532,
      statusEndpoint: '/api/castkit/subscription/status',
      collectEndpoint: '/api/castkit/subscription/collect'
    })
  ];

  // 2. Define our Multi-Chain Testnet paths
  // const config = {
  //   defaultChainId: 84532, 
  //   networks: {
  //     84532: "https://base-sepolia.g.alchemy.com/v2/demo", // Base
  //     11155111: "https://eth-sepolia.g.alchemy.com/v2/demo" // Ethereum
  //   }
  // };
  const config = {
    defaultChainId: 84532, 
    networks: {
      84532: { rpcUrl: baseSepoliaRpcUrl },
      11155111: { rpcUrl: ethSepoliaRpcUrl }
    }
  };



  return (
    // 3. Inject them into our Provider!
   <SDKProvider config={config} modules={plugins as never[]}>
       <CastKitPlayground />
    </SDKProvider>
  );
}
