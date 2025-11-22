import { saveScore } from "../../utils/db.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const { groupId, playerId, score } = req.body || {};
    if (!groupId || !playerId) return res.status(400).json({ error: "Missing groupId or playerId" });

    await saveScore(groupId, playerId, score || 0);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("submitScore error", err);
    return res.status(500).json({ error: "Server error" });
  }
}