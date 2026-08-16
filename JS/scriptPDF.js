document.getElementById('analyzeButton').addEventListener('click', async function () {
  const file = document.getElementById('pdfInput').files[0];
  if (!file) {
    alert("Please select a PDF file first.");
    return;
  }

  const pdfResult = document.getElementById("pdfResult");
  pdfResult.innerHTML = "<p>Processing PDF… digital pages are read directly; scanned pages use OCR and take longer.</p>";

  const pdfjsLib = window["pdfjs-dist/build/pdf"];
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

  // Arabic (incl. presentation forms) and Latin word runs.
  const AR = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]+/g;
  const EN = /\b[a-zA-Z]+\b/g;

  const fileReader = new FileReader();
  fileReader.onload = async function () {
    const pdf = await pdfjsLib.getDocument(new Uint8Array(this.result)).promise;
    let totalArabic = 0, totalEnglish = 0;
    let resultHTML = `<table border="1"><tr><th>Page</th><th>Arabic Words</th><th>English Words</th><th>Source</th></tr>`;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);

      // Prefer the page's own text layer: for a digital PDF this is exact and
      // instant, and OCR could only lose accuracy. Only truly scanned pages
      // (an image with no extractable text) fall back to OCR.
      let text = "", source = "text layer";
      try {
        const tc = await page.getTextContent();
        text = tc.items.map(it => it.str).join(" ");
      } catch (e) { text = ""; }

      if (text.trim().length < 20) {
        source = "OCR (scanned)";
        // Render at a higher scale than before — Arabic OCR is far more
        // reliable at ~300dpi; the old scale-2 render read most Arabic as
        // Latin gibberish and undercounted badly.
        const viewport = page.getViewport({ scale: 4 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        const result = await Tesseract.recognize(canvas.toDataURL("image/png"), "eng+ara",
          { logger: m => console.log(`[Tesseract Page ${i}]`, m) });
        text = result.data.text;
      }

      const arabicWords = text.match(AR) || [];
      const englishWords = text.match(EN) || [];
      totalArabic += arabicWords.length;
      totalEnglish += englishWords.length;

      resultHTML += `<tr>
        <td>${i}</td>
        <td>${arabicWords.length}</td>
        <td>${englishWords.length}</td>
        <td>${source}</td>
      </tr>`;
    }

    resultHTML += `</table>
      <h3>Total Arabic Words: ${totalArabic}</h3>
      <h3>Total English Words: ${totalEnglish}</h3>`;

    pdfResult.innerHTML = resultHTML;
  };

  fileReader.readAsArrayBuffer(file);
});
