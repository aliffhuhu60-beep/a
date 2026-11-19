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
                                      "bercakap kira-kira 520–550 patah perkataan dan mengetuai perbincangan "
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

story += bar("SEGMEN 2 · KERANCUAN BAHASA DAN BAHASA TIKTOK  (1:30 – 3:00)")
story.append(say(H2, "Iman, sebelum kita mula, apa sebenarnya maksud \"rancu\"? Bunyinya seperti nama kuih."))
story.append(say(H3, "<i>(ketawa)</i> Bukan kuih, Ammar! Menurut <b>Kamus Dewan Edisi Keempat (2005)</b>, \"rancu\" bermaksud "
                     "bercampur aduk atau kacau dalam penggunaan bahasa. Jadi, <b>kerancuan bahasa</b> berlaku apabila unsur "
                     "bahasa lain atau bahasa percakapan bercampur aduk sehingga peraturan bahasa Melayu dilanggar."))
story.append(say(H1, "Dan bahasa TikTok ialah contoh yang paling dekat dengan kita. Kapsyen dan komen ditulis dengan laju, "
                     "pendek, dan banyak meniru gaya bahasa Inggeris. Akibatnya, yang rosak bukan sahaja perkataan, malah "
                     "<b>struktur ayat</b>. Itulah sebabnya isu ini termasuk dalam bidang sintaksis."))
story.append(say(H2, "Sintaksis itu ilmu tentang susunan ayat, bukan?"))
story.append(say(H1, "Betul. Menurut <b>Tatabahasa Dewan (2008)</b>, setiap ayat bahasa Melayu terdiri daripada <b>subjek</b>, "
                     "iaitu unsur yang diterangkan, dan <b>predikat</b>, iaitu unsur yang menerangkan subjek. Predikat pula "
                     "boleh berupa frasa nama, frasa kerja, frasa adjektif atau frasa sendi nama."))
story.append(say(H3, "Selain itu, ayat boleh jadi ayat tunggal, iaitu ayat yang ada satu klausa sahaja, atau ayat majmuk, iaitu "
                     "ayat yang ada lebih daripada satu klausa dan disambung dengan kata hubung. Kedua-dua konsep ini penting "
                     "dalam analisis kita sebentar lagi."))
story.append(say(H1, "Jadi, kerancuan bahasa TikTok boleh berlaku dalam bentuk apa?"))
story.append(say(H2, "Daripada pemerhatian saya di TikTok, antaranya ialah struktur ayat yang meniru bahasa Inggeris, campur kod di tengah ayat, klausa yang disambung "
                     "tanpa kata hubung, dan kata yang mengulang maksud. Kesemuanya akan kita lihat dalam tiga ayat hari ini."))

story += bar("SEGMEN 3 · AYAT 1: \"POV\"  (3:00 – 5:30)")
story.append(cue("Kesan bunyi \"ting!\""))
story.append(say(H3, "Untuk permulaan, saya bawa kapsyen yang sangat popular: \"<b>POV: kau first time masuk kelas Cikgu Bahasa "
                     "Melayu.</b>\" Format POV meminta penonton membayangkan diri mereka dalam sesuatu situasi."))
story.append(say(H2, "Saya selalu tulis begitu! Semua orang faham, apa salahnya?"))
story.append(say(H3, "Faham memang faham, tetapi mari kita analisis. Bahagian selepas titik bertindih, \"kau first time masuk kelas "
                     "Cikgu Bahasa Melayu\", ialah ayat tunggal dengan pola <b>frasa nama + frasa kerja</b>. Subjeknya kata ganti "
                     "nama \"kau\". Predikatnya frasa kerja \"masuk kelas Cikgu Bahasa Melayu\"."))
story.append(say(H1, "Kalau begitu, di manakah kerancuannya?"))
story.append(say(H3, "Mula-mula, \"POV\" di hadapan ayat. Singkatan Inggeris ini tidak berfungsi sebagai subjek atau predikat, "
                     "jadi ia menjadi <b>unsur tergantung</b>. Binaan \"label, titik bertindih, ayat\" ini sebenarnya meniru "
                     "format kapsyen bahasa Inggeris."))
story.append(say(H2, "Ada lagi?"))
story.append(say(H3, "Selain itu, \"first time\" ialah keterangan masa dalam bahasa Inggeris yang diselitkan antara subjek dan "
                     "predikat. Itulah <b>campur kod pada peringkat frasa</b>. Di samping itu, kata kerja \"masuk\" lebih "
                     "tepat diikuti kata sendi nama \"ke\" untuk menunjukkan arah, iaitu \"masuk ke kelas\"."))
story.append(say(H1, "Tiga kerancuan dalam satu kapsyen pendek! Bagaimana pula ayat yang gramatis?"))
story.append(say(H3, "<b>\"Bayangkan anda masuk ke kelas guru Bahasa Melayu buat kali pertama.\"</b> Ini ialah <b>ayat "
                     "perintah</b>. Kata kerja \"bayangkan\" menjadi predikat, manakala \"anda masuk ke kelas guru Bahasa Melayu "
                     "buat kali pertama\" ialah klausa yang menjadi objeknya. Frasa \"buat kali pertama\" pula menggantikan "
                     "\"first time\" sebagai keterangan masa di hujung ayat."))
story.append(say(H2, "Oh, jadi \"bayangkan\" mengambil alih tugas \"POV\", tetapi kali ini ia benar-benar menjadi sebahagian "
                     "daripada ayat. Nampaknya saya perlu menyunting semula separuh kapsyen dalam akaun saya! <i>(ketawa)</i>"))

story += bar("SEGMEN 4 · AYAT 2: \"SLAY\"  (5:30 – 8:00)")
story.append(cue("Kesan bunyi \"ting!\""))
story.append(say(H1, "Seterusnya, giliran saya, dan inilah ayat yang menjadi asal judul episod kita. Komen ini selalu muncul di "
                     "video tayangan pakaian: \"<b>Outfit dia hari ni slay gila, confirm ramai yang jealous!</b>\" Tahukah kamu, "
                     "dalam kamus bahasa Inggeris, \"slay\" sebenarnya bermaksud membunuh?"))
story.append(say(H3, "<i>(ketawa)</i> Jadi, kita memuji pakaian itu dengan berkata pakaian itu membunuh! Baiklah, bagaimana "
                     "analisis sintaksisnya, Aliff?"))
story.append(say(H1, "Mula-mula, ayat ini sebenarnya <b>ayat majmuk</b> kerana ada dua klausa, tetapi kedua-duanya dicantumkan "
                     "dengan tanda koma sahaja, tanpa kata hubung. Itu sudah satu kerancuan dari segi struktur. Klausa sebelum koma, "
                     "\"outfit dia hari ni slay gila\", berpola <b>frasa nama + frasa adjektif</b>. Subjeknya frasa nama "
                     "\"outfit dia\", dengan inti \"outfit\" dalam bahasa Inggeris."))
story.append(say(H2, "Predikatnya pula \"slay gila\"?"))
story.append(say(H1, "Ya, dan di sinilah kerancuan yang paling ketara. \"Slay\" ialah kata kerja transitif dalam bahasa Inggeris, "
                     "iaitu kata kerja yang memerlukan objek. Di sini, ia dipaksa berfungsi sebagai kata adjektif untuk "
                     "menerangkan pakaian. Kemudian, \"gila\" digunakan sebagai kata penguat di belakangnya, dan penggunaan ini "
                     "hanya sesuai dalam bahasa percakapan. \"Hari ni\" pula bentuk percakapan bagi \"hari ini\"."))
story.append(say(H3, "Bagaimana dengan klausa selepas koma, \"confirm ramai yang jealous\"?"))
story.append(say(H1, "Klausa ini lebih kabur. \"Confirm\" ialah kata Inggeris yang berfungsi sebagai kata penegas. Kata hubung "
                     "\"yang\" pula sepatutnya menerangkan kata nama, tetapi kata nama \"orang\" telah digugurkan. Akibatnya, "
                     "subjek klausa ini tidak lengkap. Akhir sekali, \"jealous\" juga kata Inggeris."))
story.append(say(H2, "Jadi, apakah ayat yang gramatis?"))
story.append(say(H1, "<b>\"Pakaiannya sungguh hebat hari ini, dan pasti ramai orang berasa cemburu.\"</b> Kini ayat ini ialah "
                     "<b>ayat majmuk gabungan</b> dengan kata hubung \"dan\". Klausa sebelum kata hubung berpola frasa nama + frasa adjektif: "
                     "\"pakaiannya\" + \"sungguh hebat\". Klausa selepasnya berpola frasa nama + frasa kerja: \"ramai orang\" + "
                     "\"berasa cemburu\", dengan kata penegas \"pasti\"."))
story.append(say(H3, "Sekarang barulah pendengar faham mengapa episod ini bertajuk <b>\"Slay atau Salah?\"</b>. Satu perkataan "
                     "\"slay\" sahaja sudah membawa campur kod, perubahan golongan kata dan struktur ayat majmuk yang rancu."))
story.append(say(H2, "Dan inilah contoh paling jelas bagi tajuk asal tugasan kita, iaitu <b>kerancuan bahasa akibat bahasa "
                     "TikTok</b>. Satu komen pendek, tetapi hampir setiap bahagiannya meminjam bahasa Inggeris."))
story.append(say(H1, "Jadi, jawapan kepada soalan dalam judul kita: di TikTok, mungkin \"slay\". Tetapi dari segi tatabahasa, "
                     "jawapannya jelas, iaitu <b>salah</b>! <i>(ketawa)</i>"))

story += bar("SEGMEN 5 · AYAT 3: \"TERPALING\"  (8:00 – 10:15)")
story.append(cue("Kesan bunyi \"ting!\""))
story.append(say(H2, "Akhir sekali, giliran saya. Ayat ini ada perkataan dalam judul kita: \"<b>Dia ni terpaling alim, semua "
                     "orang dia tegur.</b>\" Ayat ini biasanya menyindir orang yang berlagak alim dan suka menegur semua orang."))
story.append(say(H1, "Saya mengaku, saya pernah menulis ayat seperti ini. <i>(ketawa)</i> Apakah masalahnya, Ammar?"))
story.append(say(H2, "Sama seperti ayat Aliff tadi, ini juga ayat majmuk yang dua klausanya dicantumkan dengan koma tanpa kata "
                     "hubung. Klausa sebelum koma, \"dia ni terpaling alim\", berpola frasa nama + frasa adjektif. Subjeknya "
                     "\"dia ni\". Perkataan \"ni\" ialah bentuk percakapan bagi \"ini\". Predikatnya frasa adjektif \"terpaling alim\"."))
story.append(say(H3, "Dan \"terpaling\" itu sendiri bermasalah, bukan?"))
story.append(say(H2, "Betul. Awalan <i>ter-</i> pada kata adjektif sudah membawa makna paling, contohnya \"terpandai\". Apabila "
                     "digabungkan dengan \"paling\", maksud yang sama diulang dua kali. Inilah <b>kelewahan</b>, sama seperti "
                     "kita berkata \"naik ke atas\". Cukup sebut \"paling alim\"."))
story.append(say(H1, "Bagaimana pula dengan klausa selepas koma, \"semua orang dia tegur\"?"))
story.append(say(H2, "Ini <b>ayat pasif</b>, kerana objek \"semua orang\" dibawa ke hadapan. Masalahnya, susunan \"objek + pelaku + "
                     "kata kerja tanpa imbuhan\" hanya betul untuk kata ganti nama diri pertama dan kedua, contohnya \"Semua "
                     "orang saya tegur.\" Bagi diri ketiga seperti \"dia\", kata kerja mesti menerima imbuhan <i>di-</i>, iaitu "
                     "\"ditegurnya\" atau \"ditegur olehnya\"."))
story.append(say(H3, "Satu lagi, hubungan antara dua klausa itu ialah sebab dan akibat. Dia berlagak alim, akibatnya semua orang "
                     "ditegurnya. Jadi, ayat ini memerlukan kata hubung yang menunjukkan akibat."))
story.append(say(H2, "Tepat. Ayat gramatisnya: <b>\"Dia berlagak paling alim sehingga semua orang ditegurnya.\"</b> Ini ialah "
                     "<b>ayat majmuk pancangan keterangan</b>. Klausa utamanya \"dia berlagak paling alim\", manakala klausa "
                     "\"semua orang ditegurnya\" menerangkan akibat, disambung dengan kata hubung \"sehingga\"."))
story.append(say(H1, "Menarik. Kata \"berlagak\" pula mengekalkan nada sindiran. Jadi, sindirannya masih ada, tetapi ayatnya gramatis."))
story.append(say(H3, "Kalau mahu bentuk aktif pun boleh: \"Dia berlagak paling alim sehingga dia menegur semua orang.\" "
                     "Kedua-duanya betul, cuma fokusnya berbeza."))

story += bar("SEGMEN 6 · SALAH ATAU KREATIF?  (10:15 – 11:15)")
story.append(say(H2, "Tetapi, jujurnya, gaya bahasa TikTok ini membuatkan kita rasa rapat. Adakah semuanya salah?"))
story.append(say(H3, "Bahasa santai ada tempatnya, Ammar. Yang penting, kita tahu membezakan <b>laras bahasa</b>. Masalahnya "
                     "bermula apabila struktur ayat seperti tiga contoh tadi dibawa ke dalam karangan, surat rasmi dan urusan formal."))
story.append(say(H1, "Lebih membimbangkan, apabila sudah terbiasa, kita tidak lagi sedar bahawa ayat itu rancu. Bayangkan "
                     "adik-adik kita menulis \"semua orang dia tegur\" dalam karangan peperiksaan."))
story.append(say(H2, "Sebagai bakal guru, kita boleh jadikan isu ini aktiviti <b>\"Detektif Kapsyen\"</b>. Murid mengumpulkan "
                     "kapsyen TikTok, mengaburkan nama pengguna, kemudian mengenal pasti pola ayat, jenis kerancuan dan membina "
                     "semula ayat yang gramatis."))
story.append(say(H3, "Dengan cara ini, murid belajar sintaksis daripada bahan yang dekat dengan mereka, dan sedar bahawa "
                     "santai tidak bermaksud rancu. Malah, guru boleh meminta murid menghasilkan video TikTok sendiri dengan "
                     "kapsyen yang gramatis."))

story += bar("SEGMEN 7 · PENUTUP  (11:15 – 12:00)")
story.append(say(H2, "Kesimpulannya, kerancuan bahasa TikTok menyentuh struktur ayat itu sendiri. Mula-mula, ayat POV "
                     "menunjukkan unsur tergantung dan campur kod. Seterusnya, ayat \"slay\" menunjukkan klausa yang disambung "
                     "tanpa kata hubung dan kata Inggeris yang berubah golongan. Akhirnya, ayat \"terpaling\" menunjukkan "
                     "kelewahan dan ayat pasif yang salah susunannya."))
story.append(say(H3, "Pesanan saya, sebelum menekan butang muat naik, baca kapsyen anda sekali lagi. Lima saat sahaja!"))
story.append(say(H2, "Kepada semua pendengar, mari kita jadikan bahasa Melayu yang betul dan gramatis sebagai \"trend\" yang "
                     "sebenar. Ingat, santai boleh, rancu jangan! Sebagai penutup, kami bertiga mempersembahkan serangkap pantun."))
story.append(KeepTogether([say(H3, "<i>(berpantun bersama, setiap orang menyambung satu baris)</i>"),
                           box(P("Pucuk paku di tepi perigi,<br/>Dipetik adik dibawa pulang;<br/>"
                                 "Kapsyen TikTok tulislah lagi,<br/>Bahasa rancu jangan diulang.", "pantun"), bg=CREAM),
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
rows = [["", "Ayat TikTok", "Struktur ayat", "Kerancuan", "Ayat gramatis & strukturnya"],
        ["1", "POV: kau first time masuk kelas Cikgu Bahasa Melayu.",
         "Ayat tunggal, pola FN + FK<br/>S: kau<br/>P: masuk kelas Cikgu Bahasa Melayu",
         "• \"POV\" unsur tergantung (meniru format kapsyen Inggeris)<br/>• \"first time\": campur kod peringkat frasa<br/>"
         "• Kata sendi nama \"ke\" digugurkan",
         "Bayangkan anda masuk ke kelas guru Bahasa Melayu buat kali pertama.<br/><i>Ayat perintah; \"bayangkan\" + klausa sebagai objek</i>"],
        ["2", "Outfit dia hari ni slay gila, confirm ramai yang jealous!",
         "Ayat majmuk (2 klausa) tanpa kata hubung<br/>Klausa 1: FN + FA<br/>Klausa 2: subjek tidak lengkap",
         "• Klausa dicantumkan dengan koma sahaja<br/>• \"slay\" (kata kerja transitif Inggeris) dijadikan kata adjektif<br/>"
         "• Penguat \"gila\" & \"hari ni\": bahasa percakapan<br/>• \"yang\" tanpa kata nama \"orang\"<br/>• Campur kod: outfit, confirm, jealous",
         "Pakaiannya sungguh hebat hari ini, dan pasti ramai orang berasa cemburu.<br/><i>Ayat majmuk gabungan: [FN + FA] dan [FN + FK]</i>"],
        ["3", "Dia ni terpaling alim, semua orang dia tegur.",
         "Ayat majmuk (2 klausa) tanpa kata hubung<br/>Klausa 1: FN + FA<br/>Klausa 2: ayat pasif",
         "• Kelewahan ter- + paling<br/>• \"ni\": bahasa percakapan<br/>• Pasif diri ketiga tanpa imbuhan di-<br/>"
         "• Tiada kata hubung akibat",
         "Dia berlagak paling alim sehingga semua orang ditegurnya.<br/><i>Ayat majmuk pancangan keterangan (akibat)</i>"]]
rows = [[P(c, "smallb" if (i == 0 or j == 0) else "small") for j, c in enumerate(r)] for i, r in enumerate(rows)]
t = Table(rows, colWidths=[7 * mm, 36 * mm, 40 * mm, 50 * mm, 41 * mm], repeatRows=1)
t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), PINK), ("GRID", (0, 0), (-1, -1), 0.4, TERRA),
                       ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TEXTCOLOR", (4, 1), (4, -1), GREEN),
                       ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CREAM])]))
story.append(t)
story.append(P("<i>S = subjek, P = predikat, FN = frasa nama, FK = frasa kerja, FA = frasa adjektif. Ayat TikTok dalam jadual ini mewakili pola kapsyen dan komen yang lazim. Untuk bukti yang lebih kukuh, "
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
        ["Ketepatan ilmu", "Analisis sintaksis berdasarkan Tatabahasa Dewan (2008): pola ayat dasar, ayat tunggal dan majmuk, unsur "
                           "tergantung, campur kod, perubahan golongan kata, kelewahan, ayat perintah dan ayat pasif."],
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
