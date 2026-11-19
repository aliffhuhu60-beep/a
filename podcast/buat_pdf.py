# -*- coding: utf-8 -*-
"""Jana PDF skrip podcast: Kerancuan Bahasa - Bahasa TikTok."""
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, Table, TableStyle, PageBreak, KeepTogether)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

F = "/usr/share/fonts/truetype/dejavu/"
L = "/usr/share/fonts/truetype/liberation/"
pdfmetrics.registerFont(TTFont("Sans", F + "DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("Sans-B", F + "DejaVuSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Serif-B", L + "LiberationSerif-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Serif-I", L + "LiberationSerif-Italic.ttf"))
pdfmetrics.registerFont(TTFont("Serif", L + "LiberationSerif-Regular.ttf"))
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily("Sans", normal="Sans", bold="Sans-B", italic="Sans", boldItalic="Sans-B")
registerFontFamily("Serif", normal="Serif", bold="Serif-B", italic="Serif-I", boldItalic="Serif-B")

# Palet ikut poster tugasan
TERRA = colors.HexColor("#C9836C")
MAROON = colors.HexColor("#5E1F2A")
PINK = colors.HexColor("#F3D3CB")
CREAM = colors.HexColor("#FAF6F2")
GREY = colors.HexColor("#6B6B6B")
RED = colors.HexColor("#E03A2F")
GREEN = colors.HexColor("#2F6B4F")

S = {
    "h1": ParagraphStyle("h1", fontName="Serif-B", fontSize=20, leading=24, textColor=MAROON, spaceBefore=6, spaceAfter=8),
    "h2": ParagraphStyle("h2", fontName="Sans-B", fontSize=11.5, leading=15, textColor=colors.white),
    "body": ParagraphStyle("body", fontName="Sans", fontSize=9.6, leading=14, textColor=colors.HexColor("#2A2A2A"), spaceAfter=5),
    "small": ParagraphStyle("small", fontName="Sans", fontSize=8.4, leading=11.5, textColor=colors.HexColor("#2A2A2A")),
    "smallb": ParagraphStyle("smallb", fontName="Sans-B", fontSize=8.4, leading=11.5, textColor=MAROON),
    "spk": ParagraphStyle("spk", fontName="Sans-B", fontSize=9, leading=13, textColor=MAROON),
    "line": ParagraphStyle("line", fontName="Sans", fontSize=9.6, leading=14, textColor=colors.HexColor("#222222")),
    "cue": ParagraphStyle("cue", fontName="Sans", fontSize=8.6, leading=12, textColor=GREY, spaceBefore=3, spaceAfter=3),
    "pantun": ParagraphStyle("pantun", fontName="Serif-I", fontSize=11.5, leading=16, textColor=MAROON, leftIndent=8),
}

def P(t, st="body"):
    return Paragraph(t, S[st])

def bar(text, color=TERRA):
    t = Table([[P(text, "h2")]], colWidths=[174 * mm])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), color),
                           ("LEFTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 5),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    return [Spacer(1, 6), t, Spacer(1, 6)]

def box(flow, bg=PINK, border=TERRA):
    t = Table([[flow]], colWidths=[174 * mm])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), bg), ("BOX", (0, 0), (-1, -1), 0.8, border),
                           ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                           ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
    return t

# ---------------- Watak ----------------
H1, H2, H3 = "ALIFF", "AMMAR", "IMAN"
WARNA = {H1: colors.HexColor("#C9836C"), H2: colors.HexColor("#5E1F2A"), H3: colors.HexColor("#8A6F5A")}

def say(who, text):
    tag = Table([[Paragraph(f"<font color='white'><b>{who}</b></font>",
                            ParagraphStyle("t", fontName="Sans-B", fontSize=8.5, leading=11, alignment=TA_CENTER))]],
                colWidths=[19 * mm])
    tag.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), WARNA[who]), ("TOPPADDING", (0, 0), (-1, -1), 2),
                             ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
    row = Table([[tag, P(text, "line")]], colWidths=[22 * mm, 152 * mm])
    row.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0),
                             ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    return row

def cue(t):
    return P(f"<i>[{t}]</i>", "cue")

def pantun(who, lines):
    body = "<br/>".join(lines)
    return KeepTogether([say(who, "<i>(berpantun)</i>"), box(P(body, "pantun"), bg=CREAM), Spacer(1, 4)])

# ---------------- Kandungan ----------------
story = []

# ===== Halaman muka =====
story += [Spacer(1, 30 * mm)]
story.append(Paragraph("PODCAST TENGAH JALAN",
                       ParagraphStyle("pj", fontName="Serif-B", fontSize=22, textColor=TERRA, alignment=TA_CENTER, leading=26)))
story.append(Spacer(1, 4))
story.append(Paragraph("AUDIO SIAR AKADEMIK  ·  ISU SEMASA SINTAKSIS",
                       ParagraphStyle("k", fontName="Sans-B", fontSize=9, textColor=TERRA, alignment=TA_CENTER, leading=12)))
story.append(Spacer(1, 8))
story.append(Paragraph("SLAY ATAU SALAH?",
                       ParagraphStyle("T", fontName="Serif-B", fontSize=40, leading=46, textColor=MAROON, alignment=TA_CENTER)))
story.append(Paragraph("Bila Bahasa Kita <i>Terpaling</i> Rancu di TikTok",
                       ParagraphStyle("T2", fontName="Serif-B", fontSize=18, leading=24, textColor=TERRA, alignment=TA_CENTER)))
story.append(Spacer(1, 10))
story.append(Paragraph("Tajuk asal: <b>Kerancuan Bahasa – Bahasa TikTok</b>",
                       ParagraphStyle("o", fontName="Sans", fontSize=10, textColor=GREY, alignment=TA_CENTER, leading=14)))
story.append(Spacer(1, 18 * mm))
info = [
    [P("<b>Format</b>", "smallb"), P("Audio siar perbualan, 3 orang penutur", "small")],
    [P("<b>Durasi</b>", "smallb"), P("± 11 minit (julat 10–12 minit; kira-kira 1,450 patah perkataan dialog termasuk pantun)", "small")],
    [P("<b>Penutur</b>", "smallb"), P("ALIFF (Hos 1 – pengacara utama) · AMMAR (Hos 2 – \"suara warganet\") · "
                                      "IMAN (Hos 3 – \"detektif sintaksis\"). Dialog dibahagikan sama rata: setiap penutur "
                                      "mempunyai 16 baris dialog (kira-kira 450–470 patah perkataan), dan setiap penutur membedah "
                                      "dua daripada enam contoh ayat TikTok.", "small")],
    [P("<b>Isi kandungan</b>", "smallb"), P("1. Judul alternatif  ·  2. Struktur & masa  ·  3. Skrip penuh  ·  "
                                            "4. Bukti autentik: contoh TikTok & pautan  ·  5. Semakan ciri audio siar akademik  ·  "
                                            "6. Rujukan  ·  7. Tip rakaman", "small")],
]
t = Table(info, colWidths=[30 * mm, 120 * mm])
t.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -2), 0.4, PINK), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                       ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
t.hAlign = "CENTER"
story.append(t)
story.append(PageBreak())

# ===== 1. Judul =====
story.append(P("1. Judul Audio Siar", "h1"))
story.append(P("<b>Nama audio siar:</b> Podcast Tengah Jalan. Setiap episod dibuka dengan nama podcast, diikuti "
               "pantun, dan barulah judul episod diumumkan."))
story.append(P("Judul utama yang dicadangkan menggunakan gaya bahasa TikTok sebagai \"umpan\", tetapi subjudulnya "
               "kekal membawa maksud asal tajuk, iaitu kerancuan bahasa akibat bahasa TikTok."))
story.append(box(P("<font name='Serif-B' size='16' color='#5E1F2A'>SLAY ATAU SALAH? Bila Bahasa Kita "
                   "<i>Terpaling</i> Rancu di TikTok</font><br/><br/>"
                   "<font size='9'><b>Mengapa judul ini menarik:</b> \"Slay\" ialah slanga TikTok yang popular, manakala "
                   "\"salah\" berbunyi hampir sama dan menyindir isu kesalahan bahasa. Perkataan \"terpaling\" sendiri "
                   "merupakan contoh kerancuan (imbuhan <i>ter-</i> + <i>paling</i>) yang akan dibedah dalam episod ini, "
                   "jadi judul itu sudah menjadi bukti kepada isunya.</font>", "body")))
story.append(Spacer(1, 8))
story.append(P("<b>Judul alternatif (jika mahu pilihan lain):</b>"))
for j in ["<b>#FYP Bahasa:</b> Bahasa Melayu Ke Mana di Era TikTok?",
          "<b>No Cap, Bahasa Kita Rosak?</b> Membongkar Kerancuan Bahasa TikTok",
          "<b>Delulu Tatabahasa:</b> Bahasa TikTok dan Ayat yang Hilang Arah",
          "<b>POV: Bahasa Melayu Menangis</b> – Kerancuan Bahasa di TikTok",
          "<b>Scroll, Like, Rosak?</b> Bahasa TikTok di Mata Sintaksis"]:
    story.append(P("•&nbsp;&nbsp;" + j))

# ===== 2. Struktur =====
story.append(P("2. Struktur dan Peruntukan Masa", "h1"))
seg = [["Masa", "Segmen", "Fokus", "Ciri akademik"],
       ["0:00 – 1:30", "Pembukaan", "Muzik, pengenalan Podcast Tengah Jalan, pantun Aliff & Ammar, topik episod", "–"],
       ["1:30 – 3:15", "Apa itu bahasa TikTok?", "Takrif rancu & slanga, data kajian", "Ketepatan ilmu, etika"],
       ["3:15 – 6:45", "Bedah Ayat TikTok", "6 contoh sebenar + pembetulan sintaksis", "Bukti autentik, ketepatan ilmu"],
       ["6:45 – 8:45", "Salah atau kreatif?", "Punca, kesan, pandangan berbeza, laras", "Pemikiran kritis"],
       ["8:45 – 10:15", "Bilik darjah", "Cara guru BM memanfaatkan TikTok", "Aplikasi pedagogi"],
       ["10:15 – 11:30", "Penutup", "Seruan berbahasa gramatis, pantun, kredit", "Etika akademik"]]
seg = [[P(c, "smallb" if i == 0 else "small") for c in r] for i, r in enumerate(seg)]
t = Table(seg, colWidths=[24 * mm, 34 * mm, 66 * mm, 50 * mm])
t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), PINK), ("GRID", (0, 0), (-1, -1), 0.4, TERRA),
                       ("VALIGN", (0, 0), (-1, -1), "TOP"), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CREAM])]))
story.append(t)
story.append(Spacer(1, 6))
story.append(P("<i>Nota bahasa: Skrip ditulis dalam bahasa Melayu gramatis tetapi bernada santai. Perkataan slanga atau "
               "bahasa Inggeris yang muncul hanya dipetik sebagai <b>contoh yang dianalisis</b> dan ditandakan dengan "
               "tanda petik.</i>", "small"))
story.append(PageBreak())

# ===== 3. Skrip =====
story.append(P("3. Skrip Penuh", "h1"))

story += bar("SEGMEN 1 · PEMBUKAAN  (0:00 – 1:30)")
story.append(cue("Muzik latar bebas hak cipta masuk selama 5 saat, kemudian diperlahankan"))
story.append(say(H1, "Assalamualaikum dan salam sejahtera kepada semua pendengar! Selamat datang ke <b>Podcast Tengah Jalan</b>, "
                     "tempat kita berhenti sebentar di tengah perjalanan hidup untuk berbual tentang isu yang dekat dengan kita. "
                     "Saya Aliff, dan seperti biasa, izinkan saya membuka bicara dengan serangkap pantun."))
story.append(pantun(H1, ["Burung merbah terbang ke hulu,", "Hinggap sebentar di pohon jati;",
                         "Bahasa TikTok viral selalu,", "Bahasa Melayu tetap di hati."]))
story.append(say(H2, "Wah, pembukaan yang cantik! Saya Ammar, wakil warganet yang menghabiskan masa tiga jam sehari menatal "
                     "TikTok. Tidak mahu kalah, saya pun ada pantun juga."))
story.append(pantun(H2, ["Anak dara menenun kain,", "Kain disulam benang suasa;",
                         "Slanga boleh sekadar bermain,", "Jangan rosakkan martabat bahasa."]))
story.append(say(H3, "Cantik! Pantun kamu berdua betul-betul... saya hampir sebut \"<i>ate</i>\", tetapi hari ini kita kena jaga "
                     "bahasa. <i>(ketawa)</i> Saya Iman. Jadi, Aliff, apakah topik kita di Podcast Tengah Jalan kali ini?"))
story.append(say(H1, "Episod kali ini bertajuk <b>\"Slay atau Salah? Bila Bahasa Kita Terpaling Rancu di TikTok\"</b>. Pendengar "
                     "sekalian, cuba bayangkan anda membaca kapsyen \"<i>POV: korang bila cikgu suruh present, terus blank, no "
                     "cap</i>\". Anda faham, tetapi adakah ayat itu betul dari segi tatabahasa? Itulah isu yang akan kita bongkar: "
                     "<b>kerancuan bahasa akibat bahasa TikTok</b>."))

story += bar("SEGMEN 2 · APA ITU BAHASA TIKTOK?  (1:30 – 3:15)")
story.append(say(H2, "Iman, sebelum kita pergi lebih jauh, apakah sebenarnya maksud \"rancu\"? Bunyinya seperti nama makanan."))
story.append(say(H3, "<i>(ketawa)</i> Bukan, Ammar. Menurut <b>Kamus Dewan Edisi Keempat</b>, \"rancu\" bermaksud bercampur aduk "
                     "atau kacau, khususnya dalam penggunaan bahasa. Jadi, kerancuan bahasa berlaku apabila unsur bahasa "
                     "bercampur aduk sehingga melanggar sistem bahasa Melayu, terutamanya <b>struktur ayat</b>."))
story.append(say(H1, "Bahasa TikTok pula ialah gabungan slanga, singkatan, campur kod Melayu-Inggeris dan struktur ayat yang "
                     "dipinjam daripada bahasa Inggeris. <b>Kamus Bahasa Melayu Nusantara (2003)</b> mentakrifkan slanga sebagai "
                     "ragam bahasa yang tidak rasmi, tidak baku dan bersifat tidak tetap atau bermusim."))
story.append(say(H2, "Bermusim! Betul juga. Tahun lepas semua orang sebut \"mantul\", iaitu \"mantap betul\". Sekarang orang sebut "
                     "\"<i>delulu</i>\", \"<i>terpaling</i>\" dan \"<i>ytjt</i>\", iaitu \"yang tahu, tahu je\". Fenomena ini "
                     "juga sudah dikaji. <b>Nor Alia Nadia Husain dan Nora'Azian Nahar (2025)</b> dalam <i>LSP International "
                     "Journal</i> meneliti 13 sesi siaran langsung jual beli di TikTok."))
story.append(say(H3, "Apakah dapatan mereka, Ammar?"))
story.append(say(H2, "Mereka mendapati slanga seperti \"<i>kautim</i>\" dan \"<i>skoda</i>\" memudahkan komunikasi dengan pembeli "
                     "tetap, tetapi mengelirukan pembeli baharu kerana tafsirannya berbeza-beza. Saya sendiri pernah terpaksa "
                     "membaca ruangan komen untuk memahami maksud \"kautim\", iaitu urusan sudah selesai."))
story.append(say(H3, "Kajian yang sama mencadangkan agar penjual menyediakan glosari ringkas slanga supaya komunikasi lebih "
                     "inklusif. Ini menunjukkan bahawa pengkaji pun mengakui kewujudan jurang pemahaman."))
story.append(say(H1, "Maknanya, bahasa yang rancu bukan sahaja isu tatabahasa. Bahasa itu juga boleh menyebabkan mesej tidak sampai "
                     "kepada pendengar. Baiklah, mari kita masuk ke segmen kegemaran saya!"))

story += bar("SEGMEN 3 · BEDAH AYAT TIKTOK  (3:15 – 6:45)")
story.append(cue("Kesan bunyi \"ting!\" setiap kali contoh baharu dibacakan"))
story.append(say(H2, "Contoh pertama, daripada kapsyen yang sangat biasa: \"<b>POV: kau baru sampai sekolah lepas cuti panjang.</b>\""))
story.append(say(H3, "Dari segi sintaksis, \"POV\" ialah singkatan Inggeris, <i>point of view</i>, yang diletakkan di hadapan "
                     "seolah-olah subjek. Selepas itu, binaannya tergantung kerana tiada predikat yang lengkap. Ayat yang "
                     "gramatis ialah: <b>\"Bayangkan anda baru tiba di sekolah selepas cuti panjang.\"</b>"))
story.append(say(H3, "Contoh kedua, daripada video tayangan pakaian: \"<b>Outfit dia hari ni, ate and left no crumbs!</b>\""))
story.append(say(H1, "Ini campur kod pada peringkat klausa. Separuh ayat dalam bahasa Melayu, separuh lagi klausa Inggeris yang "
                     "lengkap, jadi ayat ini tiada predikat Melayu. Pembetulannya: <b>\"Pakaiannya hari ini sungguh sempurna!\"</b> "
                     "Pendek, tepat dan tetap bertenaga."))
story.append(say(H1, "Contoh ketiga: \"<b>Dia ni terpaling pandai dalam kelas.</b>\" Ammar, cuba kamu pula yang bedah."))
story.append(say(H2, "Baiklah! Inilah perkataan dalam judul kita. Menurut <b>Tatabahasa Dewan</b>, awalan <i>ter-</i> pada kata "
                     "adjektif sudah membawa makna paling, contohnya \"terpandai\". Apabila digabungkan dengan \"paling\", "
                     "terjadilah <b>kelewahan</b>. Pilih salah satu: <b>\"Dia paling pandai dalam kelas\"</b> atau <b>\"Dia "
                     "terpandai dalam kelas.\"</b>"))
story.append(say(H2, "Contoh keempat, yang selalu kita dengar dalam siaran langsung jual beli: \"<b>Ini live di mana saya jual "
                     "barang murah.</b>\""))
story.append(say(H3, "Ini pengaruh struktur bahasa Inggeris. Perkataan <i>\"where\"</i> diterjemahkan menjadi \"di mana\" dan "
                     "digunakan sebagai kata hubung relatif, sedangkan \"di mana\" ialah frasa tanya. Kata hubung relatif yang "
                     "betul ialah \"yang\": <b>\"Ini siaran langsung yang saya gunakan untuk menjual barang murah.\"</b>"))
story.append(say(H3, "Contoh kelima: \"<b>Video ni saya akan upload esok.</b>\""))
story.append(say(H1, "Selain \"upload\" yang ada padanannya, iaitu \"muat naik\", ayat ini melanggar peraturan <b>ayat pasif diri "
                     "pertama</b>. Kata bantu aspek seperti \"akan\" mesti hadir di hadapan kata ganti nama diri. Jadi, ayat yang "
                     "betul ialah: <b>\"Video ini akan saya muat naik esok.\"</b>"))
story.append(say(H1, "Contoh terakhir: \"<b>Ini saya punya first video, korang support tau!</b>\""))
story.append(say(H2, "Frasa \"saya punya video\" meniru struktur <i>\"my video\"</i> dan melanggar <b>Hukum D-M</b>, iaitu unsur "
                     "yang diterangkan mesti mendahului unsur yang menerangkan. Pembetulannya: <b>\"Ini video pertama saya. "
                     "Mohon sokongan kalian, ya!\"</b> Wah, enam ayat, enam kesalahan. Separuh kapsyen saya perlu disunting "
                     "semula! <i>(ketawa)</i>"))

story += bar("SEGMEN 4 · SALAH ATAU KREATIF?  (6:45 – 8:45)")
story.append(say(H1, "Namun, adakah semua ini salah? Ada pendengar yang mungkin berkata, \"Alah, di TikTok sahaja. Bahasa "
                     "memang berkembang.\" Ammar, apakah pendapat kamu sebagai warganet?"))
story.append(say(H2, "Jujurnya, saya rasa slanga membuatkan kita rasa rapat. Apabila seseorang menulis \"ytjt\", kita terus rasa "
                     "satu geng. Jadi, ada nilai identiti di situ."))
story.append(say(H1, "Saya faham, Ammar. Tetapi bagaimana pula dengan generasi ibu bapa kita? Mak saya pernah bertanya "
                     "mengapa saya kata makanannya \"<i>mid</i>\". Beliau ingat saya memuji!"))
story.append(say(H3, "<i>(ketawa)</i> Padahal \"mid\" bermaksud biasa-biasa sahaja! Pandangan Ammar tadi sebenarnya ada asasnya. "
                     "Dalam laporan <b>Malay Mail (Oktober 2025)</b>, <b>Profesor Emeritus Datuk Dr. Nik Safiah Karim</b> "
                     "berpendapat bahawa slanga ialah tanda bahasa itu hidup. Akan tetapi, beliau menegaskan bahawa slanga tidak "
                     "sesuai digunakan dalam surat permohonan kerja, ucapan rasmi atau penulisan formal."))
story.append(say(H1, "Jadi, kata kuncinya ialah <b>laras bahasa</b>. Masalahnya bukan slanga itu wujud, tetapi apabila kita tidak "
                     "dapat membezakan konteks."))
story.append(say(H2, "Saya setuju. Saya nampak tiga kesan yang membimbangkan. Pertama, struktur ayat Inggeris seperti \"di mana\" "
                     "dan \"saya punya\" mula meresap ke dalam karangan murid. Kedua, perbendaharaan kata menjadi sempit kerana "
                     "semua perkara digambarkan dengan satu perkataan. Ketiga, martabat bahasa Melayu sebagai bahasa kebangsaan "
                     "di bawah <b>Perkara 152 Perlembagaan Persekutuan</b> boleh terhakis secara senyap."))
story.append(say(H3, "Kalau begitu, punca utamanya apa? Algoritma TikTok?"))
story.append(say(H1, "Algoritma hanya sebahagian daripadanya. Puncanya termasuk keinginan untuk tular, had masa video yang pendek, "
                     "pengaruh kandungan luar negara, dan kurangnya teladan bahasa yang baik. Pempengaruh yang mempunyai "
                     "jutaan pengikut sebenarnya memikul tanggungjawab yang besar."))
story.append(say(H3, "Sebenarnya, ada juga pencipta kandungan yang tular kerana menggunakan bahasa Melayu yang indah. Jadi, bahasa "
                     "yang betul tidak semestinya membosankan."))
story.append(say(H2, "Betul. Kreativiti tidak semestinya memerlukan slanga. Peribahasa, pantun dan kiasan Melayu pun boleh "
                     "menjadi kandungan yang tular jika disampaikan dengan cara yang lucu dan segar. Pantun kita tadi pun boleh "
                     "dijadikan video TikTok!"))

story += bar("SEGMEN 5 · BILIK DARJAH  (8:45 – 10:15)")
story.append(say(H3, "Sebagai bakal guru Bahasa Melayu, bagaimanakah kita boleh memanfaatkan isu ini di dalam bilik darjah?"))
story.append(say(H1, "Saya mencadangkan aktiviti <b>\"Detektif Kapsyen\"</b>. Guru memaparkan tangkap layar kapsyen TikTok "
                     "dengan nama pengguna dikaburkan. Kemudian, murid secara berkumpulan mengenal pasti kesalahan sintaksis "
                     "dan membina semula ayat yang gramatis."))
story.append(say(H2, "Boleh juga buat cabaran <b>\"Alih Laras\"</b>. Murid diberikan satu ayat slanga, kemudian mereka menukarnya "
                     "kepada laras formal untuk surat rasmi dan laras santai yang masih gramatis untuk media sosial. Lebih baik "
                     "lagi kalau mereka menghasilkan video TikTok sendiri dalam bahasa Melayu yang betul."))
story.append(say(H3, "Guru juga perlu mengajar murid tentang padanan istilah. Dewan Bahasa dan Pustaka telah menyediakan banyak "
                     "padanan, misalnya \"muat naik\" untuk <i>upload</i>, \"siaran langsung\" untuk <i>live</i> dan \"tular\" "
                     "untuk <i>viral</i>. Murid boleh menyemaknya melalui laman Pusat Rujukan Persuratan Melayu (PRPM). "
                     "Pendekatan ini selari dengan pembelajaran abad ke-21 kerana guru tidak sekadar melarang, tetapi mengajar "
                     "murid memilih bahasa mengikut konteks."))
story.append(say(H2, "Jangan lupa juga, guru sendiri perlu menjadi teladan. Jika guru menulis hantaran di kumpulan WhatsApp "
                     "kelas dengan bahasa yang rancu, murid pun akan meniru."))
story.append(say(H1, "Setuju. Bahasa yang baik bermula daripada contoh yang baik, sama ada di bilik darjah mahupun di media "
                     "sosial."))

story += bar("SEGMEN 6 · PENUTUP  (10:15 – 11:30)")
story.append(say(H2, "Jadi, kesimpulannya, kita tidak perlu memadamkan aplikasi TikTok, tetapi kita perlu lebih bijak berbahasa, bukan?"))
story.append(say(H3, "Betul. Pesanan saya mudah: gunakan TikTok untuk berkongsi, tetapi jangan biarkan TikTok menulis semula "
                     "tatabahasa kita. Sebelum memuat naik kapsyen, tanya diri sendiri: adakah ayat ini lengkap, adakah susunannya "
                     "betul, dan adakah ada padanan bahasa Melayu untuk perkataan Inggeris ini?"))
story.append(say(H1, "Kepada semua pendengar, mari kita jadikan bahasa Melayu yang betul dan gramatis sebagai \"trend\" yang "
                     "sebenar. Bahasa jiwa bangsa. Jika bukan kita yang memartabatkannya, siapa lagi?"))
story.append(say(H2, "Sebagai penutup, kami bertiga mempersembahkan serangkap pantun."))
story.append(KeepTogether([say(H3, "<i>(berpantun, semua menyambung baris)</i>"),
                           box(P("Dari Melaka ke Kuala Kangsar,<br/>Singgah sebentar membeli kopi;<br/>"
                                 "Bahasa yang baik, bahasa yang benar,<br/>Bahasa Melayu kita junjung tinggi.", "pantun"), bg=CREAM),
                           Spacer(1, 4)]))
story.append(say(H3, "Contoh dalam episod ini dipetik daripada kandungan awam TikTok dan kajian ilmiah untuk tujuan pendidikan "
                     "sahaja. Semua hak cipta kekal milik pencipta asal, dan senarai rujukan kami sertakan bersama. Muzik latar "
                     "episod ini ialah muzik bebas hak cipta."))
story.append(say(H2, "Kalau episod ini bermanfaat, jangan lupa tekan butang <b>suka</b> dan kongsikan dengan rakan-rakan!"))
story.append(say(H1, "Jumpa lagi dalam episod Podcast Tengah Jalan yang akan datang. Jaga diri, jaga bahasa! Assalamualaikum "
                     "dan selamat sejahtera!"))
story.append(cue("Muzik latar dinaikkan semula dan audio dipudarkan"))
story.append(PageBreak())

# ===== 4. Bukti autentik =====
story.append(P("4. Bukti Autentik: Contoh TikTok dan Pautan", "h1"))
story.append(P("Pautan di bawah ialah kandungan TikTok awam yang membincangkan atau menggunakan slanga Gen Z di Malaysia. "
               "Gunakannya sebagai bukti semasa rakaman (contohnya, \"dalam satu video oleh akaun @hitzdotmy...\"). "
               "<b>Nota:</b> pautan TikTok boleh tamat jika pemilik memadam atau menukar tetapan privasi, jadi sila semak "
               "pautan sebelum menghantar tugasan."))
link = lambda u: f"<link href='{u}' color='#E03A2F'><u>{u}</u></link>"
rows = [["Bil.", "Kandungan TikTok", "Unsur bahasa yang ditonjolkan"],
        ["1", "Halaman koleksi video \"Gen Z Slang in Malay\"<br/>" + link("https://www.tiktok.com/discover/gen-z-slang-in-malay"),
         "Kumpulan video tentang slanga Gen Z dalam bahasa Melayu"],
        ["2", "Halaman koleksi video \"Malay Gen Z Slang\"<br/>" + link("https://www.tiktok.com/discover/malay-gen-z-slang"),
         "Slanga seperti \"abuden\", \"gostan\", \"pargoy\""],
        ["3", "Halaman temu ramah jalanan tentang slanga Gen Z di Malaysia<br/>"
              + link("https://www.tiktok.com/discover/malaysia-street-interview-gen-z-slang"),
         "Bukti penggunaan slanga dalam komunikasi lisan sebenar"],
        ["4", "@hitzdotmy – \"Gen Z Slang: What Does 'Chat' Mean?\"<br/>"
              + link("https://www.tiktok.com/@hitzdotmy/video/7390332789540932872"),
         "Peluasan makna kata pinjaman \"chat\""],
        ["5", "@sir_sempoi – \"Gatekeeping\". A Gen Z slang. Maksudnya apa?<br/>"
              + link("https://www.tiktok.com/@sir_sempoi/video/7339028235906338050"),
         "Campur kod dalam kapsyen (\"A Gen Z slang. Maksudnya apa??\")"],
        ["6", "@ajerahtv – POV: budak salah faham maksud \"kacip\"<br/>"
              + link("https://www.tiktok.com/@ajerahtv/video/7580656579943419144"),
         "Format \"POV\" dan perubahan makna \"kacip\" (\"borak kacip\" = cakap kosong)"],
        ["7", "@leonngcaho87 – Malaysian slang word: \"Tiaw\"<br/>"
              + link("https://www.tiktok.com/@leonngcaho87/video/7382952221123693831"),
         "Slanga tempatan dalam komunikasi harian"],
        ["8", "Tanda pagar #pov dan #fypmalaysia<br/>" + link("https://www.tiktok.com/tag/pov") + "<br/>"
              + link("https://www.tiktok.com/tag/fypmalaysia"),
         "Sumber kapsyen sebenar untuk aktiviti \"Detektif Kapsyen\""]]
rows = [[P(c, "smallb" if i == 0 else "small") for c in r] for i, r in enumerate(rows)]
t = Table(rows, colWidths=[10 * mm, 100 * mm, 64 * mm], repeatRows=1)
t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), PINK), ("GRID", (0, 0), (-1, -1), 0.4, TERRA),
                       ("VALIGN", (0, 0), (-1, -1), "TOP"), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CREAM])]))
story.append(t)

story.append(Spacer(1, 10))
story.append(P("<b>Ringkasan analisis sintaksis yang dibincangkan dalam skrip</b>"))
rows = [["Ayat bahasa TikTok", "Jenis kerancuan", "Ayat gramatis"],
        ["POV: kau baru sampai sekolah lepas cuti panjang.", "Singkatan Inggeris + ayat tergantung (tiada predikat)", "Bayangkan anda baru tiba di sekolah selepas cuti panjang."],
        ["Outfit dia hari ni, ate and left no crumbs!", "Campur kod peringkat klausa", "Pakaiannya hari ini sungguh sempurna!"],
        ["Dia ni terpaling pandai dalam kelas.", "Kelewahan (ter- + paling)", "Dia paling pandai / terpandai dalam kelas."],
        ["Ini live di mana saya jual barang murah.", "\"Di mana\" sebagai kata hubung relatif (pengaruh where)", "Ini siaran langsung yang saya gunakan untuk menjual barang murah."],
        ["Video ni saya akan upload esok.", "Susunan ayat pasif diri pertama salah", "Video ini akan saya muat naik esok."],
        ["Ini saya punya first video, korang support tau!", "Melanggar Hukum D-M (pengaruh my video)", "Ini video pertama saya. Mohon sokongan kalian, ya!"]]
rows = [[P(c, "smallb" if i == 0 else "small") for c in r] for i, r in enumerate(rows)]
rows = [[r[0], r[1], r[2]] for r in rows]
t = Table(rows, colWidths=[58 * mm, 54 * mm, 62 * mm], repeatRows=1)
t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), PINK), ("GRID", (0, 0), (-1, -1), 0.4, TERRA),
                       ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TEXTCOLOR", (2, 1), (2, -1), GREEN),
                       ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CREAM])]))
story.append(t)
story.append(P("<i>Ayat contoh dalam jadual ini mewakili pola kapsyen yang lazim di TikTok. Untuk bukti yang lebih kukuh, "
               "kumpulan anda boleh menggantikannya dengan tangkap layar kapsyen sebenar daripada pautan di atas "
               "(kaburkan nama pengguna).</i>", "small"))
story.append(PageBreak())

# ===== 5. Semakan ciri =====
story.append(P("5. Semakan Ciri-ciri Audio Siar Akademik", "h1"))
rows = [["Ciri", "Bagaimana skrip memenuhinya"],
        ["Ketepatan ilmu", "Takrif \"rancu\" (Kamus Dewan) dan \"slanga\" (Kamus Bahasa Melayu Nusantara); analisis berdasarkan "
                           "Tatabahasa Dewan: ayat tergantung, kelewahan, kata hubung relatif \"yang\", ayat pasif diri pertama, Hukum D-M."],
        ["Bukti autentik", "Enam contoh kapsyen bergaya TikTok, lapan pautan TikTok awam, dan dapatan kajian Husain & Nahar (2025) "
                           "tentang 13 sesi siaran langsung jual beli di TikTok."],
        ["Pemikiran kritis", "Segmen 4 menimbang dua pandangan (slanga sebagai identiti lawan ancaman), memetik pandangan "
                             "Prof. Emeritus Nik Safiah Karim, dan menghuraikan punca serta tiga kesan kerancuan."],
        ["Aplikasi pedagogi", "Segmen 5 mencadangkan aktiviti \"Detektif Kapsyen\" dan \"Alih Laras\" serta penghasilan video "
                              "TikTok dalam bahasa Melayu yang gramatis."],
        ["Etika akademik", "Sumber disebut secara lisan, nama pengguna dikaburkan dalam aktiviti, kenyataan hak cipta dan "
                           "muzik bebas hak cipta dinyatakan pada penutup, dan senarai rujukan disertakan."]]
rows = [[P(c, "smallb" if (i == 0 or j == 0) else "small") for j, c in enumerate(r)] for i, r in enumerate(rows)]
t = Table(rows, colWidths=[36 * mm, 138 * mm])
t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), PINK), ("GRID", (0, 0), (-1, -1), 0.4, TERRA),
                       ("VALIGN", (0, 0), (-1, -1), "TOP"), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CREAM])]))
story.append(t)

# ===== 6. Rujukan =====
story.append(P("6. Rujukan", "h1"))
refs = [
    "Dewan Bahasa dan Pustaka. (2005). <i>Kamus Dewan</i> (Edisi Keempat). Kuala Lumpur: Dewan Bahasa dan Pustaka.",
    "Nik Safiah Karim, Farid M. Onn, Hashim Haji Musa, &amp; Abdul Hamid Mahmood. (2015). <i>Tatabahasa Dewan</i> "
    "(Edisi Ketiga). Kuala Lumpur: Dewan Bahasa dan Pustaka.",
    "<i>Kamus Bahasa Melayu Nusantara</i>. (2003). Brunei Darussalam: Dewan Bahasa dan Pustaka Brunei.",
    "Nor Alia Nadia Husain, &amp; Nora'Azian Nahar. (2025). Penggunaan slanga dalam urusan jual beli di TikTok. "
    "<i>LSP International Journal, 12</i>(1). https://doi.org/10.11113/lspi.v12.24433 — "
    + link("https://journals.utm.my/lsp/article/view/24433"),
    "Malay Mail. (2025, 7 Oktober). Linguists weigh in on fast-evolving slang Malaysian youth are creating online. "
    + link("https://www.malaymail.com/news/malaysia/2025/10/07/linguists-weigh-in-on-fast-evolving-slang-malaysian-youth-are-creating-online-that-leaves-boomers-scratching-their-heads/191552"),
    "Perlembagaan Persekutuan Malaysia, Perkara 152 (Bahasa Kebangsaan).",
    "Kandungan TikTok seperti yang disenaraikan dalam Bahagian 4 (diakses pada 19 November 2026).",
]
for i, r in enumerate(refs, 1):
    story.append(Paragraph(r, ParagraphStyle("ref", parent=S["small"], leftIndent=14, firstLineIndent=-14, spaceAfter=5)))

# ===== 7. Tip =====
story.append(P("7. Tip Rakaman untuk Mendapat Lebih Banyak \"Suka\"", "h1"))
for tip in ["Baca skrip dua kali sebelum merakam supaya nada kedengaran seperti berbual, bukan membaca. Ketawa dan "
            "reaksi kecil (\"Betul!\", \"Wah!\") boleh ditambah secara spontan.",
            "Ulang baris pantun dengan rentak yang perlahan; pantun ialah \"cangkuk\" pada 30 saat pertama.",
            "Gunakan muzik latar bebas hak cipta (contohnya daripada Pustaka Audio YouTube) dan nyatakannya dalam kapsyen.",
            "Jika dimuat naik ke TikTok atau Instagram, potong Segmen 3 (Bedah Ayat TikTok) sebagai klip promosi berdurasi 60 saat.",
            "Gunakan kapsyen yang gramatis sendiri, contohnya: \"Slay atau salah? Kami bedah enam ayat TikTok yang rancu. "
            "Berapa banyak yang anda pernah gunakan?\"",
            "Masa sasaran: bacaan santai sekitar 140–150 patah perkataan seminit menghasilkan kira-kira 11 minit. Jika terlalu "
            "pendek, panjangkan perbincangan spontan dalam Segmen 4; jika terlalu panjang, buang satu contoh dalam Segmen 3."]:
    story.append(P("•&nbsp;&nbsp;" + tip))

# ---------------- Templat halaman ----------------
def on_page(c, doc):
    c.saveState()
    c.setFillColor(CREAM); c.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
    c.setFillColor(TERRA); c.circle(A4[0] - 5 * mm, A4[1] - 5 * mm, 22 * mm, fill=1, stroke=0)
    c.setStrokeColor(PINK); c.setLineWidth(2)
    c.circle(A4[0] - 5 * mm, A4[1] - 5 * mm, 28 * mm, fill=0, stroke=1)
    c.setFillColor(PINK); c.circle(4 * mm, 20 * mm, 18 * mm, fill=1, stroke=0)
    for i in range(3):
        for j in range(3):
            c.circle(A4[0] - (10 + i * 6) * mm, (10 + j * 6) * mm, 1.6 * mm, fill=1, stroke=0)
    if doc.page > 1:
        c.setFont("Sans", 7.5); c.setFillColor(GREY)
        c.drawString(18 * mm, 10 * mm, "Podcast Tengah Jalan  ·  Slay atau Salah? Bila Bahasa Kita Terpaling Rancu di TikTok")
        c.drawRightString(A4[0] - 30 * mm, 10 * mm, f"{doc.page}")
    c.restoreState()

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Skrip_Podcast_Slay_atau_Salah.pdf")
doc = BaseDocTemplate(out, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm, bottomMargin=18 * mm,
                      title="Podcast Tengah Jalan: Slay atau Salah? Bila Bahasa Kita Terpaling Rancu di TikTok",
                      author="Aliff, Ammar dan Iman", subject="Kerancuan Bahasa - Bahasa TikTok")
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="f")
doc.addPageTemplates([PageTemplate(id="p", frames=[frame], onPage=on_page)])
doc.build(story)
print(out)
