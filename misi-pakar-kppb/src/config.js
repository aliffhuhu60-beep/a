// Tetapan permainan. Ubah di sini atau melalui pemboleh ubah persekitaran Vite.

// URL Web App Google Apps Script (lihat google-apps-script/Code.gs dan README.md).
// Contoh: https://script.google.com/macros/s/AKfycb.../exec
// Boleh juga ditetapkan melalui VITE_GOOGLE_SCRIPT_URL semasa build (cth. dalam Vercel).
export const GOOGLE_SCRIPT_URL =
  (import.meta.env && import.meta.env.VITE_GOOGLE_SCRIPT_URL) ||
  ''; // <-- tampal URL Web App anda di sini jika tidak menggunakan VITE_GOOGLE_SCRIPT_URL

// Label penganjur pada ruang tandatangan sijil.
export const CERT_ORGANIZER = 'Penganjur Misi Pakar KPPB';

// Kunci LocalStorage.
export const STORAGE_KEY = 'misi-pakar-kppb.v2';
