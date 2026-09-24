# AGENTS.md

## Tujuan
Bangun **SplitBill+** sebagai web app responsif untuk pembagian tagihan.

Aplikasi harus:
- 100% gratis.
- Tidak memiliki Premium, Upgrade, Pro, subscription, paywall, atau feature lock.
- Semua menu utama harus berfungsi. Dilarang membuat halaman "Segera Hadir".
- Desktop-first tetapi nyaman dipakai dari mobile browser.

## Stack
- Next.js App Router
- TypeScript strict
- Tailwind CSS
- shadcn/ui jika membantu
- Framer Motion untuk animasi ringan
- Recharts untuk chart
- Zod untuk validasi
- Dexie / IndexedDB untuk penyimpanan local-first
- Tesseract.js untuk OCR struk
- Vitest + React Testing Library

Gunakan dependency tambahan hanya jika benar-benar diperlukan.

## Route Wajib
- `/` atau `/dashboard`
- `/split-bill`
- `/scan`
- `/groups`
- `/history`
- `/settings`

Semua navigasi harus menuju halaman nyata dan dapat digunakan.

---

## 1. Split Bill

Harus mendukung:

### Bagi Rata
Input:
- total tagihan
- peserta
- pajak
- service charge
- tip

Output:
- subtotal
- nilai pajak
- service
- tip
- grand total
- nominal setiap orang

### Custom Split
User dapat menentukan nominal atau proporsi tiap peserta.

Validasi:
- tidak boleh negatif
- pembagian akhir harus sama dengan grand total
- tampilkan sisa/kelebihan sebelum user menyimpan

### Per Item
- tambah/edit/hapus item
- nama item
- harga
- quantity
- satu item dapat diberikan ke satu atau beberapa peserta
- jika beberapa peserta memilih satu item, biaya item dibagi di antara mereka

### Setelah Perhitungan
User dapat:
- simpan transaksi
- bagikan ringkasan
- copy hasil
- mulai ulang

Transaksi yang disimpan harus otomatis muncul di Riwayat dan Grup jika menggunakan grup.

### Aturan Uang
Jangan gunakan floating point untuk perhitungan uang.

Gunakan integer Rupiah/minor unit.

Total seluruh bagian harus selalu sama persis dengan grand total.

Sisa pembulatan harus dibagikan secara deterministik berdasarkan urutan peserta.

---

## 2. Scan Struk

Harus benar-benar dapat digunakan.

Fitur:
- drag & drop
- pilih gambar
- akses kamera pada browser mobile
- JPG/PNG/WEBP
- validasi ukuran file
- preview gambar
- OCR menggunakan Tesseract.js
- progress OCR
- error state
- retry

Hasil OCR tidak dianggap final.

User harus dapat:
- edit nama item
- edit harga
- edit quantity
- tambah item manual
- hapus item
- memilih item yang ingin digunakan

Setelah item benar:
- tombol `Lanjut ke Split per Item`
- kirim item ke halaman Split Bill mode Per Item

Jika OCR gagal, user tetap harus dapat memasukkan item secara manual.

---

## 3. Grup

CRUD grup harus berfungsi.

User dapat:
- membuat grup
- mengubah nama/deskripsi
- menghapus grup
- menambah anggota
- menghapus anggota
- melihat anggota
- melihat transaksi grup
- memulai Split Bill menggunakan anggota grup

Data grup:
- id
- nama
- deskripsi
- ikon/emoji opsional
- anggota
- createdAt
- updatedAt

Detail grup menampilkan:
- jumlah anggota
- jumlah transaksi
- transaksi terakhir
- tagihan yang belum selesai jika ada

Tidak perlu invitation online jika belum ada backend/auth.
Tambahkan anggota secara lokal menggunakan nama.

Jangan menampilkan tombol undang/share yang pura-pura bekerja.

---

## 4. Riwayat

Semua transaksi Split Bill yang disimpan masuk ke Riwayat.

Harus tersedia:
- daftar transaksi
- detail transaksi
- filter tanggal
- filter kategori
- search
- filter grup
- status transaksi
- jumlah peserta
- total transaksi

Analytics:
- total pengeluaran
- jumlah transaksi
- rata-rata transaksi
- grafik berdasarkan periode
- distribusi kategori

User dapat:
- membuka detail
- menghapus transaksi
- duplicate/gunakan ulang transaksi
- export CSV

Mobile:
table desktop harus berubah menjadi list/card.

---

## 5. Pengaturan

Karena aplikasi local-first, jangan membuat fitur akun/server yang sebenarnya belum ada.

Fitur yang wajib berfungsi:

### Profil Lokal
- nama
- avatar/inisial

### Tampilan
- terang
- gelap
- mengikuti sistem

### Mata Uang
Default IDR.

Format Rupiah:
`Rp 1.250.000`

### Default Bill
User dapat mengatur:
- default pajak
- default service charge
- default tip
- metode pembulatan

Nilai default otomatis digunakan saat membuat Split Bill baru.

### Pajak
Mode:
- otomatis
- manual

Data otomatis harus memiliki:
- jenis pajak
- rate
- effective date
- last updated
- source URL

Jangan menampilkan teks "diperbarui hari ini" jika data memang tidak diperbarui hari itu.

Jika sumber otomatis gagal:
- gunakan data terakhir yang valid
- beri informasi bahwa data belum dapat disinkronkan
- manual override harus tetap bekerja

### Data
- export backup JSON
- import backup JSON
- hapus seluruh data
- confirmation dialog sebelum hapus

Semua pengaturan disimpan secara lokal.

---

## Pajak

Pisahkan:
1. tax data provider
2. bill calculation

Jangan menanam satu angka pajak sebagai aturan universal.

Buat interface/provider agar sumber pajak dapat diganti tanpa mengubah kalkulator.

Selalu tampilkan sumber dan tanggal data.

---

## Penyimpanan Data

Gunakan IndexedDB agar aplikasi tetap berfungsi tanpa backend.

Minimal store:
- settings
- participants
- groups
- transactions
- transactionItems
- taxCache

Semua data penting harus tetap ada setelah browser direfresh.

Buat repository layer agar penyimpanan dapat diganti ke API/backend di masa depan.

---

## Model Minimum

Participant:
- id
- name
- avatarColor

Group:
- id
- name
- description
- members
- createdAt
- updatedAt

Transaction:
- id
- title
- category
- groupId optional
- participants
- items
- subtotal
- tax
- serviceCharge
- tip
- grandTotal
- splitMode
- splits
- status
- createdAt

Settings:
- theme
- currency
- defaultTax
- defaultService
- defaultTip
- roundingMode
- profileName

---

## UI

Referensi desain ada di `/design-reference`.

Gunakan sebagai arah visual, bukan screenshot yang ditempel menjadi UI.

Style:
- modern fintech
- putih + biru
- clean
- rounded cards
- shadow lembut
- gradient secukupnya
- whitespace lega
- typography jelas

PENTING:
Beberapa gambar referensi lama memiliki elemen:
- Upgrade ke Premium
- Premium
- subscription

**Abaikan dan jangan implementasikan elemen tersebut.**

SplitBill+ gratis dan semua fitur tersedia.

---

## Responsive

Desktop:
- sidebar
- topbar
- multi-column

Tablet:
- grid menyesuaikan
- sidebar compact jika diperlukan

Mobile:
- satu kolom
- sidebar menjadi drawer/bottom navigation
- tidak ada horizontal overflow
- touch target minimal 44px
- form nyaman digunakan dengan keyboard mobile

Breakpoint ditentukan secara konsisten menggunakan Tailwind.

---

## Asset

Asset produk ada di:

`/public/assets`

Gunakan illustration asset sebagai gambar.

Untuk icon UI, prioritaskan icon library seperti Lucide agar tajam dan konsisten.

Jangan memakai screenshot komponen seperti button/card sebagai gambar UI.

---

## State Wajib

Setiap fitur yang mengambil/memproses data harus memiliki:
- loading
- success
- empty
- error

Tidak boleh ada tombol aktif yang tidak melakukan apa-apa.

Jika fitur belum dapat dilakukan, jangan tampilkan tombolnya.

---

## Accessibility
- semantic HTML
- label form
- keyboard navigation
- focus state terlihat
- aria-label untuk icon button
- contrast yang cukup
- jangan hanya mengandalkan warna untuk status

---

## Testing

Minimal unit test:

### Split
- equal split
- tax
- service charge
- tip
- custom split
- per-item split
- multiple owner item
- rounding remainder

### Data
- save transaction
- load transaction
- delete transaction
- group CRUD
- settings persistence

### UI
Test flow penting:
- membuat split bill
- scan/manual receipt ke per-item split
- membuat grup
- menyimpan transaksi
- transaksi muncul di Riwayat
- mengubah Settings

---

## Acceptance Criteria

Task dianggap selesai hanya jika:

1. Semua route utama dapat dibuka.
2. Tidak ada menu "Segera Hadir".
3. Tidak ada Premium/Upgrade/paywall.
4. Split Bill menghasilkan perhitungan yang benar.
5. Scan Struk memiliki OCR dan fallback manual.
6. Grup memiliki CRUD nyata.
7. Riwayat berasal dari transaksi nyata yang tersimpan.
8. Settings benar-benar mengubah perilaku aplikasi.
9. Data tetap ada setelah refresh.
10. Desktop dan mobile usable.
11. Tidak ada TypeScript error.
12. Tidak ada lint error.
13. Test utama lulus.
14. Production build berhasil.

---

## Workflow Codex

Untuk setiap task:

1. Baca file ini.
2. Inspect code existing terlebih dahulu.
3. Jangan rewrite code yang tidak berhubungan.
4. Implementasikan feature secara end-to-end, bukan hanya UI.
5. Reuse component sebelum membuat yang baru.
6. Jalankan formatter.
7. Jalankan lint.
8. Jalankan test.
9. Jalankan production build untuk perubahan besar.
10. Perbaiki error sebelum berhenti.

Jangan meninggalkan placeholder, TODO kritis, broken route, atau tombol palsu.
