"""Projek ujian animasi 3D: "Momo di Hutan Senja".

Membina scene lengkap dalam Blender 4.5 menggunakan bpy sahaja (tanpa bpy.ops untuk geometri),
supaya skrip yang sama boleh dijalankan:
  * melalui BlendRelay MCP (execute_blender_python) ke dalam Blender yang sedang dibuka, atau
  * tanpa skrin:  blender -b --factory-startup --python projek_ujian/build_scene.py -- --out projek_ujian/momo.blend

Skrip TIDAK memadam scene sedia ada: ia mencipta (atau membina semula) scene khusus bernama
"AnimasiUjian" dan hanya membuang objek/bahan miliknya sendiri (awalan MU_).

Kandungan:
  - Karakter comel bergaya kartun (badan mochi, mata besar, pipi, kening, mulut ber-shape key, daun antena)
  - Rig kawalan (empty) untuk animasi badan: lompat, squash & stretch, lambai, gerakan sekunder daun
  - Animasi muka: kelip mata, arah anak mata, senyum / buka mulut (shape keys), kening
  - Persekitaran: bukit beralun, pokok, cendawan, batu, bunga, langit senja (Nishita)
  - Pencahayaan sinematik: matahari belakang (rim), fill biru, spot rim, isipadu kabus (god rays)
  - Partikel kunang-kunang beremisi
  - 4 shot kamera (dolly, orbit, tracking, close-up) ditukar melalui timeline marker
  - Depth of field, motion blur, AgX colour management
"""
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector, noise

SCENE_NAME = "AnimasiUjian"
PFX = "MU_"
FPS = 24
FRAME_END = 156  # 6.5 saat

# ----------------------------------------------------------------------------------------------
# Parameter: BUILD_OUT (global, untuk MCP) atau --out <fail.blend> (CLI)
# ----------------------------------------------------------------------------------------------
OUT = globals().get("BUILD_OUT")
if OUT is None and "--" in sys.argv:
    argv = sys.argv[sys.argv.index("--") + 1:]
    if "--out" in argv:
        OUT = argv[argv.index("--out") + 1]
RENDER_DIR = globals().get("RENDER_DIR")  # pilihan; lalai //render/


# ----------------------------------------------------------------------------------------------
# Pembersihan (hanya milik projek ini)
# ----------------------------------------------------------------------------------------------
def reset_scene():
    old = bpy.data.scenes.get(SCENE_NAME)
    if old:
        for ob in list(old.objects):
            if ob.name.startswith(PFX):
                bpy.data.objects.remove(ob, do_unlink=True)
        for coll in list(old.collection.children_recursive):
            if coll.name.startswith(PFX):
                bpy.data.collections.remove(coll)
        if len(bpy.data.scenes) > 1:
            bpy.data.scenes.remove(old)
    for blocks in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights,
                   bpy.data.worlds, bpy.data.particles, bpy.data.actions, bpy.data.shape_keys):
        for b in list(blocks):
            if b.name.startswith(PFX) and b.users == 0:
                blocks.remove(b)
    sc = bpy.data.scenes.new(SCENE_NAME)
    win = bpy.context.window
    if win is not None:
        win.scene = sc
    return sc


scene = reset_scene()
root_coll = bpy.data.collections.new(PFX + "Animasi")
scene.collection.children.link(root_coll)
COLLS = {}
for cname in ("Karakter", "Rig", "Persekitaran", "Cahaya", "Kamera", "Kesan"):
    c = bpy.data.collections.new(PFX + cname)
    root_coll.children.link(c)
    COLLS[cname] = c


# ----------------------------------------------------------------------------------------------
# Pembantu geometri / bahan
# ----------------------------------------------------------------------------------------------
def link(ob, coll):
    COLLS[coll].objects.link(ob)
    return ob


def mesh_obj(name, build, coll, loc=(0, 0, 0), scale=(1, 1, 1), rot=(0, 0, 0), smooth=True,
             subsurf=0, mat=None):
    bm = bmesh.new()
    build(bm)
    me = bpy.data.meshes.new(PFX + name)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    ob = bpy.data.objects.new(PFX + name, me)
    ob.location, ob.scale, ob.rotation_euler = loc, scale, rot
    if subsurf:
        m = ob.modifiers.new("Subsurf", "SUBSURF")
        m.levels = m.render_levels = subsurf
    if mat:
        me.materials.append(mat)
    return link(ob, coll)


def sphere(r=1.0, u=32, v=16):
    return lambda bm: bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=r)


def ico(r=1.0, sub=2):
    return lambda bm: bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)


def cone(r1, r2, depth, seg=24):
    return lambda bm: bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r1,
                                            radius2=r2, depth=depth)


def empty(name, coll="Rig", loc=(0, 0, 0), size=0.3, shape="PLAIN_AXES"):
    ob = bpy.data.objects.new(PFX + name, None)
    ob.empty_display_type, ob.empty_display_size, ob.location = shape, size, loc
    return link(ob, coll)


def parent(child, par):
    bpy.context.view_layer.update() if bpy.context.view_layer else None
    child.parent = par
    child.matrix_parent_inverse = par.matrix_world.inverted()


def material(name, color, rough=0.5, sss=0.0, emit=None, strength=0.0, coat=0.0, sheen=0.0):
    m = bpy.data.materials.new(PFX + name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    if sss:
        b.inputs["Subsurface Weight"].default_value = sss
        b.inputs["Subsurface Radius"].default_value = (0.6, 0.3, 0.2)
        b.inputs["Subsurface Scale"].default_value = 0.08
    if coat:
        b.inputs["Coat Weight"].default_value = coat
    if sheen:
        b.inputs["Sheen Weight"].default_value = sheen
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = strength
    m.diffuse_color = (*color, 1)
    return m


def noisy_material(name, c1, c2, scale=3.0, rough=0.8):
    """Bahan dengan variasi warna (noise) — untuk tanah, kanopi, batu."""
    m = material(name, c1, rough)
    nt = m.node_tree
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = scale
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*c1, 1)
    ramp.color_ramp.elements[1].color = (*c2, 1)
    ramp.color_ramp.elements[0].position, ramp.color_ramp.elements[1].position = 0.35, 0.7
    nt.links.new(n.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], nt.nodes["Principled BSDF"].inputs["Base Color"])
    return m


# ----------------------------------------------------------------------------------------------
# Pembantu animasi
# ----------------------------------------------------------------------------------------------
def keys(ob, path, frames, index=-1):
    """frames: {frame: nilai}  (nilai skalar jika index>=0, atau tuple untuk vektor)."""
    for f, val in sorted(frames.items()):
        if index >= 0:
            getattr(ob, path)[index] = val
            ob.keyframe_insert(path, index=index, frame=f)
        else:
            setattr(ob, path, val)
            ob.keyframe_insert(path, frame=f)


def fcurves_of(idblock):
    ad = idblock.animation_data
    if not ad or not ad.action:
        return []
    act = ad.action
    try:  # Blender 4.4+ (slotted actions)
        cb = act.layers[0].strips[0].channelbag(ad.action_slot)
        return list(cb.fcurves)
    except Exception:
        return list(act.fcurves)


def set_interp(idblock, data_path, interp="LINEAR"):
    for fc in fcurves_of(idblock):
        if fc.data_path == data_path:
            for kp in fc.keyframe_points:
                kp.interpolation = interp


# ==============================================================================================
# 1. Tetapan render
# ==============================================================================================
scene.render.engine = "CYCLES"
cy = scene.cycles
cy.device = "CPU"
# Profil UJIAN (CPU 4 teras): 8 sampel + OIDN ~ 57 s/frame 1080p.
# Profil PRODUKSI (GPU): naikkan ke 64-128 sampel, bounces 8, volume_step_rate 1.
cy.samples = int(globals().get("SAMPLES", 8))
cy.use_adaptive_sampling = True
cy.adaptive_threshold = 0.04
cy.use_denoising = True
cy.denoiser = "OPENIMAGEDENOISE"
cy.max_bounces, cy.diffuse_bounces, cy.glossy_bounces = 4, 1, 1
cy.transmission_bounces, cy.volume_bounces, cy.transparent_max_bounces = 4, 0, 8
cy.volume_step_rate = 8.0
cy.volume_max_steps = 64
cy.caustics_reflective = cy.caustics_refractive = False
cy.blur_glossy = 1.0
scene.render.use_persistent_data = True
scene.render.resolution_x, scene.render.resolution_y = 1920, 1080
scene.render.resolution_percentage = 100
scene.render.fps = FPS
scene.frame_start, scene.frame_end = 1, FRAME_END
scene.render.use_motion_blur = True
scene.render.motion_blur_shutter = 0.5
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"
scene.render.filepath = (RENDER_DIR.rstrip("/") + "/frame_") if RENDER_DIR else "//render/frame_"
scene.render.use_overwrite = False  # boleh sambung semula jika render terganggu
scene.view_settings.view_transform = "AgX"
for look in ("AgX - Punchy", "Punchy"):
    try:
        scene.view_settings.look = look
        break
    except TypeError:
        pass
scene.view_settings.exposure = 0.0

# ==============================================================================================
# 2. Dunia (langit senja)
# ==============================================================================================
world = bpy.data.worlds.new(PFX + "Dunia")
scene.world = world
world.use_nodes = True
wn = world.node_tree.nodes
sky = wn.new("ShaderNodeTexSky")
sky.sky_type = "NISHITA"
sky.sun_elevation = math.radians(9)
sky.sun_rotation = math.radians(180)
sky.altitude = 200
sky.air_density, sky.dust_density = 1.4, 2.5
world.node_tree.links.new(sky.outputs["Color"], wn["Background"].inputs["Color"])
wn["Background"].inputs["Strength"].default_value = 0.5

# ==============================================================================================
# 3. Bahan
# ==============================================================================================
M = {
    "kulit": material("Kulit", (1.0, 0.52, 0.42), rough=0.45, sss=0.35, sheen=0.3),
    "pipi": material("Pipi", (1.0, 0.25, 0.35), rough=0.5, emit=(1.0, 0.3, 0.4), strength=0.4),
    "mata": material("MataPutih", (0.95, 0.95, 0.95), rough=0.08, coat=1.0),
    "anak": material("AnakMata", (0.02, 0.015, 0.03), rough=0.05, coat=1.0),
    "kilau": material("Kilau", (1, 1, 1), emit=(1, 1, 1), strength=6.0),
    "mulut": material("Mulut", (0.12, 0.01, 0.02), rough=0.35),
    "kening": material("Kening", (0.25, 0.1, 0.07), rough=0.7),
    "daun": material("Daun", (0.25, 0.75, 0.2), rough=0.4, sss=0.3),
    "batang": material("Batang", (0.35, 0.22, 0.12), rough=0.8),
    "tanah": noisy_material("Tanah", (0.16, 0.42, 0.11), (0.38, 0.6, 0.15), scale=0.6),
    "kanopi1": noisy_material("Kanopi1", (0.1, 0.38, 0.12), (0.3, 0.6, 0.15), scale=4),
    "kanopi2": noisy_material("Kanopi2", (0.45, 0.55, 0.1), (0.85, 0.6, 0.12), scale=4),
    "kayu": material("Kayu", (0.3, 0.17, 0.09), rough=0.85),
    "cendawan": material("Cendawan", (0.9, 0.12, 0.1), rough=0.35, coat=0.5),
    "tangkai": material("Tangkai", (0.95, 0.9, 0.8), rough=0.6, sss=0.2),
    "batu": noisy_material("Batu", (0.32, 0.32, 0.35), (0.5, 0.48, 0.45), scale=6),
    "bunga1": material("Bunga1", (1.0, 0.85, 0.2), rough=0.5, emit=(1.0, 0.7, 0.2), strength=0.3),
    "bunga2": material("Bunga2", (0.7, 0.4, 1.0), rough=0.5, emit=(0.6, 0.3, 1.0), strength=0.3),
    "kunang": material("Kunang", (1.0, 0.9, 0.4), emit=(1.0, 0.62, 0.15), strength=12.0),
}

# ==============================================================================================
# 4. Karakter "Momo" + rig kawalan
# ==============================================================================================
rig_root = empty("Rig_Akar", loc=(0, 0, 0), size=0.8, shape="CIRCLE")
rig_root.rotation_euler = (0, 0, 0)
rig_body = empty("Rig_Badan", loc=(0, 0, 0), size=0.5, shape="CUBE")
parent(rig_body, rig_root)

body = mesh_obj("Badan", sphere(0.72, 48, 24), "Karakter", loc=(0, 0, 0.78), scale=(1, 0.88, 1.02),
                subsurf=1, mat=M["kulit"])
parent(body, rig_body)

# Mata (empty untuk kelip -> skala Z)
eyes = {}
for side, sx in (("L", 1), ("R", -1)):
    eye_ctl = empty("Mata_" + side, loc=(0.24 * sx, -0.5, 0.98), size=0.12)
    parent(eye_ctl, rig_body)
    white = mesh_obj("MataPutih_" + side, sphere(1, 32, 16), "Karakter", loc=(0.24 * sx, -0.5, 0.98),
                     scale=(0.17, 0.12, 0.21), mat=M["mata"])
    pupil = mesh_obj("AnakMata_" + side, sphere(1, 32, 16), "Karakter",
                     loc=(0.23 * sx, -0.6, 0.96), scale=(0.1, 0.05, 0.13), mat=M["anak"])
    glint = mesh_obj("Kilau_" + side, sphere(1, 16, 8), "Karakter", loc=(0.19 * sx, -0.645, 1.03),
                     scale=(0.035, 0.015, 0.035), mat=M["kilau"])
    for part in (white, pupil, glint):
        parent(part, eye_ctl)
    brow = mesh_obj("Kening_" + side, cone(0.035, 0.035, 0.22, 12), "Karakter",
                    loc=(0.25 * sx, -0.6, 1.25), rot=(0, math.radians(90), math.radians(-12 * sx)),
                    mat=M["kening"], subsurf=1)
    parent(brow, rig_body)
    cheek = mesh_obj("Pipi_" + side, sphere(1, 24, 12), "Karakter", loc=(0.43 * sx, -0.5, 0.74),
                     scale=(0.11, 0.04, 0.07), rot=(0, 0, math.radians(30 * sx)), mat=M["pipi"])
    parent(cheek, rig_body)
    eyes[side] = dict(ctl=eye_ctl, pupil=pupil, brow=brow)

# Mulut + shape keys (Senyum, Buka)
mouth = mesh_obj("Mulut", sphere(1, 32, 16), "Karakter", loc=(0, -0.625, 0.7),
                 scale=(0.13, 0.05, 0.06), mat=M["mulut"])
parent(mouth, rig_body)
mouth.shape_key_add(name="Basis")
sk_smile = mouth.shape_key_add(name="Senyum", from_mix=False)
sk_open = mouth.shape_key_add(name="Buka", from_mix=False)
for i, v in enumerate(mouth.data.vertices):
    x, y, z = v.co
    sk_smile.data[i].co = Vector((x * 1.35, y, z * 0.6 + 0.9 * x * x - 0.35))
    sk_open.data[i].co = Vector((x * 0.85, y, z * 2.6 - 0.3))
mouth.data.shape_keys.name = PFX + "MulutKeys"

# Tangan (pivot di bahu) & kaki
arms = {}
for side, sx in (("L", 1), ("R", -1)):
    piv = empty("Bahu_" + side, loc=(0.6 * sx, -0.05, 0.72), size=0.15)
    parent(piv, rig_body)
    arm = mesh_obj("Tangan_" + side, sphere(1, 24, 12), "Karakter", loc=(0.68 * sx, -0.05, 0.5),
                   scale=(0.11, 0.11, 0.25), rot=(0, math.radians(-18 * sx), 0), mat=M["kulit"])
    parent(arm, piv)
    arms[side] = piv
    foot = mesh_obj("Kaki_" + side, sphere(1, 24, 12), "Karakter", loc=(0.27 * sx, -0.12, 0.08),
                    scale=(0.17, 0.22, 0.09), mat=M["kulit"])
    parent(foot, rig_root)

# Daun antena (gerakan sekunder)
leaf_piv = empty("Daun_Pivot", loc=(0, 0, 1.48), size=0.15)
parent(leaf_piv, rig_body)
stem = mesh_obj("Daun_Tangkai", cone(0.02, 0.015, 0.25, 8), "Karakter", loc=(0, 0, 1.58),
                mat=M["batang"])
leaf = mesh_obj("Daun", sphere(1, 24, 12), "Karakter", loc=(0.1, 0, 1.73),
                scale=(0.18, 0.04, 0.09), rot=(0, math.radians(-30), 0), mat=M["daun"])
for p in (stem, leaf):
    parent(p, leaf_piv)

focus = empty("Fokus", loc=(0, -0.6, 0.95), size=0.1, shape="SPHERE")
parent(focus, rig_root)

# ==============================================================================================
# 5. Animasi badan
# ==============================================================================================
# Lompatan: (frame mula, puncak, mendarat, x_mula, x_akhir, tinggi)
hops = [(45, 52, 58, 0, 0, 0.6), (66, 73, 79, 0, 0, 0.7),
        (88, 93, 98, 0, 1, 0.42), (98, 103, 108, 1, 2, 0.42), (108, 113, 118, 2, 3, 0.45)]
loc = {1: (0, 0, 0), 42: (0, 0, 0)}
for f0, fa, f1, x0, x1, h in hops:
    loc[f0] = (x0, 0, 0)
    loc[fa] = ((x0 + x1) / 2, 0, h)
    loc[f1] = (x1, 0, 0)
loc[FRAME_END] = (3, 0, 0)
keys(rig_root, "location", loc)
keys(rig_root, "rotation_euler", {1: (0, 0, 0), 84: (0, 0, 0), 89: (0, 0, math.radians(28)),
                                  116: (0, 0, math.radians(28)), 123: (0, 0, math.radians(-4)),
                                  FRAME_END: (0, 0, math.radians(2))})

# Squash & stretch + pernafasan
S = lambda xy, z: (xy, xy, z)
scl = {}
for f in range(1, 41, 12):
    scl[f] = S(1.0, 1.0) if (f // 12) % 2 == 0 else S(0.99, 1.025)
for f0, fa, f1, *_ in hops:
    scl[f0 - 3] = S(1.14, 0.83)   # antisipasi
    scl[f0 + 1] = S(0.88, 1.16)   # regang
    scl[fa] = S(1.0, 1.0)
    scl[f1] = S(1.16, 0.82)       # hentakan mendarat
    scl[f1 + 3] = S(1.0, 1.0)
for f in range(124, FRAME_END + 1, 12):
    scl[f] = S(1.0, 1.0) if (f // 12) % 2 == 0 else S(0.99, 1.025)
keys(rig_body, "scale", scl)

# Tangan: lambai (shot 1), sorak (lompat), rehat, lambai kecil (close-up)
R, L = arms["R"], arms["L"]
wave_r = {1: 0.0, 8: math.radians(135)}
for i, f in enumerate(range(12, 37, 4)):
    wave_r[f] = math.radians(150 if i % 2 == 0 else 118)
wave_r[40] = math.radians(10)
for f0, fa, f1, *_ in hops:
    wave_r[f0] = math.radians(25)
    wave_r[fa] = math.radians(150)
    wave_r[f1 + 2] = math.radians(15)
wave_r[124] = math.radians(10)
for i, f in enumerate(range(138, FRAME_END + 1, 5)):
    wave_r[f] = math.radians(140 if i % 2 == 0 else 110)
keys(R, "rotation_euler", wave_r, index=1)
cheer_l = {1: 0.0, 40: 0.0}
for f0, fa, f1, *_ in hops:
    cheer_l[f0] = math.radians(-25)
    cheer_l[fa] = math.radians(-150)
    cheer_l[f1 + 2] = math.radians(-15)
cheer_l[124] = math.radians(-8)
keys(L, "rotation_euler", cheer_l, index=1)

# Daun: osilasi teredam selepas setiap hentakan
leaf_rot = {1: 0.0}
for f0, fa, f1, *_ in hops:
    leaf_rot[f0 + 1] = math.radians(-18)
    for k in range(4):
        leaf_rot[f1 + k * 3] = math.radians(24 * (-0.55) ** k)
leaf_rot[FRAME_END] = 0.0
keys(leaf_piv, "rotation_euler", leaf_rot, index=0)

# ==============================================================================================
# 6. Animasi muka
# ==============================================================================================
for side in ("L", "R"):
    ctl = eyes[side]["ctl"]
    blink = {1: (1, 1, 1)}
    for b in (20, 62, 128, 149):
        blink[b - 2] = (1, 1, 1)
        blink[b] = (1.05, 1, 0.08)
        blink[b + 2] = (1, 1, 1)
    keys(ctl, "scale", blink)
    # Arah pandangan (delta_location anak mata): pandang sisi lalu ke kamera
    keys(eyes[side]["pupil"], "delta_location",
         {1: (0, 0, 0), 121: (-0.035, 0, 0.0), 131: (-0.035, 0, 0), 135: (0, 0, 0.01),
          FRAME_END: (0, 0, 0.01)})
    # Kening naik ketika teruja
    brow = {1: (0, 0, 0), 40: (0, 0, 0)}
    for f0, fa, f1, *_ in hops:
        brow[fa] = (0, 0, 0.06)
        brow[f1 + 3] = (0, 0, 0.0)
    brow[134] = (0, 0, 0)
    brow[140] = (0, 0, 0.07)
    brow[152] = (0, 0, 0.04)
    keys(eyes[side]["brow"], "delta_location", brow)

smile = {1: 0.55, 40: 0.6, 124: 0.4, 136: 0.4, 141: 1.0, FRAME_END: 0.9}
openm = {1: 0.0, 124: 0.0, 137: 0.0, 141: 0.9, 145: 0.35, 148: 0.8, 152: 0.4, FRAME_END: 0.5}
for f0, fa, f1, *_ in hops:
    smile[f0] = 0.8
    openm[f0] = 0.1
    openm[fa] = 0.85
    openm[f1 + 3] = 0.15
for f, v in smile.items():
    sk_smile.value = v
    sk_smile.keyframe_insert("value", frame=f)
for f, v in openm.items():
    sk_open.value = v
    sk_open.keyframe_insert("value", frame=f)

# ==============================================================================================
# 7. Persekitaran
# ==============================================================================================
def ground(bm):
    bmesh.ops.create_grid(bm, x_segments=120, y_segments=120, size=22)
    for v in bm.verts:
        x, y = v.co.x, v.co.y
        flat = min(1.0, max(0.0, (math.hypot((x - 1.5) / 6, y / 3.5) - 0.6)))
        h = noise.noise(Vector((x * 0.12, y * 0.12, 0.3))) * 1.4 + noise.noise(Vector((x * 0.5, y * 0.5, 2))) * 0.15
        v.co.z = h * flat + (0.12 * max(0, y - 6))


mesh_obj("Tanah", ground, "Persekitaran", loc=(0, 4, 0), mat=M["tanah"])

TREES = [(-5.5, 6, 1.1), (-2.8, 9, 1.4), (1.0, 11, 1.6), (4.2, 7.5, 1.2), (7.5, 9.5, 1.5),
         (9.5, 5, 1.0), (-8.5, 9, 1.3), (-6.5, 3.2, 0.8), (6.8, 2.5, 0.85), (12, 11, 1.7)]
for i, (x, y, s) in enumerate(TREES):
    trunk = mesh_obj(f"Batang_{i}", cone(0.18 * s, 0.11 * s, 2.6 * s, 12), "Persekitaran",
                     loc=(x, y, 1.2 * s), mat=M["kayu"], subsurf=1)
    canopy_mat = M["kanopi2"] if i % 3 == 0 else M["kanopi1"]
    for j, (dx, dz, r) in enumerate(((0, 2.8, 1.25), (0.6, 2.3, 0.9), (-0.65, 2.25, 0.85), (0.1, 3.5, 0.8))):
        cp = mesh_obj(f"Kanopi_{i}_{j}", ico(r * s, 2), "Persekitaran",
                      loc=(x + dx * s, y + 0.1 * j, dz * s), mat=canopy_mat, subsurf=2)
        d = cp.modifiers.new("Benjol", "DISPLACE")
        tex = bpy.data.textures.new(PFX + f"Benjol_{i}_{j}", "CLOUDS")
        tex.noise_scale = 0.6
        d.texture, d.strength = tex, 0.25 * s
        cp.modifiers.move(1, 0) if len(cp.modifiers) > 1 else None

MUSH = [(-2.4, -0.6, 0.55), (-2.0, 0.4, 0.35), (4.6, -0.2, 0.5), (5.0, 0.8, 0.3), (-3.6, 1.8, 0.7)]
for i, (x, y, s) in enumerate(MUSH):
    mesh_obj(f"TangkaiCendawan_{i}", cone(0.12 * s, 0.09 * s, 0.6 * s, 16), "Persekitaran",
             loc=(x, y, 0.3 * s), mat=M["tangkai"], subsurf=1)
    mesh_obj(f"KepalaCendawan_{i}", sphere(0.42 * s, 32, 16), "Persekitaran",
             loc=(x, y, 0.62 * s), scale=(1, 1, 0.55), mat=M["cendawan"], subsurf=1)

for i in range(9):
    a = i * 2.1
    x, y = math.cos(a) * (3 + i * 0.6) + 1.5, abs(math.sin(a)) * 3 + 1.2
    r = 0.18 + (i % 3) * 0.15
    rk = mesh_obj(f"Batu_{i}", ico(r, 2), "Persekitaran", loc=(x, y, r * 0.3),
                  scale=(1.2, 1, 0.7), rot=(0, 0, a), mat=M["batu"], subsurf=1)
    d = rk.modifiers.new("Kasar", "DISPLACE")
    t = bpy.data.textures.new(PFX + f"Kasar_{i}", "VORONOI")
    t.noise_scale = 0.4
    d.texture, d.strength = t, 0.12

for i in range(26):
    a = i * 2.399
    rad = 1.8 + (i % 7) * 0.55
    x, y = math.cos(a) * rad * 1.4 + 1.5, math.sin(a) * rad * 0.7 + 1.0
    if abs(y) < 0.7 and -0.8 < x < 3.8:
        continue
    mesh_obj(f"Bunga_{i}", sphere(0.07, 12, 6), "Persekitaran", loc=(x, y, 0.12),
             mat=M["bunga1"] if i % 2 else M["bunga2"])

# ==============================================================================================
# 8. Pencahayaan sinematik + volumetrik
# ==============================================================================================
def light(name, kind, energy, color, loc, rot=(0, 0, 0), **kw):
    ld = bpy.data.lights.new(PFX + name, kind)
    ld.energy, ld.color = energy, color
    for k, v in kw.items():
        setattr(ld, k, v)
    ob = bpy.data.objects.new(PFX + name, ld)
    ob.location, ob.rotation_euler = loc, rot
    return link(ob, "Cahaya")


light("Matahari", "SUN", 5.5, (1.0, 0.72, 0.45), (0, 10, 6),
      rot=(math.radians(-72), 0, math.radians(180)), angle=math.radians(2.5))
light("Fill", "AREA", 260, (0.55, 0.7, 1.0), (-2.5, -5, 3.0),
      rot=(math.radians(62), 0, math.radians(-25)), size=5)
light("Rim", "SPOT", 900, (1.0, 0.6, 0.35), (1.5, 4.0, 3.0),
      rot=(math.radians(-55), 0, math.radians(180)), spot_size=math.radians(55), spot_blend=0.6)
light("Kunci", "AREA", 160, (1.0, 0.85, 0.75), (3.5, -4, 2.5),
      rot=(math.radians(65), 0, math.radians(35)), size=2.5)

vol_me = bpy.data.meshes.new(PFX + "Kabus")
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=1)
bm.to_mesh(vol_me)
bm.free()
fog = bpy.data.objects.new(PFX + "Kabus", vol_me)
fog.location, fog.scale = (1.5, 4, 3), (26, 20, 6)
link(fog, "Kesan")
vm = bpy.data.materials.new(PFX + "Kabus")
vm.use_nodes = True
vn = vm.node_tree.nodes
vn.remove(vn["Principled BSDF"])
pv = vn.new("ShaderNodeVolumePrincipled")
pv.inputs["Density"].default_value = 0.007
pv.inputs["Anisotropy"].default_value = 0.65
pv.inputs["Color"].default_value = (1.0, 0.92, 0.82, 1)
vm.node_tree.links.new(pv.outputs["Volume"], vn["Material Output"].inputs["Volume"])
vol_me.materials.append(vm)
fog.visible_shadow = False
fog.display_type = "BOUNDS"  # jangan halang viewport / capture_viewport

# ==============================================================================================
# 9. Partikel kunang-kunang
# ==============================================================================================
fly = mesh_obj("KunangBentuk", ico(1, 1), "Kesan", loc=(0, 0, -20), mat=M["kunang"])
fly.hide_render = fly.hide_viewport = False
emitter = mesh_obj("PemancarKunang", lambda bm: bmesh.ops.create_cube(bm, size=1), "Kesan",
                   loc=(1.5, 1.5, 1.4), scale=(9, 5, 1.6), smooth=False)
emitter.display_type = "WIRE"
emitter.modifiers.new("Kunang", "PARTICLE_SYSTEM")
ps = emitter.particle_systems[-1]
ps.seed = 7
st = ps.settings
st.name = PFX + "Kunang"
st.count = 140
st.frame_start, st.frame_end, st.lifetime = 1, 2, 1000
st.emit_from = "VOLUME"
st.physics_type = "NEWTON"
st.normal_factor = 0.0
st.factor_random = 0.03
st.brownian_factor = 0.06
st.damping = 0.8
st.effector_weights.gravity = 0.0
st.render_type = "OBJECT"
st.instance_object = fly
st.particle_size, st.size_random = 0.028, 0.6
st.use_rotations = False
emitter.show_instancer_for_render = False
emitter.show_instancer_for_viewport = False
ps.point_cache.frame_start, ps.point_cache.frame_end = 1, FRAME_END
fly.location = (0, 0, -20)  # bentuk asal disembunyikan di bawah tanah

# ==============================================================================================
# 10. Kamera: dolly, orbit, tracking, close-up (ditukar melalui marker)
# ==============================================================================================
def camera(name, lens, fstop, loc):
    cd = bpy.data.cameras.new(PFX + name)
    cd.lens, cd.sensor_width = lens, 36
    cd.dof.use_dof, cd.dof.focus_object, cd.dof.aperture_fstop = True, focus, fstop
    cd.dof.aperture_blades = 7
    cd.clip_end = 200
    ob = bpy.data.objects.new(PFX + name, cd)
    ob.location = loc
    c = ob.constraints.new("TRACK_TO")
    c.target, c.track_axis, c.up_axis = focus, "TRACK_NEGATIVE_Z", "UP_Y"
    return link(ob, "Kamera")


# Shot 1 (1-36): dolly-in lebar sambil Momo melambai
cam1 = camera("Kam1_Dolly", 32, 5.6, (1.2, -11.5, 2.8))
keys(cam1, "location", {1: (1.2, -11.5, 2.8), 36: (0.5, -6.8, 1.8)})
# Shot 2 (37-84): orbit di sekeliling Momo yang melompat
pivot = empty("Kam2_PusatOrbit", coll="Kamera", loc=(0, 0, 0), size=0.5)
cam2 = camera("Kam2_Orbit", 38, 2.8, (0, -6.0, 1.5))
parent(cam2, pivot)
keys(pivot, "rotation_euler", {37: (0, 0, math.radians(-55)), 84: (0, 0, math.radians(35))})
set_interp(pivot, "rotation_euler", "LINEAR")
keys(cam2, "location", {37: (0, -6.0, 1.1), 84: (0, -5.6, 2.0)})
# Shot 3 (85-120): tracking shot mengikut Momo ke kanan
cam3 = camera("Kam3_Jejak", 45, 2.8, (-1.4, -5.2, 1.15))
keys(cam3, "location", {85: (-1.4, -5.2, 1.15), 120: (2.2, -4.8, 1.25)})
set_interp(cam3, "location", "LINEAR")
# Shot 4 (121-156): close-up muka (ekspresi), push-in perlahan
cam4 = camera("Kam4_Dekat", 50, 2.0, (3.45, -4.3, 1.1))
keys(cam4, "location", {121: (3.45, -4.3, 1.1), FRAME_END: (3.2, -3.5, 1.0)})
cam4.data.dof.aperture_fstop = 2.0

for name, f, cam in (("Shot1_Dolly", 1, cam1), ("Shot2_Orbit", 37, cam2),
                     ("Shot3_Jejak", 85, cam3), ("Shot4_Dekat", 121, cam4)):
    m = scene.timeline_markers.new(name, frame=f)
    m.camera = cam
scene.camera = cam1

# ==============================================================================================
# 11. Bake partikel & simpan
# ==============================================================================================
scene.frame_set(1)
baked = False
try:
    with bpy.context.temp_override(scene=scene, point_cache=ps.point_cache):
        bpy.ops.ptcache.bake(bake=True)
    baked = ps.point_cache.is_baked
except Exception as exc:  # tidak kritikal; render berurutan tetap betul
    print("[build] bake partikel dilangkau:", exc)
scene.frame_set(1)

summary = {
    "scene": scene.name,
    "objek": len(scene.objects),
    "frame": [scene.frame_start, scene.frame_end],
    "fps": scene.render.fps,
    "resolusi": [scene.render.resolution_x, scene.render.resolution_y],
    "kamera_shot": [m.name for m in scene.timeline_markers],
    "partikel_dibake": baked,
}
if OUT:
    os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(OUT), copy=True)
    summary["disimpan"] = os.path.abspath(OUT)
print("[build]", summary)
result = summary  # dibaca oleh BlendRelay execute_blender_python
