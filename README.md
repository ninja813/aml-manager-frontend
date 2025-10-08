# TreasuryPuller React Frontend

A React frontend for the TreasuryPuller off-chain signature demo, built with Tailwind CSS and WalletConnect for Trust Wallet integration.

## Features

- 🔗 **Trust Wallet Integration** - Connect using WalletConnect with QR code scanning
- 💰 **Token Analysis** - Automatically analyze user's token balances
- ✍️ **Off-Chain Signatures** - Sign off-chain signatures for gasless transactions
- 🎨 **Modern UI** - Beautiful gradient design with Tailwind CSS
- 📱 **Responsive** - Works on desktop and mobile devices

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure WalletConnect Project ID**
   - Get your Project ID from [WalletConnect Cloud](https://cloud.walletconnect.com)
   - Update the `WALLETCONNECT_PROJECT_ID` in `src/components/TreasuryPuller.jsx`

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── TreasuryPuller.jsx    # Main component
│   ├── App.jsx                   # App component
│   ├── main.jsx                  # Entry point
│   └── index.css                 # Global styles
├── index.html                    # HTML template
├── package.json                  # Dependencies
├── vite.config.js               # Vite configuration
├── tailwind.config.js           # Tailwind configuration
└── postcss.config.js            # PostCSS configuration
```

## Key Components

### TreasuryPuller.jsx
- Main React component with all functionality
- WalletConnect integration using your exact pattern
- Token analysis and transfer logic
- Beautiful UI with Tailwind CSS

### Styling
- Matches the original HTML design exactly
- Uses Tailwind CSS for responsive design
- Custom gradients and animations
- Smooth transitions and hover effects

## WalletConnect Integration

The component uses your exact WalletConnect pattern:

```javascript
const wcProvider = await EthereumProvider.init({
  projectId: "YOUR_WALLETCONNECT_PROJECT_ID",
  chains: [1], // Ethereum mainnet
  showQrModal: true,
});

await wcProvider.enable();
const ethersProvider = new ethers.BrowserProvider(wcProvider);
```

## Backend Integration

- Connects to backend at `http://localhost:3000`
- Analyzes tokens via `/analyze-tokens` endpoint
- Executes transfers via `/transfer-tokens` endpoint
- Handles off-chain signature signing

## Development

- **Port**: 3001 (configurable in vite.config.js)
- **Hot Reload**: Enabled for fast development
- **ESLint**: Configured for code quality
- **Tailwind**: JIT compilation for fast builds

## Production Build

```bash
npm run build
npm run preview
```

The built files will be in the `dist/` directory.
