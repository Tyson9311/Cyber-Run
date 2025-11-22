import { getLeaderboard } from "../../utils/db.js";

export default async function handler(req, res) {
  try {
    const { groupId } = req.query || {};
    if (!groupId) return res.status(400).json({ error: "Missing groupId" });

    const leaderboard = await getLeaderboard(groupId);
    return res.status(200).json({ leaderboard });
  } catch (err) {
    console.error("getLeaderboard error", err);
    return res.status(500).json({ error: "Server error" });
  }
}