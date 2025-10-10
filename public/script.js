let currentUser = null;

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = emailInput.value, password = passwordInput.value;
  const res = await fetch("/login", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ email, password }) });
  const data = await res.json();
  if (data.email) loginSuccess(data.email); else alert(data.error);
});

document.getElementById("signupBtn").addEventListener("click", async () => {
  const email = emailInput.value, password = passwordInput.value;
  const res = await fetch("/signup", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ email, password }) });
  const data = await res.json();
  alert(data.message || data.error);
});

function loginSuccess(email) {
  currentUser = email;
  document.getElementById("auth-section").style.display = "none";
  document.getElementById("app-section").style.display = "block";
  document.getElementById("userEmail").textContent = email;
  loadHistory();
}

async function loadHistory() {
  const res = await fetch(`/history?email=${currentUser}`);
  const data = await res.json();
  const historyDiv = document.getElementById("history");
  historyDiv.innerHTML = data.map(h => `
    <div class="card">
      <p><b>${h.date}</b> - Score: ${h.score}</p>
      <p>Strengths: ${h.strengths.join(", ")}</p>
      <p>Weaknesses: ${h.weaknesses.join(", ")}</p>
    </div>
  `).join("");
}

const form = document.getElementById("analyzer-form");
form.addEventListener("submit", async e => {
  e.preventDefault();
  const file = document.getElementById("resume").files[0];
  if (!file) return alert("Please upload a resume");

  const formData = new FormData();
  formData.append("resume", file);

  document.getElementById("loading").textContent = "Analyzing...";

  const res = await fetch(`/analyze?email=${currentUser}`, { method: "POST", body: formData });
  const data = await res.json();

  document.getElementById("loading").textContent = "";
  document.getElementById("result").innerHTML = `
    <h3>📊 Analysis Result</h3>
    <p><b>Score:</b> ${data.score}</p>
    <p><b>Strengths:</b> ${data.strengths.join(", ")}</p>
    <p><b>Weaknesses:</b> ${data.weaknesses.join(", ")}</p>
    <p><b>Suggestions:</b> ${data.suggestions.join(", ")}</p>
  `;
  loadHistory();
});
