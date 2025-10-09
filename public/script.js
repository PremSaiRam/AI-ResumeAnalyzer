async function analyzeResume() {
  const fileInput = document.getElementById("resumeInput");
  const resultDiv = document.getElementById("result");

  if (!fileInput.files.length) {
    alert("Please upload a resume (PDF file).");
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = async function () {
    const base64Data = reader.result.split(",")[1];
    resultDiv.innerHTML = "⏳ Analyzing your resume... please wait.";

    const payload = {
      contents: [
        {
          parts: [
            { text: "Analyze this resume and provide feedback, suggestions, and a score from 0–100." },
            {
              inline_data: {
                mime_type: "application/pdf",
                data: base64Data,
              },
            },
          ],
        },
      ],
    };

    try {
      const response = await fetch("/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.error) {
        resultDiv.innerHTML = `❌ Error: ${data.error.message || JSON.stringify(data.error)}`;
      } else {
        const output = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI.";
        resultDiv.innerHTML = `✅ <b>AI Feedback:</b><br><br>${output}`;
      }
    } catch (err) {
      resultDiv.innerHTML = `⚠️ Network error: ${err.message}`;
    }
  };

  reader.readAsDataURL(file);
}
