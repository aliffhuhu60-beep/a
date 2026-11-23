import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/** Radial blur from the screen centre: a cheap, controlled "speed" motion blur. */
const RadialBlurShader = {
  uniforms: { tDiffuse: { value: null }, uStrength: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uStrength; varying vec2 vUv;
void main(){
  vec2 c = vec2(0.5, 0.55); vec2 d = vUv - c; float m = smoothstep(0.15, 0.7, length(d)) * uStrength;
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 6; i++) { float t = float(i) / 5.0; acc += texture2D(tDiffuse, vUv - d * m * t * 0.06); }
  gl_FragColor = acc / 6.0;
}`,
};

/** Post-processing chain (High quality only): bloom + radial speed blur. */
export class PostFX {
  readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly blur: ShaderPass;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    const size = renderer.getSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.4, 0.5, 0.82);
    this.composer.addPass(this.bloom);
    this.blur = new ShaderPass(RadialBlurShader);
    this.composer.addPass(this.blur);
    this.composer.addPass(new OutputPass());
  }

  setSize(w: number, h: number, pixelRatio: number): void {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(w, h);
  }

  set bloomStrength(v: number) {
    this.bloom.strength = v;
  }

  set motionBlur(v: number) {
    this.blur.uniforms.uStrength.value = v;
    this.blur.enabled = v > 0.02;
  }

  render(dt: number): void {
    this.composer.render(dt);
  }

  dispose(): void {
    this.composer.dispose();
  }
}
