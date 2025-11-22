// Uses window.gameContext from index.html
const { groupId } = window.gameContext || { groupId: "default" };

async function fetchLeaderboard(group) {
  const res = await fetch(`/api/getLeaderboard?groupId=${encodeURIComponent(group)}`);
  const data = await res.json();
  renderLeaderboard(data.leaderboard || []);
}

function renderLeaderboard(leaderboard) {
  const container = document.getElementById("leaderboard");
  container.innerHTML = `
    <h2>🏆 Group Leaderboard 🏆</h2>
    <ul>
      ${leaderboard.length
        ? leaderboard.map((p, i) => `<li><span>${i + 1}. ${p.playerId}</span><span>${p.score}</span></li>`).join("")
        : "<li>No scores yet</li>"
      }
    </ul>
    <button id="backBtn">Back</button>
  `;
  document.getElementById("backBtn").addEventListener("click", () => {
    document.getElementById("leaderboard").style.display = "none";
    document.getElementById("menu").style.display = "block";
  });
}

// Auto-render when leaderboard view is shown
if (document.getElementById("leaderboard").style.display !== "none") {
  fetchLeaderboard(groupId);
}
// Also for initial load; safe no-op
fetchLeaderboard(groupId);