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

    if (data.text && data.text !== "No analysis returned.") {
      resultDiv.innerHTML = `
        <h3>📊 Resume Analysis</h3>
        <div style="white-space: pre-wrap;">${data.text}</div>
      `;
    } else {
      resultDiv.innerHTML = `<p style="color:red;">⚠️ No analysis returned.</p>`;
    }
  } catch (err) {
    console.error(err);
    loadingDiv.textContent = "";
    resultDiv.innerHTML = `<p style="color:red;">Error analyzing resume.</p>`;
  }
});
