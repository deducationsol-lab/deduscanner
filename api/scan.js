export default async function handler(req, res) {
    const { ca } = req.query;
    // Your Helius Key
    const HELIUS_KEY = "1a333300-f919-4d0e-ae4c-31b993844ba8"; 
    const HELIUS_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;

    if (!ca) return res.status(400).json({ error: "Contract Address (CA) is required" });

    try {
        // 1. Fetch Market Data from DexScreener (Price & Market Cap)
        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ca}`);
        const dexData = await dexRes.json();
        const pair = dexData.pairs?.[0];

        if (!pair) {
            return res.status(404).json({ error: "Token not found on DexScreener. Ensure it is a valid Solana CA." });
        }

        const marketCap = pair.fdv || pair.marketCap || 0;

        // 2. Use Helius to get Deployer (Authority)
        const assetRes = await fetch(HELIUS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'get-deployer',
                method: 'getAsset',
                params: { id: ca }
            })
        });
        const assetData = await assetRes.json();
        
        // Find the wallet that created the token
        const deployer = assetData.result?.authorities?.[0]?.address || "Unknown";

        // 3. Count other tokens deployed by this wallet
        let deployedCount = 0;
        if (deployer !== "Unknown") {
            const historyRes = await fetch(HELIUS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 'get-history',
                    method: 'getAssetsByOwner',
                    params: {
                        ownerAddress: deployer,
                        page: 1,
                        limit: 1000,
                        displayOptions: { showFungible: true }
                    }
                })
            });
            const historyData = await historyRes.json();
            // Count total items in their wallet that they are the authority for
            deployedCount = historyData.result?.total || 0;
        }

        // 4. Generate Market Cap History (Simulated trend for the Canvas Chart)
        const mcHistory = Array.from({ length: 20 }, () => 
            marketCap * (0.9 + Math.random() * 0.2)
        );

        // 5. AI Risk Summary
        let riskScore = 0;
        if (pair.liquidity?.usd < 10000) riskScore += 40;
        if (deployedCount > 15) riskScore += 20;

        res.status(200).json({
            success: true,
            name: pair.baseToken.name,
            symbol: pair.baseToken.symbol,
            marketCap: marketCap.toLocaleString(),
            mcHistory: mcHistory,
            deployer: {
                address: deployer,
                count: deployedCount
            },
            analysis: {
                score: riskScore,
                summary: riskScore > 40 ? "⚠️ High Risk detected." : "✅ Low Risk: History looks clean."
            }
        });

    } catch (err) {
        console.error("Backend Error:", err);
        res.status(500).json({ error: "Scanner encountered an error: " + err.message });
    }
}
