const form = document.querySelector("form");
const resultDiv = document.getElementById("result");
const loadingDiv = document.getElementById("loading");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  resultDiv.textContent = "";
  loadingDiv.textContent = "Analyzing resume... please wait ⏳";

  const fileInput = document.getElementById("resume");
  const file = fileInput.files[0];
  if (!file) return alert("Please select a resume file first!");

  const formData = new FormData();
  formData.append("resume", file);

  try {
    const res = await fetch("/analyze", { method: "POST", body: formData });
    const data = await res.json();
    loadingDiv.textContent = "";

    if (data.text) {
      if (data.text.score) {
        resultDiv.innerHTML = `
          <h3>📊 Resume Analysis</h3>
          <p><strong>Score:</strong> ${data.text.score}/100</p>
          <p><strong>Strengths:</strong> ${data.text.strengths.join(", ")}</p>
          <p><strong>Weaknesses:</strong> ${data.text.weaknesses.join(", ")}</p>
          <p><strong>Suggestions:</strong> ${data.text.suggestions.join(", ")}</p>
        `;
      } else {
        resultDiv.innerHTML = `<div style="white-space: pre-wrap;">${data.text}</div>`;
      }
    } else {
      resultDiv.innerHTML = `<p style="color:red;">⚠️ No analysis returned.</p>`;
    }
  } catch (err) {
    console.error(err);
    loadingDiv.textContent = "";
    resultDiv.innerHTML = `<p style="color:red;">Error analyzing resume.</p>`;
  }
});
