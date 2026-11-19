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
    [P("<b>Durasi</b>", "smallb"), P("± 11 minit (julat 10–12 minit; kira-kira 1,400 patah perkataan dialog termasuk pantun)", "small")],
    [P("<b>Penutur</b>", "smallb"), P("ALIFF (Hos 1 – pengacara utama) · AMMAR (Hos 2 – \"suara warganet\") · "
                                      "IMAN (Hos 3 – \"detektif sintaksis\"). Dialog dibahagikan sama rata: setiap penutur "
                                      "bercakap kira-kira 450 patah perkataan dan mengetuai perbincangan "
                                      "satu daripada tiga istilah TikTok (Iman: POV, Aliff: slay, Ammar: terpaling).", "small")],
    [P("<b>Isi kandungan</b>", "smallb"), P("1. Judul alternatif  ·  2. Struktur & masa  ·  3. Skrip penuh  ·  "
                                            "4. Tiga istilah: maksud PRPM & analisis  ·  5. Bukti autentik: pautan TikTok  ·  "
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
story.append(P("Episod ini memberi tumpuan kepada <b>tiga istilah bahasa TikTok sahaja</b>, iaitu \"POV\", \"slay\" dan "
               "\"terpaling\". Setiap istilah dibincangkan secara mendalam: maksud dalam TikTok, maksud dalam PRPM, analisis "
               "sintaksis, dan bentuk ayat yang gramatis. Setiap penutur mengetuai perbincangan satu istilah."))
seg = [["Masa", "Segmen", "Fokus", "Ciri akademik"],
       ["0:00 – 1:30", "Pembukaan", "Pengenalan Podcast Tengah Jalan, pantun Aliff & Ammar, topik episod", "–"],
       ["1:30 – 3:00", "Kenali bahasa TikTok", "Takrif rancu, slanga dan bahasa rojak (PRPM); mengapa TikTok melahirkan bahasanya sendiri", "Ketepatan ilmu"],
       ["3:00 – 5:00", "Istilah 1: \"POV\"", "Diketuai Iman", "Ketepatan ilmu, bukti autentik"],
       ["5:00 – 7:00", "Istilah 2: \"Slay\"", "Diketuai Aliff", "Ketepatan ilmu, bukti autentik"],
       ["7:00 – 8:45", "Istilah 3: \"Terpaling\"", "Diketuai Ammar", "Ketepatan ilmu, bukti autentik"],
       ["8:45 – 10:15", "Salah atau kreatif? & bilik darjah", "Laras bahasa, kesan, aktiviti pengajaran", "Pemikiran kritis, aplikasi pedagogi"],
       ["10:15 – 11:30", "Penutup", "Seruan berbahasa gramatis, pantun, kredit", "Etika akademik"]]
seg = [[P(c, "smallb" if i == 0 else "small") for c in r] for i, r in enumerate(seg)]
t = Table(seg, colWidths=[24 * mm, 40 * mm, 62 * mm, 48 * mm])
t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), PINK), ("GRID", (0, 0), (-1, -1), 0.4, TERRA),
                       ("VALIGN", (0, 0), (-1, -1), "TOP"), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CREAM])]))
story.append(t)
story.append(Spacer(1, 6))
story.append(P("<i>Nota bahasa: Skrip ditulis dalam bahasa Melayu gramatis tetapi bernada santai. Perkataan slanga atau "
               "bahasa Inggeris yang muncul hanya dipetik sebagai <b>contoh yang dianalisis</b> dan ditandakan dengan "
               "tanda petik. Semua maksud kata dirujuk daripada Pusat Rujukan Persuratan Melayu (PRPM), DBP.</i>", "small"))
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
                     "tidak akan membawa senarai slanga yang panjang. Sebaliknya, kita akan membedah <b>tiga istilah</b> yang "
                     "paling kerap muncul di TikTok, iaitu \"POV\", \"slay\" dan \"terpaling\", satu demi satu."))

story += bar("SEGMEN 2 · KENALI BAHASA TIKTOK  (1:30 – 3:00)")
story.append(say(H2, "Sebelum kita bedah, saya nak tahu dahulu. Apakah sebenarnya maksud \"rancu\"? Bunyinya seperti nama makanan."))
story.append(say(H3, "<i>(ketawa)</i> Bukan, Ammar. Saya sudah semak di laman <b>Pusat Rujukan Persuratan Melayu, atau PRPM</b>, "
                     "milik Dewan Bahasa dan Pustaka. Menurut <b>Kamus Dewan Edisi Keempat (2005)</b> dalam PRPM, \"rancu\" "
                     "bermaksud tidak teratur, campur aduk dan kacau, khususnya tentang bahasa. Kerancuan pula ialah keadaan "
                     "rancu itu sendiri."))
story.append(say(H1, "Saya pula menyemak kata \"slanga\". Kamus yang sama mentakrifkannya sebagai kata-kata atau ungkapan yang "
                     "tidak tergolong dalam bahasa baku dan biasa digunakan dalam percakapan tidak rasmi. Ada juga entri "
                     "\"bahasa rojak\", iaitu bahasa yang bercampur aduk, seketika perkataan Melayu dan seketika perkataan Inggeris."))
story.append(say(H2, "Bahasa rojak! Itulah bahasa TikTok. Tetapi mengapa TikTok, bukan aplikasi lain?"))
story.append(say(H3, "Kerana formatnya. Video TikTok pendek, kapsyennya pun pendek, dan semua orang mengejar \"trend\". Menariknya, "
                     "PRPM mentakrifkan \"trend\" sebagai arah aliran. Jadi, apabila satu istilah menjadi arah aliran, berjuta-juta "
                     "pengguna menirunya dalam masa beberapa hari sahaja, termasuk struktur ayatnya."))
story.append(say(H2, "Betul. Apabila satu video tular, ruangan komennya dipenuhi istilah yang sama. Dalam masa seminggu, "
                     "kawan-kawan saya pun mula menggunakannya dalam perbualan harian, malah dalam mesej kepada pensyarah!"))

story += bar("SEGMEN 3 · ISTILAH 1: \"POV\"  (3:00 – 5:00)")
story.append(cue("Kesan bunyi \"ting!\""))
story.append(say(H3, "Istilah pertama, saya yang ketuai: <b>\"POV\"</b>. Ini singkatan Inggeris <i>point of view</i>. Di TikTok, "
                     "\"POV\" ialah format video yang meminta penonton membayangkan diri mereka dalam sesuatu situasi. Contoh "
                     "kapsyennya: \"<b>POV: kau first time masuk kelas Cikgu Bahasa Melayu.</b>\""))
story.append(say(H2, "Saya selalu tulis begitu! Apa salahnya, Iman? Semua orang faham."))
story.append(say(H3, "Faham, ya. Tetapi dari segi sintaksis, ada dua masalah. Pertama, \"POV\" diletakkan di hadapan seperti "
                     "label, kemudian diikuti klausa. Label itu tidak mempunyai hubungan tatabahasa dengan klausa selepasnya, "
                     "jadi binaan ini tergantung dan bukan ayat yang lengkap. Kedua, \"first time\" ialah campur kod di tengah "
                     "klausa Melayu."))
story.append(say(H2, "Maksudnya, perkataan \"POV\" itu sebenarnya berfungsi seperti tajuk kecil, bukan sebahagian daripada ayat?"))
story.append(say(H1, "Ya, sama seperti kita menulis \"Tajuk:\" sebelum karangan. Tajuk boleh berupa frasa, tetapi isi karangan "
                     "mesti terdiri daripada ayat yang lengkap."))
story.append(say(H1, "Kalau begitu, apakah padanan bahasa Melayunya?"))
story.append(say(H3, "Dalam PRPM, kata \"sudut\" mempunyai maksud arah pandangan atau segi. Jadi, terjemahan harfiahnya ialah "
                     "\"sudut pandangan\". Namun, fungsi \"POV\" di TikTok sebenarnya mengajak penonton membayangkan sesuatu. "
                     "Ayat yang gramatis ialah: <b>\"Bayangkan anda masuk ke kelas guru Bahasa Melayu buat kali pertama.\"</b> "
                     "Ayat ini lengkap dengan subjek dan predikat, dan maksudnya sama."))
story.append(say(H2, "Kedengarannya lebih sopan juga. \"Kau\" pun bertukar menjadi \"anda\"."))
story.append(say(H3, "Tepat, itu soal laras. Saya bukan menyuruh semua orang membuang format POV, tetapi apabila struktur "
                     "\"label: klausa\" ini dibawa ke dalam karangan, ayat murid mula tergantung tanpa mereka sedari."))

story += bar("SEGMEN 4 · ISTILAH 2: \"SLAY\"  (5:00 – 7:00)")
story.append(cue("Kesan bunyi \"ting!\""))
story.append(say(H1, "Istilah kedua, giliran saya: <b>\"slay\"</b>. Di TikTok, \"slay\" digunakan untuk memuji, misalnya "
                     "penampilan atau persembahan yang sangat hebat. Contoh komen: \"<b>Outfit dia hari ni slay gila!</b>\" "
                     "Tetapi cuba teka maksud \"slay\" dalam PRPM."))
story.append(say(H2, "Hebat? Cantik?"))
story.append(say(H1, "Salah! Menurut <b>Kamus Inggeris-Melayu Dewan (1992)</b> dalam PRPM, \"slay\" bermaksud <b>membunuh</b>, "
                     "contohnya \"<i>he slew the dragon with his sword</i>\", iaitu dia membunuh naga itu dengan pedangnya."))
story.append(say(H3, "<i>(ketawa)</i> Jadi, kalau ikut kamus, kita sedang berkata pakaian itu membunuh!"))
story.append(say(H1, "Betul! Inilah <b>perubahan makna</b>. Dari segi sintaksis pula, ayat itu bermasalah. Subjeknya, \"outfit "
                     "dia\", menggunakan kata Inggeris. Predikatnya, \"slay\", ialah kata kerja transitif Inggeris yang "
                     "dipaksa berfungsi sebagai adjektif tanpa objek. Kemudian, kata \"gila\" digunakan sebagai penguat. PRPM "
                     "melabelkan makna \"gila\" sebagai luar biasa itu sebagai bahasa percakapan."))
story.append(say(H2, "Jadi, ayat yang betul bagaimana?"))
story.append(say(H1, "<b>\"Pakaiannya hari ini sungguh hebat!\"</b> Kata \"hebat\" dalam PRPM bermaksud teramat sangat atau luar "
                     "biasa, termasuk elok dan bagus. Kata penguat \"sungguh\" hadir di hadapan adjektif, jadi frasa adjektifnya "
                     "tersusun betul. Kalau mahu lebih bergaya, gunakan \"cemerlang\" atau \"menawan\"."))
story.append(say(H2, "Tetapi saya rasa orang memilih \"slay\" kerana bunyinya pendek dan bertenaga. \"Sungguh hebat\" terasa "
                     "panjang dalam ruangan komen."))
story.append(say(H1, "Itu hujah yang baik, Ammar. Namun, bahasa Melayu ada kata yang sama pendek, seperti \"Hebat!\", "
                     "\"Cantik!\" atau \"Menawan!\". Satu perkataan pun sudah boleh menjadi ayat seruan yang gramatis."))
story.append(say(H3, "Hal ini menunjukkan bahawa bahasa Melayu tidak kekurangan kata. Kita yang malas mencarinya."))

story += bar("SEGMEN 5 · ISTILAH 3: \"TERPALING\"  (7:00 – 8:45)")
story.append(cue("Kesan bunyi \"ting!\""))
story.append(say(H2, "Istilah ketiga, saya yang ketuai, dan ini perkataan dalam judul kita: <b>\"terpaling\"</b>. Di TikTok, "
                     "\"terpaling\" biasanya bernada sindiran. Contoh: \"<b>Dia ni terpaling alim, semua orang dia tegur.</b>\" "
                     "Maksudnya, orang itu berlagak seolah-olah dia yang paling alim."))
story.append(say(H1, "Saya akui saya pernah guna perkataan ini. Apakah masalahnya, Ammar?"))
story.append(say(H2, "Masalahnya kelewahan. Cuba lihat takrif \"paling\" dalam PRPM: \"(yg) teramat, (yg) amat sangat, (yg) "
                     "ter...\". Kamus itu sendiri menunjukkan bahawa \"paling\" sama maknanya dengan awalan <i>ter-</i>. "
                     "Apabila kedua-duanya digabungkan, makna \"paling\" diulang dua kali."))
story.append(say(H3, "Dan PRPM ada contoh yang sangat sesuai untuk kata \"lewah\", iaitu penggunaan kata yang lewah dalam "
                     "pembinaan ayat perlu dielakkan."))
story.append(say(H2, "Betul. Jadi, ayat gramatisnya ialah: <b>\"Dia berlagak paling alim sehingga semua orang ditegurnya.\"</b> "
                     "Kata \"berlagak\" mengekalkan nada sindiran, \"paling alim\" menggantikan \"terpaling\", dan klausa "
                     "\"semua orang dia tegur\" ditukar kepada ayat pasif yang betul."))
story.append(say(H2, "Satu lagi perkara yang menarik. Kadang-kadang \"terpaling\" tidak diikuti adjektif. Orang menulis "
                     "\"terpaling Kelantan\" atau \"terpaling anak sulung\". Kata nama diletakkan selepas \"paling\", "
                     "sedangkan contoh dalam PRPM, seperti \"mawar yang paling indah\", menunjukkan \"paling\" menerangkan adjektif."))
story.append(say(H1, "Jadi, binaan itu melanggar fungsi kata penguat. Ayat yang betul mungkin \"Dia berlagak seolah-olah dialah "
                     "anak jati Kelantan yang paling tulen.\""))
story.append(say(H1, "Menarik. Sindirannya masih ada, tetapi ayatnya gramatis."))

story += bar("SEGMEN 6 · SALAH ATAU KREATIF?  (8:45 – 10:15)")
story.append(say(H2, "Namun, jujurnya, saya rasa istilah ini membuatkan kita rasa rapat. Adakah semuanya salah?"))
story.append(say(H3, "Ada asasnya, Ammar. Dalam laporan <b>Malay Mail (2025)</b>, <b>Profesor Emeritus Datuk Dr. Nik Safiah "
                     "Karim</b> berpendapat bahawa slanga ialah tanda bahasa itu hidup. Akan tetapi, beliau menegaskan bahawa "
                     "slanga tidak sesuai digunakan dalam surat permohonan kerja, ucapan rasmi atau penulisan formal."))
story.append(say(H1, "Jadi, kata kuncinya ialah <b>laras bahasa</b>. Masalahnya bukan istilah itu wujud, tetapi apabila struktur "
                     "\"POV\", makna \"slay\" dan bentuk \"terpaling\" meresap ke dalam karangan dan urusan rasmi."))
story.append(say(H2, "Betul. Saya bimbang kalau adik-adik saya menulis \"terpaling\" dalam karangan peperiksaan. Pemeriksa "
                     "tentu tidak akan memberikan markah."))
story.append(say(H3, "Itulah kesan sebenar kerancuan. Bahasa yang rancu di media sosial perlahan-lahan menjadi kebiasaan, dan "
                     "kebiasaan itu dibawa ke dalam bilik darjah."))
story.append(say(H2, "Sebagai bakal guru, kita boleh jadikan isu ini aktiviti <b>\"Detektif Kapsyen\"</b>. Murid mengumpulkan "
                     "kapsyen TikTok, mengaburkan nama pengguna, kemudian menyemak maksud setiap istilah di PRPM dan membina "
                     "semula ayat yang gramatis."))
story.append(say(H3, "Murid bukan sahaja belajar tatabahasa, malah belajar menggunakan PRPM sebagai rujukan. Itu kemahiran "
                     "sepanjang hayat."))
story.append(say(H2, "Satu lagi aktiviti ialah <b>\"Alih Laras\"</b>. Murid menukar komen TikTok kepada laras formal, "
                     "kemudian kepada laras santai yang masih gramatis. Dengan cara ini, murid sedar bahawa santai tidak "
                     "bermaksud rancu."))

story += bar("SEGMEN 7 · PENUTUP  (10:15 – 11:30)")
story.append(say(H1, "Kesimpulannya, tiga istilah, tiga pengajaran. \"POV\" mengajar kita tentang ayat yang lengkap, \"slay\" "
                     "tentang makna kata, dan \"terpaling\" tentang kelewahan."))
story.append(say(H3, "Pesanan saya: sebelum memuat naik kapsyen, semak PRPM. Laman itu percuma dan hanya mengambil masa beberapa saat."))
story.append(say(H2, "Kepada semua pendengar, mari kita jadikan bahasa Melayu yang betul dan gramatis sebagai \"trend\" yang "
                     "sebenar. Bahasa jiwa bangsa. Jika bukan kita yang memartabatkannya, siapa lagi? Sebagai penutup, kami "
                     "bertiga mempersembahkan serangkap pantun."))
story.append(KeepTogether([say(H3, "<i>(berpantun, semua menyambung baris)</i>"),
                           box(P("Dari Melaka ke Kuala Kangsar,<br/>Singgah sebentar membeli kopi;<br/>"
                                 "Bahasa yang baik, bahasa yang benar,<br/>Bahasa Melayu kita junjung tinggi.", "pantun"), bg=CREAM),
                           Spacer(1, 4)]))
story.append(say(H2, "Contoh dalam episod ini dipetik daripada kandungan awam TikTok untuk tujuan pendidikan sahaja. Hak cipta "
                     "kekal milik pencipta asal, dan senarai rujukan kami sertakan bersama. Muzik latar episod ini ialah muzik "
                     "bebas hak cipta."))
story.append(say(H3, "Kalau episod ini bermanfaat, jangan lupa tekan butang <b>suka</b> dan kongsikan dengan rakan-rakan!"))
story.append(say(H1, "Jumpa lagi dalam episod Podcast Tengah Jalan yang akan datang. Jaga diri, jaga bahasa! Assalamualaikum "
                     "dan selamat sejahtera!"))
story.append(cue("Muzik latar dinaikkan semula dan audio dipudarkan"))
story.append(PageBreak())

# ===== 4. Bukti autentik =====
link = lambda u: f"<link href='{u}' color='#E03A2F'><u>{u}</u></link>"
story.append(P("4. Tiga Istilah: Maksud PRPM dan Analisis Sintaksis", "h1"))
rows = [["Istilah", "Maksud di TikTok", "Maksud dalam PRPM", "Ayat TikTok", "Ayat gramatis"],
        ["POV", "Format video yang meminta penonton membayangkan diri dalam sesuatu situasi",
         "\"sudut\": arah pandangan, segi (Kamus Dewan Edisi Keempat, 2005)",
         "POV: kau first time masuk kelas Cikgu Bahasa Melayu.<br/><i>Binaan tergantung + campur kod</i>",
         "Bayangkan anda masuk ke kelas guru Bahasa Melayu buat kali pertama."],
        ["Slay", "Pujian: sangat hebat, menawan",
         "membunuh (Kamus Inggeris-Melayu Dewan, 1992)",
         "Outfit dia hari ni slay gila!<br/><i>Kata kerja Inggeris sebagai predikat adjektif + penguat bahasa percakapan</i>",
         "Pakaiannya hari ini sungguh hebat!"],
        ["Terpaling", "Sindiran: berlagak paling ...",
         "\"paling\": (yg) teramat, (yg) amat sangat, (yg) ter... ; \"lewah\": berlebih-lebih (Kamus Dewan Edisi Keempat, 2005)",
         "Dia ni terpaling alim, semua orang dia tegur.<br/><i>Kelewahan ter- + paling</i>",
         "Dia berlagak paling alim sehingga semua orang ditegurnya."]]
rows = [[P(c, "smallb" if (i == 0 or j == 0) else "small") for j, c in enumerate(r)] for i, r in enumerate(rows)]
t = Table(rows, colWidths=[22 * mm, 30 * mm, 40 * mm, 43 * mm, 39 * mm], repeatRows=1)
t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), PINK), ("GRID", (0, 0), (-1, -1), 0.4, TERRA),
                       ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TEXTCOLOR", (4, 1), (4, -1), GREEN),
                       ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CREAM])]))
story.append(t)
story.append(P("<i>Ayat TikTok dalam jadual ini mewakili pola kapsyen dan komen yang lazim. Untuk bukti yang lebih kukuh, "
               "kumpulan anda boleh menggantikannya dengan tangkap layar sebenar daripada pautan di bawah (kaburkan nama "
               "pengguna).</i>", "small"))

story.append(P("5. Bukti Autentik: Contoh TikTok dan Pautan", "h1"))
story.append(P("Tahun bagi setiap video dikira daripada tarikh muat naik video tersebut. Halaman koleksi dan tanda pagar "
               "tiada tarikh terbitan, jadi tahun akses dinyatakan. <b>Nota:</b> pautan TikTok boleh tamat jika pemilik memadam "
               "video atau menukar tetapan privasi, jadi sila semak pautan sebelum menghantar tugasan."))
rows = [["Istilah", "Kandungan TikTok", "Tahun"],
        ["POV", "@herz_hq – Maksud & cara guna \"POV\" dalam video pendek Melayu<br/>"
                + link("https://www.tiktok.com/@herz_hq/video/7648112268915363080"), "2026"],
        ["POV", "@wfsufina – Tip membuat kandungan POV di TikTok<br/>"
                + link("https://www.tiktok.com/@wfsufina/video/7202526323594513691"), "2023"],
        ["POV", "Tanda pagar #pov<br/>" + link("https://www.tiktok.com/tag/pov"), "Diakses 2026"],
        ["Slay", "@bharianmy (Berita Harian) – Bertanya warganet maksud \"slay\" dalam bahasa Malaysia<br/>"
                 + link("https://www.tiktok.com/@bharianmy/video/7323053715961728274"), "2024"],
        ["Slay", "@sir_asai – What does slay mean in Malay?<br/>"
                 + link("https://www.tiktok.com/@sir_asai/video/7270487473795435794"), "2023"],
        ["Slay", "Halaman koleksi \"Slay Meaning\"<br/>" + link("https://www.tiktok.com/discover/slay-meaning"), "Diakses 2026"],
        ["Terpaling", "Tanda pagar #terpaling<br/>" + link("https://www.tiktok.com/tag/terpaling"), "Diakses 2026"],
        ["Umum", "Halaman koleksi \"Gen Z Slang in Malay\"<br/>"
                 + link("https://www.tiktok.com/discover/gen-z-slang-in-malay"), "Diakses 2026"]]
rows = [[P(c, "smallb" if (i == 0 or j == 0) else "small") for j, c in enumerate(r)] for i, r in enumerate(rows)]
t = Table(rows, colWidths=[22 * mm, 128 * mm, 24 * mm], repeatRows=1)
t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), PINK), ("GRID", (0, 0), (-1, -1), 0.4, TERRA),
                       ("VALIGN", (0, 0), (-1, -1), "TOP"), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CREAM])]))
story.append(t)
story.append(PageBreak())

# ===== 6. Semakan ciri =====
story.append(P("6. Semakan Ciri-ciri Audio Siar Akademik", "h1"))
rows = [["Ciri", "Bagaimana skrip memenuhinya"],
        ["Ketepatan ilmu", "Semua maksud kata dirujuk daripada PRPM: rancu, slanga, bahasa rojak, trend, sudut, slay, gila, "
                           "hebat, paling dan lewah. Analisis sintaksis meliputi binaan tergantung, predikat adjektif, "
                           "susunan frasa adjektif, kelewahan dan ayat pasif."],
        ["Bukti autentik", "Tiga istilah sebenar yang tular di TikTok, disokong oleh lapan pautan TikTok awam yang bertahun."],
        ["Pemikiran kritis", "Setiap istilah dinilai: mengapa digunakan, apa masalahnya, dan bagaimana membaikinya tanpa "
                             "menghilangkan nada asal. Segmen 6 menimbang pandangan Prof. Emeritus Nik Safiah Karim tentang laras."],
        ["Aplikasi pedagogi", "Aktiviti \"Detektif Kapsyen\": murid menyemak maksud istilah di PRPM dan membina semula ayat yang gramatis."],
        ["Etika akademik", "Sumber dan tahun disebut, nama pengguna dikaburkan dalam aktiviti, kenyataan hak cipta dan muzik "
                           "bebas hak cipta dinyatakan pada penutup, dan senarai rujukan disertakan."]]
rows = [[P(c, "smallb" if (i == 0 or j == 0) else "small") for j, c in enumerate(r)] for i, r in enumerate(rows)]
t = Table(rows, colWidths=[36 * mm, 138 * mm])
t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), PINK), ("GRID", (0, 0), (-1, -1), 0.4, TERRA),
                       ("VALIGN", (0, 0), (-1, -1), "TOP"), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CREAM])]))
story.append(t)

# ===== 7. Rujukan =====
story.append(P("7. Rujukan", "h1"))
prpm = lambda k: link("https://prpm.dbp.gov.my/Cari1?keyword=" + k.replace(" ", "+"))
refs = [
    "<b>Rujukan kamus (melalui PRPM)</b>",
    "Dewan Bahasa dan Pustaka. (2005). <i>Kamus Dewan</i> (Edisi Keempat). Kuala Lumpur: Dewan Bahasa dan Pustaka.",
    "Dewan Bahasa dan Pustaka. (1992). <i>Kamus Inggeris-Melayu Dewan</i>. Kuala Lumpur: Dewan Bahasa dan Pustaka.",
    "Dewan Bahasa dan Pustaka. (2026). <i>Pusat Rujukan Persuratan Melayu (PRPM)</i>. Diakses pada 19 November 2026 "
    "daripada " + link("https://prpm.dbp.gov.my") + ". Entri yang dirujuk:",
]
for k, src in [("rancu", "Kamus Dewan Edisi Keempat, 2005"), ("slanga", "Kamus Dewan Edisi Keempat, 2005"),
               ("bahasa rojak", "Kamus Dewan Edisi Keempat, 2005"), ("trend", "Kamus Dewan Edisi Keempat, 2005"),
               ("sudut", "Kamus Dewan Edisi Keempat, 2005"), ("slay", "Kamus Inggeris-Melayu Dewan, 1992"),
               ("gila", "Kamus Dewan Edisi Keempat, 2005"), ("hebat", "Kamus Dewan Edisi Keempat, 2005"),
               ("paling", "Kamus Dewan Edisi Keempat, 2005"), ("lewah", "Kamus Dewan Edisi Keempat, 2005")]:
    refs.append(f"&nbsp;&nbsp;&nbsp;&nbsp;• \"{k}\" ({src}) — " + prpm(k))
refs += [
    "<b>Rujukan lain</b>",
    "Nik Safiah Karim, Farid M. Onn, Hashim Haji Musa, &amp; Abdul Hamid Mahmood. (2008). <i>Tatabahasa Dewan</i> "
    "(Edisi Ketiga). Kuala Lumpur: Dewan Bahasa dan Pustaka.",
    "Malay Mail. (2025, 7 Oktober). Linguists weigh in on fast-evolving slang Malaysian youth are creating online. "
    + link("https://www.malaymail.com/news/malaysia/2025/10/07/linguists-weigh-in-on-fast-evolving-slang-malaysian-youth-are-creating-online-that-leaves-boomers-scratching-their-heads/191552"),
    "Kandungan TikTok seperti yang disenaraikan dalam Bahagian 5, berserta tahun masing-masing (2023–2026).",
]
for r in refs:
    story.append(Paragraph(r, ParagraphStyle("ref", parent=S["small"], leftIndent=14, firstLineIndent=-14, spaceAfter=4)))

# ===== 8. Tip =====
story.append(P("8. Tip Rakaman untuk Mendapat Lebih Banyak \"Suka\"", "h1"))
for tip in ["Baca skrip dua kali sebelum merakam supaya nada kedengaran seperti berbual, bukan membaca. Ketawa dan "
            "reaksi kecil (\"Betul!\", \"Wah!\") boleh ditambah secara spontan.",
            "Ulang baris pantun dengan rentak yang perlahan; pantun ialah \"cangkuk\" pada 30 saat pertama.",
            "Gunakan muzik latar bebas hak cipta (contohnya daripada Pustaka Audio YouTube) dan nyatakannya dalam kapsyen.",
            "Segmen \"Slay\" (maksud PRPM = membunuh) sangat sesuai dipotong menjadi klip promosi 60 saat.",
            "Gunakan kapsyen yang gramatis sendiri, contohnya: \"Tahukah anda bahawa 'slay' dalam kamus bermaksud membunuh? "
            "Dengar Podcast Tengah Jalan episod ini!\"",
            "Masa sasaran: bacaan santai sekitar 130–140 patah perkataan seminit menghasilkan kira-kira 10–11 minit. Jika "
            "terlalu pendek, panjangkan perbincangan spontan dalam Segmen 6."]:
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
