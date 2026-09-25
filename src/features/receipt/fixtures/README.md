# Fixture regresi struk

Fixture di `receipt-regression.test.ts` sengaja berupa hasil OCR deterministik, bukan screenshot UI atau teks yang diambil dari jaringan. Cakupannya:

- struk tegak dengan format jumlah–nama–harga;
- foto 90 derajat dengan urutan token OCR acak;
- baris miring/perspektif dengan pusat vertikal yang bergeser;
- spasi pemisah ribuan yang tidak rata;
- service dan discount sebagai penyesuaian, bukan item;
- beberapa nama tanpa harga yang wajib ditandai ambigu;
- teks OCR dari `public/assets/kerja nyata.jpeg` dengan subtotal Rp214.000.

Nilai harapan ditulis literal agar perubahan parser yang menghilangkan item atau mengarang selisih langsung terdeteksi.
