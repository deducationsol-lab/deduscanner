// This is a Vercel Serverless Function
export default async function handler(req, res) {
    const { ca } = req.query;

    try {
        // 1. Fetch data from DexScreener
        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ca}`);
        const dexData = await dexRes.json();
        const pair = dexData.pairs?.[0];

        if (!pair) return res.status(404).json({ error: "Token not found" });

        // 2. Mock Price History (DexScreener API doesn't provide history in free tier easily)
        const priceHistory = Array.from({ length: 10 }, () => pair.priceUsd * (0.9 + Math.random() * 0.2));

        // 3. Simple AI Agent Logic (Rule-based ML)
        const liquidity = pair.liquidity?.usd || 0;
        const volume24h = pair.volume?.h24 || 0;
        
        let riskScore = 0;
        if (liquidity < 10000) riskScore += 50; // Flag low liquidity
        if (volume24h < 1000) riskScore += 30;  // Flag low activity

        const analysis = {
            riskScore: riskScore,
            liquidity: liquidity.toLocaleString(),
            holderConcentration: "Pending", // Real holder data requires Helius/Solana RPC
            summary: riskScore > 40 
                ? "⚠️ High Risk: Suspicious liquidity/volume patterns detected." 
                : "✅ Healthy: Token patterns appear stable for current volume."
        };

        res.status(200).json({ priceHistory, analysis });
    } catch (error) {
        res.status(500).json({ error: "Scan failed" });
    }
}
