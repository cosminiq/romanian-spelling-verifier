document.addEventListener('DOMContentLoaded', () => {
    // Elemente DOM
    const errorsTable = document.getElementById('errors-table');
    const errorsBody = document.getElementById('errors-body');
    const filterText = document.getElementById('filter-text');
    const filterLine = document.getElementById('filter-line');
    const modal = document.getElementById('error-modal');
    const modalClose = document.querySelector('.close');
    const errorDetails = document.getElementById('error-details');
    const exportPdfBtn = document.getElementById('btn-export-pdf');
    const exportCsvBtn = document.getElementById('btn-export-csv');
    const template = document.getElementById('error-row-template');

    // Variabilă pentru stocarea datelor
    let errorsData = [];


    // Încarcă datele din CSV
    fetch('greseli.csv')
    .then(response => response.text())
    .then(data => {
        // Împarte textul în linii
        const lines = data.split('\n');
        let startIndex = 0;
        
        // Verifică dacă prima linie conține metadata
        if (lines.length > 0 && lines[0].startsWith('#DATA_CREARE:')) {
            const dataCreare = lines[0].substring('#DATA_CREARE:'.length).trim();
            startIndex = 1; // Începe de la linia următoare
            
            // Actualizează elementul HTML cu data creării
            const dataVerificareElement = document.getElementById('data-verificare');
            if (dataVerificareElement) {
                dataVerificareElement.textContent = dataCreare;
            }
        }
        
        // Obține liniile relevante (exclusiv metadata și inclusiv header-ul)
        const relevantLines = lines.slice(startIndex).filter(row => row.trim() !== '');
        
        // Prima linie după metadata este header-ul, îl ignorăm pentru prelucrarea datelor
        const dataRows = relevantLines.slice(1);
        
        // Parsează datele folosind regex
        errorsData = dataRows.map(row => {
            // Utilizează un regex pentru a împărți corect câmpurile CSV, ținând cont de ghilimele
            const regex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;
            let matches = [...row.matchAll(regex)];
            const values = matches.map(match => match[0].replace(/"/g, ''));
            
            // Asigură-te că avem toate cele 6 câmpuri
            if (values.length >= 6) {
                return {
                    linie: values[0],
                    pozitie: values[1],
                    cuvant_gresit: values[2],
                    sugestii: values[3],
                    context: values[4],
                    tip_eroare: values[5]
                };
            }
            return null;
        }).filter(item => item !== null);
        
        // Actualizează numărul total de greșeli
        document.getElementById('total-greseli').textContent = errorsData.length;
        
        // Populează tabelul cu erori
        renderErrorsTable(errorsData);
        
        // Creează statistici
        createStatistics(errorsData);
        
        // Populează filtrul de linii
        populateLineFilter(errorsData);
    })
    .catch(error => {
        console.error('Eroare la încărcarea datelor:', error);
        
        // În caz de eroare, afișează un mesaj pentru data verificării
        const dataVerificareElement = document.getElementById('data-verificare');
        if (dataVerificareElement) {
            dataVerificareElement.textContent = 'Informație indisponibilă';
        }
    });
    
    // Event listeners
    filterText.addEventListener('input', filterErrors);
    filterLine.addEventListener('change', filterErrors);
    modalClose.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
    exportPdfBtn.addEventListener('click', exportToPdf);
    exportCsvBtn.addEventListener('click', exportToCsv);

    // Procesează acțiunile pentru fiecare rând
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-details')) {
            const row = e.target.closest('tr');
            const index = row.dataset.index;
            showErrorDetails(errorsData[index]);
        }

        if (e.target.classList.contains('btn-ignore')) {
            const row = e.target.closest('tr');
            row.classList.toggle('ignored');
            if (row.classList.contains('ignored')) {
                row.style.opacity = '0.5';
                e.target.textContent = 'Restaurează';
            } else {
                row.style.opacity = '1';
                e.target.textContent = 'Ignoră';
            }
        }
    });






    // Funcții
    function renderErrorsTable(data) {
        errorsBody.innerHTML = '';

        data.forEach((error, index) => {
            const clone = template.content.cloneNode(true);
            const row = clone.querySelector('.error-row');

            row.dataset.index = index;
            row.dataset.line = error.linie;

            row.querySelector('.line-number').textContent = error.linie;
            row.querySelector('.position').textContent = error.pozitie;
            row.querySelector('.misspelled-word').textContent = error.cuvant_gresit;
            row.querySelector('.suggestions').textContent = error.sugestii;

            // Formatează contextul și evidențiază cuvântul greșit
            const contextCell = row.querySelector('.context');
            const rawContext = error.context;

            // Presupunem că erorile sunt deja marcate cu [] în context
            const formattedContext = rawContext.replace(/\[(.*?)\]/g, '<mark>$1</mark>');
            contextCell.innerHTML = formattedContext;

            errorsBody.appendChild(clone);
        });
    }

    function filterErrors() {
        const searchText = filterText.value.toLowerCase();
        const lineFilter = filterLine.value;
        const rows = Array.from(errorsBody.getElementsByTagName('tr'));

        rows.forEach(row => {
            const lineMatch = lineFilter === '' || row.dataset.line === lineFilter;
            const textContent = row.textContent.toLowerCase();
            const textMatch = searchText === '' || textContent.includes(searchText);

            row.style.display = lineMatch && textMatch ? '' : 'none';
        });
    }

    function populateLineFilter(data) {
        const lines = new Set();
        data.forEach(error => lines.add(error.linie));

        const sortedLines = Array.from(lines).sort((a, b) => parseInt(a) - parseInt(b));

        sortedLines.forEach(line => {
            const option = document.createElement('option');
            option.value = line;
            option.textContent = `Linia ${line}`;
            filterLine.appendChild(option);
        });
    }

    function showErrorDetails(error) {
        errorDetails.innerHTML = `
            <div class="error-detail-item">
                <h3>Detalii complete</h3>
                <p><strong>Linie:</strong> ${error.linie}</p>
                <p><strong>Poziție:</strong> ${error.pozitie}</p>
                <p><strong>Cuvânt greșit:</strong> <span class="misspelled-word">${error.cuvant_gresit}</span></p>
                <p><strong>Sugestii:</strong> ${error.sugestii}</p>
                <p><strong>Tip eroare:</strong> ${error.tip_eroare}</p>
                <div class="context-box">
                    <p><strong>Context:</strong></p>
                    <pre>${error.context.replace(/\[(.*?)\]/g, '<mark>$1</mark>')}</pre>
                </div>
            </div>
        `;

        modal.style.display = 'block';
    }

    
    function createStatistics(data) // Modifică funcția createStatistics pentru a funcționa corect
    {
        // Verifică dacă avem date și elementul canvas există
        if (!data.length || !document.getElementById('stats-chart')) {
            console.error('Nu există date sau elementul canvas pentru statistici');
            return;
        }
        
        // Colectează statistici
        const totalErrors = data.length;

        // Creează un obiect pentru a număra erorile pe linii
        const errorsByLine = {};
        data.forEach(error => {
            const line = error.linie;
            errorsByLine[line] = (errorsByLine[line] || 0) + 1;
        });

        // Verifică dacă există Chart în window
        if (typeof Chart === 'undefined') {
            console.error('Chart.js nu este încărcat. Asigură-te că ai inclus biblioteca în HTML.');
            return;
        }

        // Sortează liniile și ia primele 10 linii cu cele mai multe erori
        const sortedLines = Object.keys(errorsByLine)
            .sort((a, b) => errorsByLine[b] - errorsByLine[a])
            .slice(0, 10);

        const lineLabels = sortedLines.map(line => `Linia ${line}`);
        const lineData = sortedLines.map(line => errorsByLine[line]);

        // Verifică dacă există grafic anterior și îl distruge
        const chartElement = document.getElementById('stats-chart');
        const existingChart = Chart.getChart(chartElement);
        if (existingChart) {
            existingChart.destroy();
        }

        // Creează grafic nou cu Chart.js
        const ctx = chartElement.getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: lineLabels,
                datasets: [{
                    label: 'Număr de greșeli',
                    data: lineData,
                    backgroundColor: 'rgba(30, 136, 229, 0.7)',
                    borderColor: 'rgba(30, 136, 229, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Top 10 linii cu cele mai multe greșeli',
                        font: {
                            size: 16
                        }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }


    function exportToPdf() {
        alert('Funcționalitatea de export PDF va fi implementată în versiuni viitoare.');
        // Aici s-ar putea integra o bibliotecă precum jsPDF
    }

    function exportToCsv() {
        // Creează un link de descărcare pentru fișierul CSV original
        const a = document.createElement('a');
        a.href = 'greseli.csv'; // Înlocuiește cu numele fișierului CSV generat de Python
        a.download = 'greseli_export.csv';
        a.click();
    }
});