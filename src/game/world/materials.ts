import * as THREE from 'three';

export interface BuildingUniforms {
  uGlass: { value: THREE.Color };
  uWinColor: { value: THREE.Color };
  uLit: { value: number };
  uWinIntensity: { value: number };
}

/**
 * Lambert material with procedural windows computed from world position in the
 * shader. Works with InstancedMesh (thousands of windows at the cost of one draw call)
 * and needs no textures, so tall and short buildings never show stretched windows.
 */
export const createBuildingMaterial = (opts: { shopFronts: boolean }): { material: THREE.MeshLambertMaterial; uniforms: BuildingUniforms } => {
  const uniforms: BuildingUniforms = {
    uGlass: { value: new THREE.Color(0x335577) },
    uWinColor: { value: new THREE.Color(0xffe7b0) },
    uLit: { value: 0.1 },
    uWinIntensity: { value: 0.5 },
  };
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vCdWorld;
varying vec3 vCdNormal;`,
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
vec4 cdW = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
cdW = instanceMatrix * cdW;
#endif
cdW = modelMatrix * cdW;
vCdWorld = cdW.xyz;
vCdNormal = objectNormal;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vCdWorld;
varying vec3 vCdNormal;
uniform vec3 uGlass;
uniform vec3 uWinColor;
uniform float uLit;
uniform float uWinIntensity;
float cdHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
vec3 cdN = normalize(vCdNormal);
float cdSide = 1.0 - step(0.8, abs(cdN.y));
vec2 cdP = abs(cdN.x) > 0.5 ? vec2(vCdWorld.z, vCdWorld.y) : vec2(vCdWorld.x, vCdWorld.y);
vec2 cdCell = cdP / vec2(2.4, 3.2);
vec2 cdF = fract(cdCell);
vec2 cdId = floor(cdCell);
float cdWin = step(0.2, cdF.x) * step(cdF.x, 0.8) * step(0.28, cdF.y) * step(cdF.y, 0.86);
float cdUpper = step(4.2, vCdWorld.y);
${
  opts.shopFronts
    ? `float cdShop = (1.0 - cdUpper) * step(0.5, vCdWorld.y) * step(vCdWorld.y, 3.1) * step(0.08, fract(cdP.x / 5.0)) * step(fract(cdP.x / 5.0), 0.92);
float cdAwning = step(3.2, vCdWorld.y) * step(vCdWorld.y, 3.7);`
    : `float cdShop = 0.0; float cdAwning = 0.0;`
}
float cdMask = cdSide * (cdWin * cdUpper + cdShop);
float cdRnd = cdHash(cdId + floor(vCdWorld.xz * 0.05));
float cdOn = step(1.0 - uLit, cdRnd) + cdShop * 0.8;
diffuseColor.rgb = mix(diffuseColor.rgb, uGlass * (0.7 + 0.6 * cdRnd), cdMask);
diffuseColor.rgb *= mix(1.0, 0.62, step(0.8, cdN.y));
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.55, cdAwning * cdSide);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
totalEmissiveRadiance += uWinColor * cdMask * min(cdOn, 1.0) * uWinIntensity * (0.6 + 0.4 * cdRnd);`,
      );
  };
  material.customProgramCacheKey = () => `cd-building-${opts.shopFronts ? 1 : 0}`;
  return { material, uniforms };
};

/** Fresnel-glow material for the shield bubble. */
export const createShieldMaterial = (): THREE.ShaderMaterial =>
  new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x4fd8ff) }, uOpacity: { value: 1 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float uTime; uniform vec3 uColor; uniform float uOpacity; varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.2); float bands = 0.5 + 0.5*sin(vP.y*14.0 - uTime*5.0); float a = (f*0.9 + bands*0.08) * uOpacity; gl_FragColor = vec4(uColor*(0.6+f), a); }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

/** Shared material cache keyed by a descriptor string (geometry/material reuse). */
const matCache = new Map<string, THREE.Material>();
export const sharedMaterial = <T extends THREE.Material>(key: string, make: () => T): T => {
  let m = matCache.get(key) as T | undefined;
  if (!m) {
    m = make();
    matCache.set(key, m);
  }
  return m;
};

const geoCache = new Map<string, THREE.BufferGeometry>();
export const sharedGeometry = <T extends THREE.BufferGeometry>(key: string, make: () => T): T => {
  let g = geoCache.get(key) as T | undefined;
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
};

/** Box geometry whose origin sits at the near-bottom-centre, extending towards -Z. */
export const boxAt = (w: number, h: number, l: number, y0 = 0, z0 = 0, x0 = 0): THREE.BoxGeometry => {
  const g = new THREE.BoxGeometry(w, h, l);
  g.translate(x0, y0 + h / 2, -z0 - l / 2);
  return g;
};

export const disposeShared = (): void => {
  matCache.forEach((m) => m.dispose());
  matCache.clear();
  geoCache.forEach((g) => g.dispose());
  geoCache.clear();
};
