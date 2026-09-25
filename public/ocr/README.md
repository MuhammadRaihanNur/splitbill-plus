# Runtime OCR lokal

Folder `runtime/` dibuat oleh `npm run ocr:assets` dan harus ikut deployment agar pemindaian tidak mengirim foto atau teks struk ke pihak ketiga.

Sumber asset:

- `tesseract.js@7.0.0`: `runtime/worker.min.js`
- `tesseract.js-core@7.0.0`: seluruh runtime JS/WASM di `runtime/core/`
- `@tesseract.js-data/eng@1.0.0`: model `4.0.0_best_int` di `runtime/lang/eng.traineddata.gz`
- `@tesseract.js-data/ind@1.0.0`: model `4.0.0_best_int` di `runtime/lang/ind.traineddata.gz`

Jangan mengubah file hasil sinkronisasi secara manual. Perbarui dependency, jalankan ulang script, lalu verifikasi lint, test, dan build.
