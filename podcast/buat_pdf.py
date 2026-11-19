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
    [P("<b>Durasi</b>", "smallb"), P("± 12 minit (kira-kira 1,600 patah perkataan dialog termasuk pantun; banyak soal jawab pendek, jadi bacaan santai mengambil masa sekitar 12 minit)", "small")],
    [P("<b>Penutur</b>", "smallb"), P("ALIFF (Hos 1 – pengacara utama) · AMMAR (Hos 2 – \"suara warganet\") · "
                                      "IMAN (Hos 3 – \"detektif sintaksis\"). Dialog dibahagikan sama rata: setiap penutur "
                                      "bercakap kira-kira 520–540 patah perkataan dan mengetuai perbincangan "
                                      "analisis satu daripada tiga ayat TikTok (Iman: ayat 1, Aliff: ayat 2, Ammar: ayat 3).", "small")],
    [P("<b>Isi kandungan</b>", "smallb"), P("1. Judul alternatif  ·  2. Struktur & masa  ·  3. Skrip penuh  ·  "
                                            "4. Ringkasan analisis sintaksis tiga ayat  ·  5. Bukti autentik: pautan TikTok  ·  "
                                            "6. Semakan ciri audio siar akademik  ·  7. Rujukan  ·  8. Tip rakaman", "small")],
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
story.append(P("Episod ini menganalisis <b>tiga ayat bergaya TikTok</b> dari sudut sintaksis: struktur subjek dan predikat, "
               "binaan frasa, jenis ayat, kesalahan, dan ayat gramatis sebagai ganti. Setiap penutur mengetuai analisis satu ayat."))
seg = [["Masa", "Segmen", "Fokus", "Ciri akademik"],
       ["0:00 – 1:30", "Pembukaan", "Pengenalan Podcast Tengah Jalan, pantun Aliff & Ammar, topik episod", "–"],
       ["1:30 – 3:00", "Bahasa TikTok & sintaksis", "Maksud rancu, apa itu sintaksis, bagaimana bahasa TikTok menjejaskan ayat", "Ketepatan ilmu"],
       ["3:00 – 5:30", "Ayat 1 (Iman)", "\"POV: kau first time masuk kelas Cikgu Bahasa Melayu.\"", "Ketepatan ilmu, bukti autentik"],
       ["5:30 – 8:00", "Ayat 2 (Aliff)", "\"Outfit dia hari ni slay gila, confirm ramai yang jealous!\"", "Ketepatan ilmu, bukti autentik"],
       ["8:00 – 10:15", "Ayat 3 (Ammar)", "\"Dia ni terpaling alim, semua orang dia tegur.\"", "Ketepatan ilmu, bukti autentik"],
       ["10:15 – 11:15", "Salah atau kreatif? & bilik darjah", "Laras bahasa, kesan, aktiviti pengajaran", "Pemikiran kritis, aplikasi pedagogi"],
       ["11:15 – 12:00", "Penutup", "Seruan berbahasa gramatis, pantun, kredit", "Etika akademik"]]
seg = [[P(c, "smallb" if i == 0 else "small") for c in r] for i, r in enumerate(seg)]
t = Table(seg, colWidths=[24 * mm, 38 * mm, 66 * mm, 46 * mm])
t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), PINK), ("GRID", (0, 0), (-1, -1), 0.4, TERRA),
                       ("VALIGN", (0, 0), (-1, -1), "TOP"), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CREAM])]))
story.append(t)
story.append(Spacer(1, 6))
story.append(P("<i>Nota bahasa: Skrip ditulis dalam bahasa Melayu gramatis tetapi bernada santai. Ayat bahasa TikTok yang "
               "muncul hanya dipetik sebagai <b>contoh yang dianalisis</b> dan ditandakan dengan tanda petik.</i>", "small"))
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
story.append(say(H3, "Cantik! Saya hampir sebut pantun kamu berdua \"<i>slay</i>\", tetapi hari ini kita kena jaga bahasa. "
                     "<i>(ketawa)</i> Saya Iman. Jadi, Aliff, apakah topik kita di Podcast Tengah Jalan kali ini?"))
story.append(say(H1, "Episod kali ini bertajuk <b>\"Slay atau Salah? Bila Bahasa Kita Terpaling Rancu di TikTok\"</b>. Kita "
                     "tidak akan membawa senarai slanga yang panjang. Sebaliknya, kita akan membedah <b>tiga ayat</b> yang "
                     "selalu kita jumpa di TikTok, satu demi satu, dari sudut sintaksis."))

story += bar("SEGMEN 2 · BAHASA TIKTOK DAN SINTAKSIS  (1:30 – 3:00)")
story.append(say(H2, "Iman, sebelum kita mula, apa sebenarnya maksud \"rancu\"? Bunyinya seperti nama kuih."))
story.append(say(H3, "<i>(ketawa)</i> Bukan kuih, Ammar! Menurut <b>Kamus Dewan Edisi Keempat (2005)</b>, \"rancu\" bermaksud "
                     "bercampur aduk atau kacau dalam penggunaan bahasa. Bayangkan ayat itu seperti bilik yang bersepah. Semua "
                     "barang ada, tetapi tidak berada di tempatnya."))
story.append(say(H1, "Analogi yang bagus! Sintaksis pula ialah ilmu tentang cara kita menyusun perkataan menjadi ayat. Senang "
                     "sahaja. Setiap ayat ada dua bahagian. Satu bahagian ialah <b>subjek</b>, iaitu siapa atau apa yang kita "
                     "cakapkan. Satu bahagian lagi ialah <b>predikat</b>, iaitu cerita tentang subjek itu. Hal ini dijelaskan "
                     "dalam <b>Tatabahasa Dewan (2008)</b>."))
story.append(say(H2, "Boleh beri contoh?"))
story.append(say(H1, "Contohnya, \"Adik menangis.\" Siapa yang kita cakapkan? Adik, itu subjeknya. Apa cerita tentang adik? "
                     "Menangis, itu predikatnya."))
story.append(say(H2, "Oh, senang! Kalau begitu, \"Ammar makan nasi lemak\" pun ada subjek dan predikat. Subjeknya Ammar, "
                     "predikatnya makan nasi lemak. Jadi, hari ini kita main permainan \"cari subjek, cari predikat\" dengan ayat TikTok?"))
story.append(say(H3, "Tepat! Kalau salah satu bahagian itu hilang atau tersusun salah, di situlah kerancuan berlaku. Kapsyen "
                     "TikTok ditulis dengan laju, jadi perkara ini selalu terjadi tanpa kita sedari."))
story.append(say(H1, "Baiklah, mari kita mulakan! Kita ada tiga ayat, dan setiap orang akan membawa satu."))

story += bar("SEGMEN 3 · AYAT 1: \"POV\"  (3:00 – 5:30)")
story.append(cue("Kesan bunyi \"ting!\""))
story.append(say(H3, "Untuk permulaan, saya bawa kapsyen kegemaran warganet: \"<b>POV: kau first time masuk kelas Cikgu Bahasa "
                     "Melayu.</b>\" Kapsyen begini biasanya muncul pada video yang meminta kita membayangkan diri dalam situasi itu."))
story.append(say(H2, "Saya selalu tulis begitu! Semua orang faham, apa salahnya?"))
story.append(say(H3, "Faham memang faham. Mari kita main \"cari subjek, cari predikat\". Siapa yang masuk kelas?"))
story.append(say(H2, "Kau!"))
story.append(say(H3, "Betul, itu subjeknya. Apa yang kau buat?"))
story.append(say(H1, "Masuk kelas. Itu predikatnya."))
story.append(say(H3, "Bagus! Jadi, bahagian \"kau masuk kelas\" sudah lengkap. Masalahnya ialah perkataan \"POV\" di hadapan. Ia "
                     "bukan subjek dan bukan predikat. Ia seperti tetamu yang berdiri di depan pintu tetapi tidak masuk ke dalam "
                     "rumah. Dalam tatabahasa, binaan begini dipanggil <b>tergantung</b>."))
story.append(say(H1, "Tetamu di depan pintu! <i>(ketawa)</i> Ada masalah lain?"))
story.append(say(H3, "Ada. Selain itu, frasa \"first time\" terselit di tengah ayat. Frasa ini memberitahu bila perkara itu "
                     "berlaku, tetapi dalam bahasa Inggeris. Itulah <b>campur kod</b>. Satu lagi, \"masuk kelas\" lebih tepat "
                     "ditulis \"masuk ke kelas\", kerana \"ke\" menunjukkan arah."))
story.append(say(H2, "Banyaknya masalah dalam satu kapsyen yang pendek! Jadi, bagaimana hendak membetulkannya?"))
story.append(say(H3, "Mudah sahaja. Tukar \"POV\" kepada perkataan yang benar-benar menjalankan tugasnya, iaitu \"bayangkan\". "
                     "Jadi, ayatnya: <b>\"Bayangkan anda masuk ke kelas guru Bahasa Melayu buat kali pertama.\"</b>"))
story.append(say(H1, "Oh, jadi \"bayangkan\" itu memberi arahan kepada penonton. Tetamu tadi sudah masuk ke dalam rumah!"))
story.append(say(H3, "<i>(ketawa)</i> Betul! Ayat ini ialah ayat perintah, iaitu ayat yang menyuruh. \"Buat kali pertama\" pula "
                     "menggantikan \"first time\" dan diletakkan di hujung ayat."))
story.append(say(H2, "Bagaimana pula dengan kapsyen \"POV: mak kau nampak result SPM kau\"? Yang ini lebih memeningkan. Siapa "
                     "sebenarnya yang sedang melihat?"))
story.append(say(H3, "Itulah masalahnya, pembaca terpaksa meneka. Ayat yang jelas ialah: <b>\"Bayangkan anda seorang ibu yang "
                     "sedang melihat keputusan SPM anak anda.\"</b> Panjang sedikit, tetapi semua orang tahu siapa buat apa."))
story.append(say(H2, "Nampaknya saya perlu menyunting semula separuh kapsyen dalam akaun saya! <i>(ketawa)</i>"))

story += bar("SEGMEN 4 · AYAT 2: \"SLAY\"  (5:30 – 8:00)")
story.append(cue("Kesan bunyi \"ting!\""))
story.append(say(H1, "Seterusnya, giliran saya. Ayat ini selalu muncul dalam ruangan komen video tayangan pakaian: \"<b>Outfit dia "
                     "hari ni slay gila, confirm ramai yang jealous!</b>\" Tahukah kamu, dalam kamus bahasa Inggeris, \"slay\" "
                     "sebenarnya bermaksud membunuh?"))
story.append(say(H3, "<i>(ketawa)</i> Jadi, kita memuji pakaian itu dengan berkata pakaian itu membunuh! Baiklah, mari kita main "
                     "\"cari subjek, cari predikat\" sekali lagi."))
story.append(say(H1, "Mula-mula, perhatikan tanda koma di tengah ayat. Sebenarnya ini dua ayat kecil yang dicantumkan begitu sahaja, "
                     "tanpa kata penyambung. Mari kita lihat bahagian sebelum koma: \"Outfit dia hari ni slay gila.\" Apa yang "
                     "kita cakapkan?"))
story.append(say(H2, "Outfit dia. Itu subjeknya."))
story.append(say(H1, "Betul. Apa ceritanya?"))
story.append(say(H2, "Slay gila. Eh, apabila saya sebut kuat-kuat, baru saya perasan bunyinya pelik!"))
story.append(say(H1, "Di sinilah masalahnya. \"Slay\" ialah kata kerja dalam bahasa Inggeris, tetapi di sini ia digunakan sebagai "
                     "kata sifat untuk menerangkan pakaian. \"Gila\" pula hanya sesuai dalam perbualan tidak rasmi. Di samping "
                     "itu, \"hari ni\" terselit di dalam subjek, padahal tempatnya di hujung ayat."))
story.append(say(H3, "Bagaimana dengan bahagian selepas koma, \"confirm ramai yang jealous\"?"))
story.append(say(H1, "Yang ini lebih kabur. Siapa yang cemburu? Perkataan \"orang\" hilang, jadi subjeknya tidak jelas. "
                     "\"Confirm\" pula sepatutnya \"pasti\"."))
story.append(say(H2, "Betul juga. Dalam komen, kita jarang menulis subjek kerana kita anggap orang sudah faham. Jadi, apakah "
                     "ayat yang betul?"))
story.append(say(H1, "<b>\"Pakaiannya sungguh hebat hari ini, dan pasti ramai orang berasa cemburu.\"</b> Sekarang kedua-dua ayat "
                     "kecil itu lengkap. Sebelum koma, subjeknya \"pakaiannya\" dan predikatnya \"sungguh hebat\". Selepas koma, "
                     "subjeknya \"ramai orang\" dan predikatnya \"berasa cemburu\". Kedua-duanya disambung dengan \"dan\"."))
story.append(say(H2, "Tetapi \"slay\" pendek dan bertenaga. \"Sungguh hebat\" terasa panjang untuk ruangan komen."))
story.append(say(H3, "Kalau mahu pendek, tulis sahaja \"Hebat!\" atau \"Menawan!\". Satu perkataan pun boleh menjadi ayat seruan "
                     "yang betul. Pendek, bertenaga dan tetap gramatis."))
story.append(say(H1, "Setuju. Jadi, masalahnya bukan bahasa Melayu tidak mempunyai perkataan yang pendek, tetapi kita "
                     "yang sudah terbiasa dengan perkataan Inggeris."))

story += bar("SEGMEN 5 · AYAT 3: \"TERPALING\"  (8:00 – 10:15)")
story.append(cue("Kesan bunyi \"ting!\""))
story.append(say(H2, "Akhir sekali, giliran saya! Ayat ini ada perkataan dalam judul kita: \"<b>Dia ni terpaling alim, semua "
                     "orang dia tegur.</b>\" Saya rasa semua orang pernah berjumpa ayat ini di ruangan komen. Ayat ini biasanya menyindir orang yang berlagak alim dan suka menegur semua orang."))
story.append(say(H1, "Saya mengaku, saya pernah menulis ayat seperti ini. <i>(ketawa)</i> Apa masalahnya, Ammar?"))
story.append(say(H2, "Sama seperti ayat Aliff tadi, ini pun dua ayat kecil yang dicantumkan dengan koma. Bahagian sebelum koma "
                     "ialah \"Dia ni terpaling alim\". Subjeknya \"dia\", predikatnya \"terpaling alim\". Masalahnya, \"ter-\" dan "
                     "\"paling\" membawa maksud yang sama. Bayangkan kita berkata \"naik ke atas\". Naik memang ke atas! Jadi, "
                     "cukup sebut \"paling alim\"."))
story.append(say(H3, "Contoh \"naik ke atas\" itu memang mudah difahami! Inilah yang dipanggil <b>kelewahan</b>, iaitu maksud yang "
                     "diulang dua kali. Bagaimana pula dengan \"semua orang dia tegur\"?"))
story.append(say(H2, "Yang ini lebih licik. Susunan begini hanya betul jika pelakunya \"saya\" atau \"kamu\". Contohnya, "
                     "\"Semua orang saya tegur\" betul. Tetapi jika pelakunya \"dia\", kata kerjanya mesti ada \"di-\", jadi "
                     "\"semua orang ditegurnya\". Cuba bandingkan. \"Buku itu saya baca\" betul. \"Buku itu kamu baca\" pun "
                     "betul. Tetapi \"Buku itu dia baca\" salah. Yang betul ialah \"Buku itu dibacanya\"."))
story.append(say(H1, "Wah, saya tidak pernah perasan! Jadi, \"saya tegur\" boleh, tetapi \"dia tegur\" tidak boleh dalam ayat begini?"))
story.append(say(H2, "Tepat. Ramai orang pun keliru tentang perkara ini, bukan di TikTok sahaja."))
story.append(say(H3, "Satu lagi, apakah hubungan antara dua bahagian itu? Dia berlagak alim, akibatnya dia menegur semua orang. "
                     "Jadi, kita perlukan kata penyambung yang menunjukkan akibat."))
story.append(say(H2, "Betul. Penyambung yang sesuai ialah \"sehingga\". Ayat penuhnya: <b>\"Dia berlagak paling alim sehingga "
                     "semua orang ditegurnya.\"</b> Perkataan \"berlagak\" pula mengekalkan nada sindiran."))
story.append(say(H1, "Menarik. Sindirannya masih ada, tetapi ayatnya gramatis. Kita tidak kehilangan apa-apa pun."))
story.append(say(H3, "Kalau tidak suka bentuk \"ditegurnya\", boleh juga tulis \"sehingga dia menegur semua orang\". "
                     "Kedua-duanya betul."))

story += bar("SEGMEN 6 · SALAH ATAU KREATIF?  (10:15 – 11:15)")
story.append(say(H2, "Tetapi, jujurnya, gaya bahasa begini membuatkan kita rasa rapat. Adakah semuanya salah?"))
story.append(say(H3, "Bahasa santai ada tempatnya, Ammar. Yang penting, kita tahu membezakan <b>laras bahasa</b>. Masalahnya "
                     "bermula apabila ayat tergantung seperti format POV dibawa ke dalam karangan atau surat rasmi."))
story.append(say(H1, "Betul. Bayangkan adik-adik kita menulis \"semua orang dia tegur\" dalam karangan peperiksaan. Pemeriksa "
                     "tentu akan memotong markah. Lebih membimbangkan, apabila sudah terbiasa, kita tidak lagi sedar bahawa "
                     "ayat itu salah."))
story.append(say(H2, "Sebagai bakal guru, kita boleh jadikan isu ini aktiviti <b>\"Detektif Kapsyen\"</b>. Murid mengumpulkan "
                     "kapsyen TikTok, mengaburkan nama pengguna, kemudian bermain \"cari subjek, cari predikat\" seperti yang "
                     "kita buat tadi."))
story.append(say(H3, "Seronok, dan murid belajar sintaksis daripada bahan yang dekat dengan mereka. Mereka juga sedar bahawa "
                     "santai tidak bermaksud rancu. Malah, guru boleh meminta murid membuat video TikTok sendiri dengan "
                     "kapsyen yang gramatis. Siapa tahu, mungkin tular!"))
story.append(say(H2, "Satu lagi aktiviti yang seronok ialah <b>\"Alih Laras\"</b>. Murid mengambil satu komen TikTok, "
                     "kemudian menukarnya kepada dua versi: versi formal untuk surat rasmi, dan versi santai yang masih "
                     "gramatis. Contohnya, \"Hebat sungguh pakaian awak hari ini!\" Santai, tetapi subjek dan predikatnya lengkap."))

story += bar("SEGMEN 7 · PENUTUP  (11:15 – 12:00)")
story.append(say(H1, "Kesimpulannya, kita hanya perlu ingat satu soalan mudah: di mana subjek, dan di mana predikat? Ayat POV "
                     "mengajar kita supaya ayat lengkap. Selain itu, ayat \"slay\" mengingatkan kita supaya menyambung ayat "
                     "dengan betul. Akhirnya, ayat \"terpaling\" mengajar kita supaya tidak mengulang maksud dan menyusun ayat "
                     "pasif dengan betul."))
story.append(say(H3, "Pesanan saya, sebelum menekan butang muat naik, baca kapsyen anda sekali lagi. Lima saat sahaja!"))
story.append(say(H2, "Kepada semua pendengar, mari kita jadikan bahasa Melayu yang betul dan gramatis sebagai \"trend\" yang "
                     "sebenar. Ingat, santai boleh, rancu jangan! Bahasa jiwa bangsa! Sebagai penutup, kami bertiga mempersembahkan serangkap pantun."))
story.append(KeepTogether([say(H3, "<i>(berpantun bersama, setiap orang menyambung satu baris)</i>"),
                           box(P("Pucuk paku di tepi perigi,<br/>Dipetik adik dibawa pulang;<br/>"
                                 "Kapsyen TikTok tulislah lagi,<br/>Subjek predikat jangan hilang.", "pantun"), bg=CREAM),
                           Spacer(1, 4)]))
story.append(say(H2, "Contoh dalam episod ini berdasarkan kandungan awam TikTok dan digunakan untuk tujuan pendidikan sahaja. "
                     "Hak cipta kekal milik pencipta asal. Muzik latar episod ini ialah muzik bebas hak cipta."))
story.append(say(H3, "Kalau episod ini bermanfaat, jangan lupa tekan butang <b>suka</b> dan kongsikan dengan rakan-rakan!"))
story.append(say(H1, "Jumpa lagi dalam episod Podcast Tengah Jalan yang akan datang. Jaga diri, jaga bahasa! Assalamualaikum "
                     "dan selamat sejahtera!"))
story.append(cue("Muzik latar dinaikkan semula dan audio dipudarkan"))
story.append(PageBreak())

# ===== 4. Analisis ayat =====
link = lambda u: f"<link href='{u}' color='#E03A2F'><u>{u}</u></link>"
story.append(P("4. Ringkasan Analisis Sintaksis Tiga Ayat", "h1"))
rows = [["", "Ayat TikTok", "Cari subjek & predikat", "Apa yang tidak kena", "Ayat gramatis"],
        ["1", "POV: kau first time masuk kelas Cikgu Bahasa Melayu.",
         "Subjek: kau<br/>Predikat: masuk kelas",
         "• \"POV\" tergantung, bukan subjek atau predikat<br/>• \"first time\" ialah campur kod<br/>"
         "• \"masuk kelas\" lebih tepat dengan \"ke\"",
         "Bayangkan anda masuk ke kelas guru Bahasa Melayu buat kali pertama.<br/><i>(ayat perintah)</i>"],
        ["2", "Outfit dia hari ni slay gila, confirm ramai yang jealous!",
         "Sebelum koma – Subjek: outfit dia; Predikat: slay gila<br/>Selepas koma – Subjek: tidak jelas",
         "• Dua ayat kecil dicantumkan dengan koma sahaja<br/>• \"slay\" (kata kerja Inggeris) dijadikan kata sifat<br/>"
         "• \"hari ni\" terselit dalam subjek<br/>• Perkataan \"orang\" hilang",
         "Pakaiannya sungguh hebat hari ini, dan pasti ramai orang berasa cemburu.<br/><i>(disambung dengan \"dan\")</i>"],
        ["3", "Dia ni terpaling alim, semua orang dia tegur.",
         "Sebelum koma – Subjek: dia; Predikat: terpaling alim<br/>Selepas koma – ayat pasif",
         "• \"ter-\" + \"paling\" mengulang maksud (kelewahan)<br/>• \"dia tegur\" salah; mesti \"ditegurnya\"<br/>"
         "• Tiada penyambung yang menunjukkan akibat",
         "Dia berlagak paling alim sehingga semua orang ditegurnya.<br/><i>(disambung dengan \"sehingga\")</i>"]]
rows = [[P(c, "smallb" if (i == 0 or j == 0) else "small") for j, c in enumerate(r)] for i, r in enumerate(rows)]
t = Table(rows, colWidths=[7 * mm, 36 * mm, 40 * mm, 50 * mm, 41 * mm], repeatRows=1)
t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), PINK), ("GRID", (0, 0), (-1, -1), 0.4, TERRA),
                       ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TEXTCOLOR", (4, 1), (4, -1), GREEN),
                       ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CREAM])]))
story.append(t)
story.append(P("<i>Ayat TikTok dalam jadual ini mewakili pola kapsyen dan komen yang lazim. Untuk bukti yang lebih kukuh, "
               "kumpulan anda boleh menggantikannya dengan tangkap layar sebenar daripada pautan di bawah (kaburkan nama "
               "pengguna).</i>", "small"))

story.append(P("5. Bukti Autentik: Contoh TikTok dan Pautan", "h1"))
story.append(P("<b>Nota:</b> pautan TikTok boleh tamat jika pemilik memadam video atau menukar tetapan privasi, jadi sila semak "
               "pautan sebelum menghantar tugasan."))
rows = [["Ayat", "Kandungan TikTok", "Tahun"],
        ["1 (POV)", "@herz_hq – Maksud & cara guna \"POV\" dalam video pendek Melayu<br/>"
                    + link("https://www.tiktok.com/@herz_hq/video/7648112268915363080"), "2026"],
        ["1 (POV)", "@wfsufina – Tip membuat kandungan POV di TikTok<br/>"
                    + link("https://www.tiktok.com/@wfsufina/video/7202526323594513691"), "2023"],
        ["2 (slay)", "@bharianmy (Berita Harian) – Bertanya warganet maksud \"slay\" dalam bahasa Malaysia<br/>"
                     + link("https://www.tiktok.com/@bharianmy/video/7323053715961728274"), "2024"],
        ["2 (slay)", "@sir_asai – What does slay mean in Malay?<br/>"
                     + link("https://www.tiktok.com/@sir_asai/video/7270487473795435794"), "2023"],
        ["3 (terpaling)", "Tanda pagar #terpaling<br/>" + link("https://www.tiktok.com/tag/terpaling"), "Diakses 2026"],
        ["Umum", "Halaman koleksi \"Gen Z Slang in Malay\"<br/>"
                 + link("https://www.tiktok.com/discover/gen-z-slang-in-malay"), "Diakses 2026"]]
rows = [[P(c, "smallb" if (i == 0 or j == 0) else "small") for j, c in enumerate(r)] for i, r in enumerate(rows)]
t = Table(rows, colWidths=[24 * mm, 126 * mm, 24 * mm], repeatRows=1)
t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), PINK), ("GRID", (0, 0), (-1, -1), 0.4, TERRA),
                       ("VALIGN", (0, 0), (-1, -1), "TOP"), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CREAM])]))
story.append(t)
story.append(PageBreak())

# ===== 6. Semakan ciri =====
story.append(P("6. Semakan Ciri-ciri Audio Siar Akademik", "h1"))
rows = [["Ciri", "Bagaimana skrip memenuhinya"],
        ["Ketepatan ilmu", "Analisis berdasarkan konsep sintaksis yang diterangkan dengan mudah: subjek dan predikat, binaan tergantung, "
                           "campur kod, kata penyambung, kelewahan, ayat perintah dan ayat pasif."],
        ["Bukti autentik", "Tiga ayat berdasarkan pola kapsyen dan komen sebenar di TikTok, disokong oleh pautan TikTok awam."],
        ["Pemikiran kritis", "Setiap ayat dinilai: apa yang salah, mengapa ia digunakan, dan bagaimana membaikinya tanpa "
                             "menghilangkan nada asal. Hujah balas (\"slay\" lebih pendek) turut dijawab."],
        ["Aplikasi pedagogi", "Aktiviti \"Detektif Kapsyen\": murid mengenal pasti subjek dan predikat kapsyen TikTok dan membina "
                              "semula ayat yang gramatis."],
        ["Etika akademik", "Sumber disebut, nama pengguna dikaburkan dalam aktiviti, kenyataan hak cipta dan muzik bebas hak "
                           "cipta dinyatakan pada penutup, dan senarai rujukan disertakan."]]
rows = [[P(c, "smallb" if (i == 0 or j == 0) else "small") for j, c in enumerate(r)] for i, r in enumerate(rows)]
t = Table(rows, colWidths=[36 * mm, 138 * mm])
t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), PINK), ("GRID", (0, 0), (-1, -1), 0.4, TERRA),
                       ("VALIGN", (0, 0), (-1, -1), "TOP"), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CREAM])]))
story.append(t)

# ===== 7. Rujukan =====
story.append(P("7. Rujukan", "h1"))
refs = [
    "Dewan Bahasa dan Pustaka. (2005). <i>Kamus Dewan</i> (Edisi Keempat). Kuala Lumpur: Dewan Bahasa dan Pustaka.",
    "Nik Safiah Karim, Farid M. Onn, Hashim Haji Musa, &amp; Abdul Hamid Mahmood. (2008). <i>Tatabahasa Dewan</i> "
    "(Edisi Ketiga). Kuala Lumpur: Dewan Bahasa dan Pustaka.",
    "Kandungan TikTok seperti yang disenaraikan dalam Bahagian 5.",
]
for r in refs:
    story.append(Paragraph(r, ParagraphStyle("ref", parent=S["small"], leftIndent=14, firstLineIndent=-14, spaceAfter=4)))

# ===== 8. Tip =====
story.append(P("8. Tip Rakaman untuk Mendapat Lebih Banyak \"Suka\"", "h1"))
for tip in ["Baca skrip dua kali sebelum merakam supaya nada kedengaran seperti berbual, bukan membaca. Ketawa dan "
            "reaksi kecil (\"Betul!\", \"Wah!\") boleh ditambah secara spontan.",
            "Ulang baris pantun dengan rentak yang perlahan; pantun ialah \"cangkuk\" pada 30 saat pertama.",
            "Gunakan muzik latar bebas hak cipta (contohnya daripada Pustaka Audio YouTube) dan nyatakannya dalam kapsyen.",
            "Segmen Ayat 2 (\"slay\" bermaksud membunuh) sangat sesuai dipotong menjadi klip promosi 60 saat.",
            "Gunakan kapsyen yang gramatis sendiri, contohnya: \"Di manakah subjek dan predikat dalam kapsyen TikTok anda? "
            "Dengar Podcast Tengah Jalan episod ini!\"",
            "Masa sasaran: bacaan santai sekitar 140 patah perkataan seminit menghasilkan kira-kira 12 minit. Jika terlalu "
            "panjang, ringkaskan Segmen 6; jika terlalu pendek, tambah reaksi spontan."]:
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
