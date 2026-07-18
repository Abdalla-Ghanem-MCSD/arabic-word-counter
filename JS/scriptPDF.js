document.getElementById('analyzeButton').addEventListener('click', async function () {
    const file = document.getElementById('pdfInput').files[0];
    if (!file) {
      alert("Please select a PDF file first.");
      return;
    }
  
    fetch('/api/log', {method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({app:'count-arabic',filename:file.name,filesize:file.size})}).catch(()=>{});
    const pdfResult = document.getElementById("pdfResult");
    pdfResult.innerHTML = "<p>Processing PDF... Please wait.</p>";
  
    const pdfjsLib = window["pdfjs-dist/build/pdf"];
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
  
    const fileReader = new FileReader();
    fileReader.onload = async function () {
      const typedarray = new Uint8Array(this.result);
      const pdf = await pdfjsLib.getDocument(typedarray).promise;
      let totalArabic = 0, totalEnglish = 0;
      let resultHTML = `<table border="1"><tr><th>Page</th><th>Arabic Words</th><th>English Words</th></tr>`;
  
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
  
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
  
        await page.render({ canvasContext: context, viewport }).promise;
  
        const dataURL = canvas.toDataURL("image/png");
  
        // OCR on image
        const result = await Tesseract.recognize(dataURL, 'eng+ara', {
          logger: m => console.log(`[Tesseract Page ${i}]`, m)
        });
  
        const text = result.data.text;
        const arabicWords = text.match(/[\u0600-\u06FF]+/g) || [];
        const englishWords = text.match(/\b[a-zA-Z]+\b/g) || [];
  
        totalArabic += arabicWords.length;
        totalEnglish += englishWords.length;
  
        resultHTML += `<tr>
          <td>${i}</td>
          <td>${arabicWords.length}</td>
          <td>${englishWords.length}</td>
        </tr>`;
      }
  
      resultHTML += `</table>
        <h3>Total Arabic Words: ${totalArabic}</h3>
        <h3>Total English Words: ${totalEnglish}</h3>`;
  
      pdfResult.innerHTML = resultHTML;
    };
  
    fileReader.readAsArrayBuffer(file);
  });
  