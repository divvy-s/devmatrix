'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSDK, useIdentity, useStorage, useTip, useWatchlist, useSocial, useSubscription } from './index.js';
import { 
  CheckCircle2, 
  CircleDashed, 
  XCircle, 
  Terminal, 
  UserSearch, 
  Globe2,
  UploadCloud, 
  Send,
  Trash2,
  Database,
  AlertTriangle,
  BellRing,
  Wallet,
  RefreshCcw,
  Lock,
  Unlock
} from 'lucide-react';

function SourcePill({ label, sourceData, isLoading }) {
  const isFound = sourceData && (sourceData.name || sourceData.username || sourceData.handle);
  const color = isLoading ? 'bg-zinc-700 text-zinc-400' : isFound ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400';
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase border border-current/20 ${color}`}>
      {isLoading ? <CircleDashed className="w-3 h-3 animate-spin"/> : isFound ? <CheckCircle2 className="w-3 h-3"/> : <XCircle className="w-3 h-3"/>}
      {label}
    </div>
  );
}

function TipStep({ name, expectedStatus, tipStatus }) {
  const activeMapping = {
    'resolving': 1, 'sending': 2, 'notifying': 3, 'recording': 4, 'confirmed': 5
  };
  const currentWeight = activeMapping[tipStatus] || 0;
  const targetWeight = activeMapping[expectedStatus];

  let state = 'pending';
  if (currentWeight === targetWeight) state = 'active';
  else if (currentWeight > targetWeight) state = 'done';
  if (tipStatus === 'failed') state = 'error';

  return (
    <div className={`flex items-center gap-3 p-3 rounded border ${state === 'active' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : state === 'done' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-transparent border-zinc-800 text-zinc-600'}`}>
      {state === 'done' ? <CheckCircle2 className="w-4 h-4"/> : state === 'active' ? <CircleDashed className="w-4 h-4 animate-spin"/> : <CircleDashed className="w-4 h-4"/>}
      <span className="font-medium text-sm">{name}</span>
    </div>
  );
}

export default function CastKitPlayground() {

  const { core, isReady, sdkError } = useSDK();
  
  // ==========================================
  // TELEMETRY LOGGER INTERCEPTOR
  // ==========================================
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const originalInfo = console.info;
    const originalDebug = console.debug;
    const originalError = console.error;
    const originalWarn = console.warn;

    const intercept = (level, args) => {
      // Map arguments to readable strings
      const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      if (msg.includes('[SDK]')) {
         setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), level, msg }]);
      }
    };

    console.info = (...args) => { intercept('info', args); originalInfo(...args); };
    console.debug = (...args) => { intercept('debug', args); originalDebug(...args); };
    console.error = (...args) => { intercept('error', args); originalError(...args); };
    console.warn = (...args) => { intercept('warn', args); originalWarn(...args); };

    return () => {
      console.info = originalInfo;
      console.debug = originalDebug;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  // ==========================================
  // IDENTITY SANDBOX
  // ==========================================
  const [idTarget, setIdTarget] = useState('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
  const [activeAddress, setActiveAddress] = useState(null);
  const { identity, status: idStatus } = useIdentity(activeAddress);

  const handleResolve = () => setActiveAddress(idTarget);

  // ==========================================
  // SOCIAL FEED SANDBOX
  // ==========================================
  const {
    feed: socialFeed,
    posts: socialPosts,
    status: socialStatus,
    error: socialError,
    refresh: refreshSocial
  } = useSocial({ autoLoad: false, initialLimit: 8, enrichWithIdentity: true });
  const [socialLimit, setSocialLimit] = useState('8');

  const handleLoadSocial = async () => {
    try {
      await refreshSocial({
        limit: Number(socialLimit) || 8,
        enrichWithIdentity: true
      });
    } catch {
      // Error is surfaced by hook state and telemetry logs.
    }
  };

  // ==========================================
  // SUBSCRIPTION SANDBOX
  // ==========================================
  const {
    status: subscriptionStatus,
    subscription,
    collectReceipt,
    error: subscriptionError,
    checkStatus: checkSubscriptionStatus,
    collectDue: collectSubscriptionDue,
    buildSubscribeTx,
    buildCancelTx,
    buildApproveTx
  } = useSubscription({ planId: 'castkit-demo-monthly' });
  const [subscriptionWallet, setSubscriptionWallet] = useState('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
  const [subscriptionPlanId, setSubscriptionPlanId] = useState('castkit-demo-monthly');
  const [subscriptionAmountUsdc, setSubscriptionAmountUsdc] = useState('5');
  const [subscriptionKeeperSecret, setSubscriptionKeeperSecret] = useState('');
  const [subscriptionTxPreview, setSubscriptionTxPreview] = useState(null);

  const handleCheckSubscription = async () => {
    try {
      await checkSubscriptionStatus({
        subscriber: subscriptionWallet,
        planId: subscriptionPlanId
      });
    } catch {
      // Error state is surfaced by hook state and telemetry logs.
    }
  };

  const handleCollectSubscription = async () => {
    try {
      await collectSubscriptionDue({
        subscriber: subscriptionWallet,
        planId: subscriptionPlanId,
        keeperSecret: subscriptionKeeperSecret || undefined
      });
    } catch {
      // Error state is surfaced by hook state and telemetry logs.
    }
  };

  const handlePreviewSubscriptionTx = () => {
    try {
      const approve = buildApproveTx({ amount: subscriptionAmountUsdc, decimals: 6 });
      const subscribe = buildSubscribeTx({ planId: subscriptionPlanId });
      const cancel = buildCancelTx({ planId: subscriptionPlanId });

      setSubscriptionTxPreview({ approve, subscribe, cancel });
    } catch (error) {
      console.error('Subscription tx preview failed', error);
    }
  };

  // ==========================================
  // STORAGE SANDBOX
  // ==========================================
  const { upload, status: storageStatus, result: storageReceipt } = useStorage();
  const [storageInput, setStorageInput] = useState('{\n  "name": "My NFT Test",\n  "image": "ipfs://QmTz..."\n}');
  
  const handleUpload = async () => {
    try {
      const parsed = JSON.parse(storageInput);
      await upload(parsed);
    } catch(e) {
      console.error('Invalid JSON Sandbox Input', e);
    }
  };

  // ==========================================
  // TIP ORCHESTRATOR SANDBOX
  // ==========================================
  const { tip, status: tipStatus, receipt: tipReceipt } = useTip('0xSenderWallet123');
  const [tipTo, setTipTo] = useState('vitalik.eth');
  const [tipAmount, setTipAmount] = useState('50');
  const [tipMsg, setTipMsg] = useState('Keep building amazing tech! 🚀');

  const handleTip = async () => {
    try {
      await tip({ to: tipTo, amount: Number(tipAmount), token: 'USDC', message: tipMsg });
    } catch { /* Caught natively in hook */ }
  };

  // ==========================================
  // WATCHLIST SANDBOX
  // ==========================================
  const {
    status: watchStatus,
    watches,
    alerts,
    addWatch,
    removeWatch,
    simulateAlert,
    error: watchError
  } = useWatchlist();
  const [watchAddress, setWatchAddress] = useState('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
  const [notifyTo, setNotifyTo] = useState('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');

  const handleAddWatch = async () => {
    try {
      await addWatch(watchAddress, { notifyTo });
    } catch {
      // Error is surfaced by hook state and telemetry logs.
    }
  };

  const handleRemoveWatch = async () => {
    try {
      await removeWatch(watchAddress);
    } catch {
      // Error is surfaced by hook state and telemetry logs.
    }
  };

  const handleSimulateWatchAlert = async () => {
    try {
      const randomDirection = Math.random() > 0.5 ? 'incoming' : 'outgoing';
      const randomAmountEth = (Math.random() * 0.09 + 0.001).toFixed(4);
      await simulateAlert(watchAddress, {
        notifyTo,
        amountEth: randomAmountEth,
        direction: randomDirection
      });
    } catch {
      // Error is surfaced by hook state and telemetry logs.
    }
  };

  // ==========================================
  // RENDER UI OVERLAY
  // ==========================================
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-300 font-mono p-4 lg:p-8 space-y-8 selection:bg-blue-500/30">
      
      {/* GLOBAL SYSTEM BAR */}
      <header className="flex flex-wrap items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur">
        <div className="flex items-center gap-4">
          <Database className="w-6 h-6 text-zinc-100" />
          <h1 className="text-xl font-bold text-white tracking-tight">CastKit Engine Debugger</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${isReady ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-500'}`}>
            <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
            {isReady ? 'SDK READY' : 'INITIALIZING...'}
          </div>
          <button 
            onClick={() => core?.destroy()}
            className="flex items-center gap-2 px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-md transition-colors text-xs font-bold"
          >
            <Trash2 className="w-3 h-3" />
            SIMULATE UNMOUNT
          </button>
        </div>
      </header>

      {sdkError && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5"/>
          <div>
             <strong>Global Error in [{sdkError.module}]:</strong> {sdkError.message}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFTSIDE COLUMN */}
        <div className="space-y-8">
          
          {/* MODULE: IDENTITY */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden relative">
            <div className="bg-zinc-900/80 p-4 border-b border-zinc-800 flex items-center gap-3">
              <UserSearch className="w-5 h-5 text-blue-400" />
              <h2 className="text-sm font-semibold text-white">Universal Identity Engine</h2>
            </div>
            <div className="p-5 space-y-5">
              <div className="flex gap-3">
                <input 
                  value={idTarget}
                  onChange={(e) => setIdTarget(e.target.value)}
                  className="flex-1 bg-black border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="0x... or .eth or @handle"
                />
                <button 
                  onClick={handleResolve}
                  disabled={idStatus === 'loading'}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Resolve
                </button>
              </div>

              {/* Resolution Trackers */}
              <div className="flex flex-wrap gap-3 py-2">
                <SourcePill label="ENS" sourceData={identity?.sources?.ens} isLoading={idStatus === 'loading'} />
                <SourcePill label="Farcaster" sourceData={identity?.sources?.farcaster} isLoading={idStatus === 'loading'} />
                <SourcePill label="Lens" sourceData={identity?.sources?.lens} isLoading={idStatus === 'loading'} />
              </div>

              {/* Visual Card Result */}
              {identity && (
                 <div className="p-4 bg-black rounded-lg border border-zinc-800 flex items-center gap-4">
                   <img 
                     src={identity.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${identity.address}`}  
                     alt="Avatar" 
                     className="w-12 h-12 rounded-full border border-zinc-700 object-cover" 
                   />
                   <div>
                     <p className="font-bold text-white text-lg">{identity.name}</p>
                     <p className="text-xs text-zinc-500 font-mono tracking-widest">{identity.address}</p>
                   </div>
                 </div>
              )}
            </div>
          </section>

          {/* MODULE: SOCIAL */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden relative">
            <div className="bg-zinc-900/80 p-4 border-b border-zinc-800 flex items-center gap-3">
              <Globe2 className="w-5 h-5 text-sky-400" />
              <h2 className="text-sm font-semibold text-white">Universal Social Feed</h2>
              <span className="ml-auto text-[11px] px-2 py-1 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20 uppercase tracking-wide">
                {socialStatus}
              </span>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-3">
                <input
                  value={socialLimit}
                  onChange={(e) => setSocialLimit(e.target.value)}
                  type="number"
                  min={1}
                  max={20}
                  className="w-28 bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                />
                <button
                  onClick={handleLoadSocial}
                  disabled={socialStatus === 'loading'}
                  className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  {socialStatus === 'loading' ? <CircleDashed className="w-4 h-4 animate-spin" /> : <Globe2 className="w-4 h-4" />}
                  {socialStatus === 'loading' ? 'Aggregating...' : 'Load Unified Feed'}
                </button>
              </div>

              {socialError && (
                <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-xs">
                  {socialError.message}
                </div>
              )}

              {socialFeed && (
                <div className="bg-black border border-zinc-800 rounded-lg p-3 space-y-2">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                    Last Fetch: {new Date(socialFeed.fetchedAt).toLocaleString()}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="border border-zinc-800 rounded p-2">
                      <p className="text-zinc-300 font-semibold">Farcaster</p>
                      <p className="text-zinc-500">Status: {socialFeed.sources?.farcaster?.status || 'unknown'}</p>
                      <p className="text-zinc-500">Count: {socialFeed.sources?.farcaster?.count ?? 0}</p>
                      {socialFeed.sources?.farcaster?.error && (
                        <p className="text-amber-400 break-words mt-1">{socialFeed.sources.farcaster.error}</p>
                      )}
                    </div>
                    <div className="border border-zinc-800 rounded p-2">
                      <p className="text-zinc-300 font-semibold">Lens</p>
                      <p className="text-zinc-500">Status: {socialFeed.sources?.lens?.status || 'unknown'}</p>
                      <p className="text-zinc-500">Count: {socialFeed.sources?.lens?.count ?? 0}</p>
                      {socialFeed.sources?.lens?.error && (
                        <p className="text-amber-400 break-words mt-1">{socialFeed.sources.lens.error}</p>
                      )}
                    </div>
                  </div>
                  {socialFeed.partialFailure && (
                    <p className="text-xs text-amber-400">
                      Partial provider failure detected. This request still executed correctly.
                    </p>
                  )}
                </div>
              )}

              <div className="bg-black border border-zinc-800 rounded-lg p-3 space-y-2 max-h-72 overflow-y-auto">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Unified Feed ({socialPosts.length})</p>
                {socialPosts.length === 0 ? (
                  <p className="text-xs text-zinc-600">
                    {socialFeed
                      ? 'Request completed. No posts returned by active providers for this query.'
                      : 'No posts loaded yet. Click Load Unified Feed.'}
                  </p>
                ) : (
                  socialPosts.slice(0, 6).map((post) => (
                    <div key={post.id} className="border border-zinc-800 rounded p-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-zinc-200 font-semibold truncate">{post.author?.name || 'Unknown Author'}</p>
                        <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{post.source}</span>
                      </div>
                      <p className="text-xs text-zinc-400">{post.text || '(No text content)'}</p>
                      <div className="flex justify-between text-[10px] text-zinc-500">
                        <span>{post.author?.username || post.author?.address || 'n/a'}</span>
                        <span>{new Date((post.createdAtUnix || 0) * 1000).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* MODULE: STORAGE */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden relative">
            <div className="bg-zinc-900/80 p-4 border-b border-zinc-800 flex items-center gap-3">
              <UploadCloud className="w-5 h-5 text-purple-400" />
              <h2 className="text-sm font-semibold text-white">Smart Storage Lab</h2>
            </div>
            <div className="p-5 space-y-5">
               <textarea 
                  rows={4}
                  value={storageInput}
                  onChange={(e) => setStorageInput(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-xs text-green-400 font-mono focus:outline-none focus:border-purple-500 transition-colors"
               />
               <button 
                  onClick={handleUpload}
                  disabled={storageStatus === 'uploading'}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex justify-center items-center gap-2"
                >
                  {storageStatus === 'uploading' ? <CircleDashed className="animate-spin w-4 h-4" /> : <UploadCloud className="w-4 h-4"/>}
                  {storageStatus === 'uploading' ? 'Routing to Network...' : 'Commit Upload Payload'}
                </button>

                {storageReceipt && (
                  <div className="bg-black border border-purple-500/20 p-4 rounded-lg overflow-x-auto">
                    <p className="text-xs text-purple-400 mb-2 font-bold">— Routing Selected: {storageReceipt.network?.toUpperCase()}</p>
                    <pre className="text-xs text-zinc-400">{JSON.stringify(storageReceipt, null, 2)}</pre>
                  </div>
                )}
            </div>
          </section>

        </div>

        {/* RIGHTSIDE COLUMN */}
        <div className="space-y-8 flex flex-col h-full">
           
           {/* MODULE: TIP */}
           <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden relative">
            <div className="bg-zinc-900/80 p-4 border-b border-zinc-800 flex items-center gap-3">
              <Send className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">One-Tap Orchestrator</h2>
            </div>
            
            <div className="p-5 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Recipient Handle/Address</label>
                  <input value={tipTo} onChange={(e)=>setTipTo(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Amount (USDC)</label>
                  <input value={tipAmount} onChange={(e)=>setTipAmount(e.target.value)} type="number" className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Message</label>
                  <input value={tipMsg} onChange={(e)=>setTipMsg(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                </div>
              </div>

              <button 
                  onClick={handleTip}
                  disabled={tipStatus !== 'idle'}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-3 rounded-lg text-sm font-bold flex justify-center items-center gap-2"
                >
                  EXECUTE TIP PIPELINE
              </button>

              {/* Status Machine Tracker */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                  <TipStep name="Resolving ENS/Handle" expectedStatus="resolving" tipStatus={tipStatus} />
                  <TipStep name="Sending Gasless USDC" expectedStatus="sending" tipStatus={tipStatus} />
                  <TipStep name="Notifying Receiver (XMTP)" expectedStatus="notifying" tipStatus={tipStatus} />
                  <TipStep name="Recording to Leaderboard" expectedStatus="recording" tipStatus={tipStatus} />
              </div>

              {tipReceipt && tipStatus === 'confirmed' && (
                 <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-emerald-400 font-bold text-sm">Tip Orchestrated Successfully!</p>
                    <a className="text-xs text-zinc-500 underline mt-1" href="#">View Transaction Hash</a>
                 </div>
              )}
            </div>
          </section>

          {/* MODULE: WATCHLIST */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden relative">
            <div className="bg-zinc-900/80 p-4 border-b border-zinc-800 flex items-center gap-3">
              <BellRing className="w-5 h-5 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">Wallet Watchlist Alerts</h2>
              <span className="ml-auto text-[11px] px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 uppercase tracking-wide">
                {watchStatus}
              </span>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Wallet Address</label>
                <input
                  value={watchAddress}
                  onChange={(e) => setWatchAddress(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-cyan-500"
                  placeholder="0x..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Notify Wallet (XMTP destination)</label>
                <input
                  value={notifyTo}
                  onChange={(e) => setNotifyTo(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-cyan-500"
                  placeholder="0x..."
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleAddWatch}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg py-2 text-xs font-bold"
                >
                  ADD WATCH
                </button>
                <button
                  onClick={handleRemoveWatch}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-2 text-xs font-bold"
                >
                  REMOVE
                </button>
                <button
                  onClick={handleSimulateWatchAlert}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2 text-xs font-bold"
                >
                  TEST ALERT
                </button>
              </div>

              {watchError && (
                <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-xs">
                  {watchError.message}
                </div>
              )}

              <div className="bg-black border border-zinc-800 rounded-lg p-3 space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Active Watches ({watches.length})</p>
                {watches.length === 0 ? (
                  <p className="text-xs text-zinc-600">No watched wallets yet.</p>
                ) : (
                  watches.map((watch) => (
                    <div key={watch.key} className="text-xs text-zinc-300 flex justify-between gap-3 border border-zinc-800 rounded p-2">
                      <span className="truncate">{watch.address}</span>
                      <span className="text-zinc-500">chain {watch.chainId}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-black border border-zinc-800 rounded-lg p-3 space-y-2 max-h-44 overflow-y-auto">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Latest Alerts</p>
                {alerts.length === 0 ? (
                  <p className="text-xs text-zinc-600">No alerts yet. Add a watch or use TEST ALERT.</p>
                ) : (
                  alerts.slice(0, 5).map((alert, idx) => (
                    <div key={`${alert.txHash}-${idx}`} className="text-xs text-zinc-300 border border-zinc-800 rounded p-2 space-y-1">
                      {alert.isSimulated && (
                        <p className="text-[10px] text-amber-400 uppercase tracking-wide font-bold">Simulated test alert</p>
                      )}
                      <p className="text-cyan-300 font-semibold uppercase tracking-wide">{alert.direction} {alert.amountEth} ETH</p>
                      <p className="text-zinc-500 break-all">Tx: {alert.txHash}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* MODULE: SUBSCRIPTION */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden relative">
            <div className="bg-zinc-900/80 p-4 border-b border-zinc-800 flex items-center gap-3">
              <RefreshCcw className="w-5 h-5 text-fuchsia-400" />
              <h2 className="text-sm font-semibold text-white">Recurring Subscription Guard</h2>
              <span className="ml-auto text-[11px] px-2 py-1 rounded-full bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20 uppercase tracking-wide">
                {subscriptionStatus}
              </span>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Subscriber Wallet</label>
                <input
                  value={subscriptionWallet}
                  onChange={(e) => setSubscriptionWallet(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-fuchsia-500"
                  placeholder="0x..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Plan ID</label>
                  <input
                    value={subscriptionPlanId}
                    onChange={(e) => setSubscriptionPlanId(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-fuchsia-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Amount (USDC)</label>
                  <input
                    value={subscriptionAmountUsdc}
                    onChange={(e) => setSubscriptionAmountUsdc(e.target.value)}
                    type="number"
                    className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-fuchsia-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-zinc-500 uppercase tracking-wider font-bold">
                  Keeper Secret (optional, only if server requires)
                </label>
                <input
                  value={subscriptionKeeperSecret}
                  onChange={(e) => setSubscriptionKeeperSecret(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-fuchsia-500"
                  placeholder="x-castkit-keeper-secret"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={handleCheckSubscription}
                  className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg py-2 text-xs font-bold"
                >
                  CHECK ACCESS
                </button>
                <button
                  onClick={handleCollectSubscription}
                  className="bg-violet-600 hover:bg-violet-500 text-white rounded-lg py-2 text-xs font-bold"
                >
                  RUN KEEPER COLLECT
                </button>
                <button
                  onClick={handlePreviewSubscriptionTx}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-2 text-xs font-bold"
                >
                  PREVIEW TX DATA
                </button>
              </div>

              {subscriptionError && (
                <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-xs break-words">
                  {subscriptionError.message}
                </div>
              )}

              {subscription && (
                <div className="bg-black border border-zinc-800 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Current Access State</p>
                    <span className={`text-xs font-semibold flex items-center gap-1 ${subscription.active ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {subscription.active ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {subscription.active ? 'ACTIVE' : 'LOCKED'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 flex items-center gap-2 break-all">
                    <Wallet className="w-3 h-3" />
                    {subscription.subscriber}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="border border-zinc-800 rounded p-2">
                      <p className="text-zinc-500">Last paid</p>
                      <p className="text-zinc-300">{subscription.timestamps?.lastPaidAtIso || 'n/a'}</p>
                    </div>
                    <div className="border border-zinc-800 rounded p-2">
                      <p className="text-zinc-500">Next charge</p>
                      <p className="text-zinc-300">{subscription.timestamps?.nextChargeAtIso || 'n/a'}</p>
                    </div>
                  </div>
                </div>
              )}

              {collectReceipt && (
                <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs break-all">
                  Keeper collect tx: {collectReceipt.txHash}
                </div>
              )}

              {subscriptionTxPreview && (
                <div className="bg-black border border-zinc-800 rounded-lg p-3 overflow-x-auto">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-2">Transaction Preview (Base Sepolia)</p>
                  <pre className="text-[11px] text-zinc-400">{JSON.stringify(subscriptionTxPreview, null, 2)}</pre>
                </div>
              )}
            </div>
          </section>

          {/* TELEMETRY TERMINAL */}
          <section className="bg-black border border-zinc-800 rounded-2xl overflow-hidden relative flex-1 flex flex-col min-h-[300px]">
            <div className="bg-zinc-900 p-3 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <Terminal className="w-4 h-4 text-zinc-400" />
                 <span className="text-xs font-bold text-zinc-500">ENGINE TELEMETRY LOGS</span>
              </div>
              <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto font-mono text-xs flex-1 space-y-1">
               {logs.length === 0 && <span className="text-zinc-600 italic">Waiting for SDK Engine executions...</span>}
               {logs.map((log, i) => {
                  let color = 'text-zinc-400';
                  if (log.level === 'warn') color = 'text-amber-400';
                  if (log.level === 'error') color = 'text-red-400';
                  if (log.level === 'info') color = 'text-blue-400';
                  
                  return (
                    <div key={i} className={`flex gap-3 px-1 hover:bg-white/5 py-0.5 rounded ${color}`}>
                      <span className="text-zinc-600 flex-shrink-0">[{log.time}]</span>
                      <span className="break-all">{log.msg}</span>
                    </div>
                  );
               })}
               <div ref={logsEndRef} />
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
