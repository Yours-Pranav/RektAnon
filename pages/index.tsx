import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useContractWrite, useContractRead, useWaitForTransaction, useNetwork } from 'wagmi';
import { Skull, Send, Trophy, Eye, ExternalLink, AlertCircle } from 'lucide-react';

// Contract addresses - UPDATE THESE AFTER DEPLOYMENT
const CONTRACTS = {
  REKT_NFT: "0x1234567890123456789012345678901234567890", // Replace with deployed address
  REKT_TOKEN: "0x0987654321098765432109876543210987654321", // Replace with deployed address
};

// Contract ABIs
const REKT_NFT_ABI = [
  {
    "inputs": [{"name": "to", "type": "address"}, {"name": "confession", "type": "string"}, {"name": "tokenURI", "type": "string"}],
    "name": "mint",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "tokenId", "type": "uint256"}],
    "name": "getConfession",
    "outputs": [{"type": "tuple", "components": [
      {"name": "text", "type": "string"},
      {"name": "confessee", "type": "address"},
      {"name": "timestamp", "type": "uint256"},
      {"name": "votes", "type": "uint256"}
    ]}],
    "stateMutability": "view",
    "type": "function"
  }
];

const REKT_TOKEN_ABI = [
  {
    "inputs": [{"name": "to", "type": "address"}, {"name": "amount", "type": "uint256"}],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export default function RektConfessionBooth() {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const [confession, setConfession] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [mintedTokenId, setMintedTokenId] = useState(null);
  const [confessions, setConfessions] = useState([]);
  const [activeTab, setActiveTab] = useState('confess');
  const [error, setError] = useState('');
  const [isContractsDeployed, setIsContractsDeployed] = useState(false);

  const isRightNetwork = chain?.id === 42161 || chain?.id === 421613;

  // Contract interactions
  const { data: totalSupply } = useContractRead({
    address: CONTRACTS.REKT_NFT,
    abi: REKT_NFT_ABI,
    functionName: 'getTotalSupply',
    enabled: isConnected && isRightNetwork,
    onError: () => setIsContractsDeployed(false),
    onSuccess: () => setIsContractsDeployed(true),
  });

  const { write: mintNFT, data: mintData, error: mintError } = useContractWrite({
    address: CONTRACTS.REKT_NFT,
    abi: REKT_NFT_ABI,
    functionName: 'mint',
  });

  const { write: mintToken } = useContractWrite({
    address: CONTRACTS.REKT_TOKEN,
    abi: REKT_TOKEN_ABI,
    functionName: 'mint',
  });

  const { isLoading: isMinting, isSuccess: mintSuccess, error: txError } = useWaitForTransaction({
    hash: mintData?.hash,
  });

  useEffect(() => {
    if (mintSuccess && mintData) {
      const tokenId = totalSupply ? Number(totalSupply) : 0;
      setMintedTokenId(tokenId);
      setStep(3);
      
      // Mint reward tokens
      const baseReward = BigInt(10 * 10**18);
      const lengthBonus = BigInt(Math.floor(confession.length / 10) * 10**18);
      const totalReward = baseReward + lengthBonus;
      
      try {
        mintToken({ args: [address, totalReward] });
      } catch (err) {
        console.log('Token reward failed:', err);
      }
    }
  }, [mintSuccess, mintData, totalSupply, confession.length, address, mintToken]);

  useEffect(() => {
    if (mintError || txError) {
      setError(mintError?.message || txError?.message || 'Transaction failed');
      setIsLoading(false);
    }
  }, [mintError, txError]);

  const createMetadata = (confession, tokenId) => {
    return {
      name: `REKT Confession #${tokenId}`,
      description: confession,
      image: `data:image/svg+xml;base64,${btoa(`
        <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="400" fill="#000"/>
          <text x="200" y="180" text-anchor="middle" fill="#dc2626" font-size="32" font-family="Arial" font-weight="bold">REKT</text>
          <text x="200" y="220" text-anchor="middle" fill="#dc2626" font-size="48">💀</text>
          <text x="200" y="280" text-anchor="middle" fill="#fff" font-size="16" font-family="Arial">Confession #${tokenId}</text>
          <text x="200" y="320" text-anchor="middle" fill="#6b7280" font-size="12" font-family="Arial">${confession.substring(0, 30)}${confession.length > 30 ? '...' : ''}</text>
        </svg>
      `)}`,
      attributes: [
        { trait_type: "Confession Length", value: confession.length },
        { trait_type: "Timestamp", value: Date.now() },
        { trait_type: "Rekt Level", value: calculateRektLevel(confession) }
      ]
    };
  };

  const calculateRektLevel = (confession) => {
    const keywords = ['rekt', 'rug', 'loss', 'broke', 'loan', 'mortgage', 'life savings', 'lost', 'scam'];
    const matches = keywords.filter(keyword => confession.toLowerCase().includes(keyword)).length;
    
    if (matches >= 3) return 'Absolutely Rekt';
    if (matches >= 2) return 'Pretty Rekt'; 
    if (matches >= 1) return 'Mildly Rekt';
    return 'Barely Rekt';
  };

  const handleMint = async () => {
    if (!confession.trim() || !isConnected || !isRightNetwork) {
      setError('Please connect wallet to Arbitrum and write a confession');
      return;
    }

    if (!isContractsDeployed) {
      setError('Contracts not deployed yet. Please deploy contracts first.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const nextTokenId = totalSupply ? Number(totalSupply) : 0;
      const metadata = createMetadata(confession, nextTokenId);
      const tokenURI = `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;
      
      mintNFT({ args: [address, confession, tokenURI] });
      setStep(2);
    } catch (error) {
      console.error('Minting failed:', error);
      setError('Minting failed: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const shareToFarcaster = () => {
    const frameUrl = `${window.location.origin}/api/frame/${mintedTokenId}`;
    const castText = `Just confessed my REKT story and minted NFT #${mintedTokenId} 💀\n\nAnonymous crypto confessions on @arbitrum\nEarn $REKT tokens for sharing your pain!\n\nWanna see?`;
    const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent(frameUrl)}`;
    window.open(farcasterUrl, '_blank');
  };

  const loadConfessions = () => {
    const mockConfessions = [
      { id: 1, text: "Bought Luna at $80, watched it go to $0.0001. Used my student loan. Parents still don't know.", votes: 42, timestamp: Date.now() - 86400000, rektLevel: "Absolutely Rekt" },
      { id: 2, text: "Sold my car for Terra Luna. Now I walk to work and eat ramen daily. Down 99.8%.", votes: 28, timestamp: Date.now() - 172800000, rektLevel: "Pretty Rekt" },
      { id: 3, text: "Mortgaged my house for FTX tokens. Sam Bankman-Fraud took everything. Homeless now.", votes: 156, timestamp: Date.now() - 259200000, rektLevel: "Absolutely Rekt" },
      { id: 4, text: "Bought Squid Game token thinking it was official. Rug pulled in 5 minutes. Lost $10k.", votes: 33, timestamp: Date.now() - 345600000, rektLevel: "Pretty Rekt" }
    ];
    setConfessions(mockConfessions);
  };

  useEffect(() => { loadConfessions(); }, []);

  const calculateReward = (length) => Math.floor(10 + length / 10);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-red-900 p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Skull className="w-8 h-8 text-red-500" />
            <h1 className="text-2xl font-bold text-red-500">REKT Confession Booth</h1>
          </div>
          <div className="flex items-center space-x-4">
            {!isRightNetwork && isConnected && (
              <div className="text-yellow-400 text-sm flex items-center space-x-1">
                <AlertCircle className="w-4 h-4" />
                <span>Switch to Arbitrum</span>
              </div>
            )}
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div className="max-w-4xl mx-auto p-4">
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-200">{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-300">×</button>
          </div>
        </div>
      )}

      {/* Contract Status */}
      {isConnected && (
        <div className="max-w-4xl mx-auto p-4">
          <div className="text-center text-sm">
            <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full ${
              isContractsDeployed ? 'bg-green-900 text-green-200' : 'bg-yellow-900 text-yellow-200'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isContractsDeployed ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
              <span>{isContractsDeployed ? 'Contracts Connected' : 'Deploy Contracts First'}</span>
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="max-w-4xl mx-auto p-4">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('confess')}
            className={`px-4 py-2 rounded transition-colors ${activeTab === 'confess' ? 'bg-red-600' : 'bg-gray-800 hover:bg-gray-700'}`}
          >
            Confess Your REKT
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-4 py-2 rounded transition-colors ${activeTab === 'gallery' ? 'bg-red-600' : 'bg-gray-800 hover:bg-gray-700'}`}
          >
            Gallery ({confessions.length})
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-4">
        {activeTab === 'confess' ? (
          <div className="space-y-6">
            {/* Progress Steps */}
            <div className="flex justify-center space-x-4 mb-8">
              {[{num: 1, label: 'Write'}, {num: 2, label: 'Mint'}, {num: 3, label: 'Share'}].map(({num, label}) => (
                <div key={num} className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                    step >= num ? 'bg-red-600 border-red-600' : 'border-gray-600'
                  }`}>{num}</div>
                  <span className="text-xs mt-1 text-gray-400">{label}</span>
                </div>
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-3xl font-bold mb-4">What's Your REKT Story?</h2>
                  <p className="text-gray-400">Anonymous confessions. Minted as NFTs. Rewarded with $REKT tokens.</p>
                  <p className="text-sm text-yellow-400 mt-2">💡 Tip: Include words like "rekt", "loss", "rug" for higher rekt level!</p>
                </div>

                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <textarea
                    value={confession}
                    onChange={(e) => setConfession(e.target.value)}
                    placeholder="I bought Luna at $80 with my student loan and watched it crash to $0.0001..."
                    className="w-full h-32 bg-black border border-gray-700 rounded p-4 text-white placeholder-gray-500 resize-none focus:border-red-500 focus:outline-none transition-colors"
                    maxLength={500}
                  />
                  <div className="flex justify-between items-center mt-4">
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-gray-400">{confession.length}/500 characters</span>
                      {confession && (
                        <span className={`px-2 py-1 rounded text-xs ${
                          calculateRektLevel(confession) === 'Absolutely Rekt' ? 'bg-red-900 text-red-200' :
                          calculateRektLevel(confession) === 'Pretty Rekt' ? 'bg-orange-900 text-orange-200' :
                          calculateRektLevel(confession) === 'Mildly Rekt' ? 'bg-yellow-900 text-yellow-200' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {calculateRektLevel(confession)}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-yellow-400">Reward: {calculateReward(confession.length)} $REKT</span>
                  </div>
                </div>

                <button
                  onClick={() => confession.trim() ? setStep(2) : setError('Please write your confession first')}
                  disabled={!confession.trim()}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-4 rounded-lg font-bold text-lg transition-colors"
                >
                  {!isConnected ? 'Connect Wallet First' : 'Continue to Mint →'}
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-3xl font-bold mb-4">Mint Your Confession NFT</h2>
                  <p className="text-gray-400">This will create a permanent record on Arbitrum blockchain.</p>
                </div>

                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Your Confession:</label>
                      <div className="bg-black border border-gray-700 rounded p-4 text-gray-300">"{confession}"</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Rekt Level:</span>
                        <span className="text-red-400 font-medium">{calculateRektLevel(confession)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Reward:</span>
                        <span className="text-yellow-400 font-medium">{calculateReward(confession.length)} $REKT</span>
                      </div>
                    </div>
                    {!isRightNetwork && (
                      <div className="text-center text-yellow-400 text-sm">⚠️ Please switch to Arbitrum network to mint</div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleMint}
                    disabled={isLoading || isMinting || !isConnected || !isRightNetwork}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-4 rounded-lg font-bold text-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    {isLoading || isMinting ? (
                      <>
                        <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent
