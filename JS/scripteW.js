document.getElementById('countButton').addEventListener('click', function () {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    const includeNumbers = document.getElementById('includeNumbers').checked;

    if (!file) {
        alert('Please upload a Word file.');
        return;
    }

    fetch('/api/log', {method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({app:'count-arabic',filename:file.name,filesize:file.size})}).catch(()=>{});
    const reader = new FileReader();
    reader.onload = function (e) {
        const arrayBuffer = e.target.result;

        mammoth.extractRawText({ arrayBuffer: arrayBuffer })
            .then(function (result) {
                const text = result.value;
                let totalArabicWordCount = 0;
                let totalEnglishWordCount = 0;

                let resultHTML = '<h2>Word Count Per Line</h2>';
                resultHTML += '<table border="1"><tr><th>Line</th><th>Paragraph</th><th>Arabic Word Count</th><th>English Word Count</th></tr>';

                const lines = text.split(/\n/);
                lines.forEach((line, index) => {
                    const cleanedLine = line.replace(/[^ا-يأإآءa-zA-Z0-9\s]/g, ' ');

                    let arabicWords = [];
                    let englishWords = [];

                    if (includeNumbers) {
                        arabicWords = cleanedLine.match(/[\u0600-\u06FF]+|[٠-٩]+/g) || [];
                        englishWords = cleanedLine.match(/[a-zA-Z0-9]+/g) || [];
                    } else {
                        arabicWords = cleanedLine.match(/[\u0600-\u06FF]+/g) || [];
                        englishWords = cleanedLine.match(/[a-zA-Z]+/g) || [];
                    }

                    const arabicWordCount = arabicWords.length;
                    const englishWordCount = englishWords.length;

                    totalArabicWordCount += arabicWordCount;
                    totalEnglishWordCount += englishWordCount;

                    resultHTML += `<tr><td>${index + 1}</td><td>${line}</td><td>${arabicWordCount}</td><td>${englishWordCount}</td></tr>`;
                });

                resultHTML += '</table>';

                let summaryHTML = '<h2>Overall Summary</h2>';
                summaryHTML += `<p><strong>Total Arabic words${includeNumbers ? ' (including Arabic numbers)' : ''}:</strong> ${totalArabicWordCount}</p>`;
                summaryHTML += `<p><strong>Total English words${includeNumbers ? ' (including numbers)' : ''}:</strong> ${totalEnglishWordCount}</p>`;
                summaryHTML += '<h3>Full Extracted Text:</h3>';
                summaryHTML += `<div style="white-space:pre-wrap;border:1px solid #ccc;padding:10px;">${text}</div>`;

                document.getElementById('result').innerHTML = resultHTML + summaryHTML;

                const blob = new Blob([resultHTML + summaryHTML], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'WordCountReport.html';
                a.textContent = 'Download Word Count Report';
                a.style.display = 'inline-block';
                a.style.marginTop = '20px';
                document.body.appendChild(a);
            })
            .catch(function (err) {
                console.error("Error reading the Word file:", err);
                alert('Error reading the Word file. Please try again.');
            });
    };

    reader.readAsArrayBuffer(file);
});
