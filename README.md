# COLD BLOOD: THE CORRUPTED SISTER
> **Retro 3D Survival Horror (PS1 1997 / PS2 2004 Aesthetic)**

Game survival horror 3D bergaya retro PlayStation 1 & 2 yang dibangun menggunakan **Three.js** dan **Vite**. Pemain bertahan hidup dari serbuan gerombolan zombie di tengah badai salju Rimba Morbida bersama teman bernama Kristin.

---

## 🌟 Fitur Utama
- **Retro PS1/PS2 Aesthetic**: Visual 3D retro dengan tekstur terdistorsi, filter CRT scanlines, dan kabut tebal bersalju.
- **Companion AI Kristin**: Sahabat yang mendampingi, memberikan dialog interaktif situasional, dan mendukung pertarungan.
- **Arsenal Senjata Taktis**:
  - **Shotgun Putar M1887**: Magazine kapasitas besar (60 Shells) tanpa repot bolak-balik reload.
  - **Shotgun Pompa Taktis**: Daya hancur tinggi untuk gerombolan zombie.
  - **Golok Tajam**: Melee tajam untuk serangan jarak dekat / quick-melee (Klik Kanan).
  - **Sistem Reload Cepat**: Durasi reload selesai tepat dalam **1 detik** flat.
- **Bos Menantang**:
  - **Nona Batavia (Roh Gentayangan)**: Bos selingan yang melayang di udara dan membawa kawanan zombie setiap kelipatan **50 Kills (50, 100, 150, dst.)**.
  - **Sister Valentina**: Bos utama biarawati dengan ratapan suara khas dan aura horor.
- **Lingkungan Interaktif**:
  - Hamparan salju dengan jejak darah realistis.
  - Aliran sungai dingin dan air terjun beku bergemuruh.
  - Rumah singgah dan pondok desa dengan pintu yang dapat dijebol.

---

## ⌨️ Kontrol Game

| Tombol | Fungsi |
| :--- | :--- |
| **W, A, S, D** | Bergerak Maju, Mundur, Kiri, Kanan |
| **Shift** | Berlari Cepat (*Sprint*) |
| **Mouse** | Memutar Kamera / Membidik |
| **Klik Kiri** | Menembak / Mengayun Senjata Utama |
| **Klik Kanan** | *Quick Melee* (Tebasan Golok Instan) |
| **R** | Reload Cepat (1 Detik) |
| **1 / 2 / 3** atau **Q** | Ganti Senjata (Shotgun Pompa, Shotgun Putar, Golok) |
| **V** | Ganti Mode Kamera (Orang Pertama / Orang Ketiga) |
| **Esc / Space** | Lewati *Cutscene* Intro |

---

## 🚀 Cara Menjalankan Game Secara Lokal

### Prasyarat
- [Node.js](https://nodejs.org/) (versi 18 atau lebih baru)

### Instalasi & Menjalankan
1. Clone repositori ini:
   ```bash
   git clone https://github.com/andikacatvr/Cold_Blood_Zombey.git
   cd Cold_Blood_Zombey
   ```

2. Pasang dependensi:
   ```bash
   npm install
   ```

3. Jalankan server lokal:
   ```bash
   npm run dev
   ```

4. Buka tautan di browser:
   ```text
   http://localhost:5173
   ```

### Build Production
Untuk mengompilasi aset game ke folder `dist/`:
```bash
npm run build
```

---

## 📁 Struktur Direktori
```text
game_zombie/
├── public/                 # Aset statis Three.js
│   ├── audio/              # SFX & voice note boss
│   ├── libs/               # 3D loaders (GLTF & OBJ)
│   ├── models/             # Model 3D .glb / .obj
│   └── textures/           # Texture atlas & skin
├── src/                    # Source code modular
│   ├── audio/              # Engine audio Web Audio API
│   ├── core/               # Player logic, inventory, cutscene
│   ├── entities/           # Kristin, zombie, dan boss
│   ├── graphics/           # Three.js engine & renderer
│   ├── styles/             # UI CSS & filter CRT
│   ├── ui/                 # HUD & menu dialog
│   └── world/              # Terrain salju, sungai, air terjun
├── index.html              # Entry point utama
└── package.json
```

---

## 📄 Lisensi
Dibuat untuk tujuan eksplorasi kreatif dan eksperimen game development.

