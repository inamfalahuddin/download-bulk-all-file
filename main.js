const fs = require('fs');
const path = require('path');
const http = require('http');
const readline = require('readline');
const { PDFDocument } = require('pdf-lib');
const config = require('./config');

const outputFolder = path.join(__dirname, '20250509-download-cppt');
const csvFilePath = path.join(__dirname, 'data.csv');
const mergedFilePath = path.join(outputFolder, 'merged-result.pdf');

const downloadedFiles = [];
let totalLines = 0;
let completedDownloads = 0;

// Buat folder output jika belum ada
if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
}

// Hitung jumlah baris di CSV terlebih dulu
const lineCount = fs.readFileSync(csvFilePath, 'utf-8')
    .split('\n')
    .filter(line => line.trim()).length;

totalLines = lineCount;

// Baca CSV baris per baris
const rl = readline.createInterface({
    input: fs.createReadStream(csvFilePath),
    crlfDelay: Infinity,
});

rl.on('line', (line) => {
    const relativePath = line.trim().replace(/^"|"$/g, '');
    if (!relativePath) return;

    const fullPath = config.fullPathTemplate.replace(':RELATIVE_PATH', relativePath);
    const fullUrl = config.fullUrlTemplate.replace(':FULL_PATH', fullPath);

    const fileName = path.basename(relativePath);
    const filePath = path.join(outputFolder, fileName);

    http.get(fullUrl, (res) => {
        if (res.statusCode === 200) {
            const fileStream = fs.createWriteStream(filePath);
            res.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close();
                console.log(`✅ Downloaded: ${fileName}`);
                downloadedFiles.push(filePath);
                completedDownloads++;

                // Jika semua file sudah selesai
                if (completedDownloads === totalLines) {
                    mergePDFs();
                }
            });
        } else {
            console.error(`❌ Failed to download ${fileName}: HTTP ${res.statusCode}`);
            completedDownloads++;
            if (completedDownloads === totalLines) {
                mergePDFs();
            }
        }
    }).on('error', (err) => {
        console.error(`❌ Error downloading ${fileName}: ${err.message}`);
        completedDownloads++;
        if (completedDownloads === totalLines) {
            mergePDFs();
        }
    });
});

rl.on('close', () => {
    console.log('📁 Memulai download semua file...');
});

// Fungsi gabung PDF
async function mergePDFs() {
    console.log('📎 Menggabungkan PDF...');
    try {
        const mergedPdf = await PDFDocument.create();

        // Urutkan berdasarkan nama file
        downloadedFiles.sort();

        for (const filePath of downloadedFiles) {
            const pdfBytes = fs.readFileSync(filePath);
            const pdf = await PDFDocument.load(pdfBytes);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const mergedBytes = await mergedPdf.save();
        fs.writeFileSync(mergedFilePath, mergedBytes);
        console.log(`✅ PDF berhasil digabung: ${mergedFilePath}`);
    } catch (err) {
        console.error('❌ Gagal menggabungkan PDF:', err);
    }
}
