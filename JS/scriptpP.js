document.getElementById('countButton').addEventListener('click', function () {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please upload a PowerPoint file.');
        return;
    }

    fetch('/api/log', {method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({app:'count-arabic',filename:file.name,filesize:file.size})}).catch(()=>{});
    const reader = new FileReader();
    reader.onload = function (e) {
        JSZip.loadAsync(e.target.result).then(function (zip) {
            const slideRegex = /^ppt\/slides\/slide\d+\.xml$/;
            const slideFiles = Object.keys(zip.files).filter((path) => slideRegex.test(path));

            let promises = slideFiles.map((path) =>
                zip.files[path].async('string').then((xml) => {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(xml, 'text/xml');
                    const texts = xmlDoc.getElementsByTagName('a:t');

                    let slideText = "";
                    for (let t of texts) {
                        slideText += t.textContent + " ";
                    }
                    return slideText.trim();
                })
            );

            Promise.all(promises).then((slideTexts) => {
                let resultHTML = '<table border="1"><tr><th>Slide</th><th>Text</th><th>Arabic Word Count</th><th>English Word Count</th></tr>';
                let totalArabic = 0;
                let totalEnglish = 0;

                slideTexts.forEach((text, index) => {
                    const arabicWords = text.match(/[\u0600-\u06FF]+/g) || [];
                    const englishWords = text.match(/\b[a-zA-Z]+\b/g) || [];

                    resultHTML += `<tr>
                        <td>${index + 1}</td>
                        <td>${text}</td>
                        <td>${arabicWords.length}</td>
                        <td>${englishWords.length}</td>
                    </tr>`;

                    totalArabic += arabicWords.length;
                    totalEnglish += englishWords.length;
                });

                resultHTML += `</table>
                    <h3>Total Arabic words in file: ${totalArabic}</h3>
                    <h3>Total English words in file: ${totalEnglish}</h3>`;

                document.getElementById('pptxWordCountResult').innerHTML = resultHTML;

                // Optional download button
                const blob = new Blob([resultHTML], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'powerpointCountReport.html';
                a.textContent = 'Download PPTX Count Report';
                a.style.display = 'block';
                a.style.marginTop = '15px';
                document.getElementById('pptxWordCountResult').appendChild(a);
            });
        }).catch((err) => {
            console.error("Error extracting PPTX file:", err);
            alert('Error processing the PowerPoint file. Make sure it\'s a valid .pptx file.');
        });
    };

    reader.readAsArrayBuffer(file);
});
