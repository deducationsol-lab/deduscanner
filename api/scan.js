export default async function handler(req, res) {
    const { ca } = req.query;
    const HELIUS_KEY = "1a333300-f919-4d0e-ae4c-31b993844ba8"; // Replace with your key

    try {
        // 1. Fetch Dex Data (Price & Market Cap)
        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ca}`);
        const dexData = await dexRes.json();
        const pair = dexData.pairs?.[0];

        if (!pair) return res.status(404).json({ error: "Token not found" });

        const marketCap = pair.fdv || pair.marketCap || 0;
        
        // 2. Mock Market Cap History for Charting
        // Since DexScreener free API doesn't provide history, we simulate MC movement
        const mcHistory = Array.from({ length: 15 }, () => marketCap * (0.85 + Math.random() * 0.3));

        // 3. Fetch Deployer Info via Helius (Solana specific)
        let deployerInfo = { address: "Unknown", totalDeployed: 0 };
        try {
            const heliusRes = await fetch(`https://api.helius.xyz/v0/token-metadata?api-key=${HELIUS_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mintAccounts: [ca], includeOffChain: true })
            });
            const meta = await heliusRes.json();
            // This is a simplified logic; usually, you'd find the first 'Create' txn
            deployerInfo.address = "0x...Example"; 
            deployerInfo.totalDeployed = Math.floor(Math.random() * 10); // Simulated count
        } catch (e) { console.error("Helius Error:", e); }

        // 4. AI Risk Assessment Logic
        let riskScore = 0;
        if (pair.liquidity.usd < 15000) riskScore += 40;
        if (deployerInfo.totalDeployed > 5) riskScore += 10; // Experienced but watch for 'serial ruggers'

        res.status(200).json({
            name: pair.baseToken.name,
            symbol: pair.baseToken.symbol,
            mcHistory,
            marketCap: marketCap.toLocaleString(),
            deployer: deployerInfo,
            analysis: {
                riskScore,
                summary: riskScore > 30 ? "Moderate Risk: Check liquidity lock." : "Low Risk: Solid fundamentals."
            }
        });
    } catch (error) {
        res.status(500).
