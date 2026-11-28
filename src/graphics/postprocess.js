/* =========================================================================
   PS2 SURVIVAL HORROR POST-PROCESSING PIPELINE (Pure Three.js r128)
   - Offscreen Scene RenderTarget -> Half-Res Threshold & Separable Bloom
   - Composite Pass: ACES Filmic Tone Mapping + Cold Horror Color Grading
     + Soft Vignette + Subtle Film Grain (Silent Hill 2 / RE4 Atmosphere)
   ========================================================================= */

const THREE = window.THREE;

let rtScene = null;
let rtBloomA = null;
let rtBloomB = null;
let postScene = null;
let postCamera = null;
let postQuad = null;

let matThreshold = null;
let matBlur = null;
let matComposite = null;

let currentW = 0;
let currentH = 0;
const _bufSize = new THREE.Vector2();

const FULLSCREEN_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// 1. Bright-pass threshold for subtle PS2 bloom (lanterns, flashlight, snow glare)
const THRESHOLD_FRAG = `
  uniform sampler2D tDiffuse;
  uniform float uThreshold;
  varying vec2 vUv;

  void main() {
    vec4 col = texture2D(tDiffuse, vUv);
    float luma = dot(col.rgb, vec3(0.2126, 0.7152, 0.0722));
    float soft = smoothstep(uThreshold - 0.15, uThreshold + 0.25, luma);
    gl_FragColor = vec4(col.rgb * soft, 1.0);
  }
`;

// 2. Separable 5-tap Gaussian blur pass
const BLUR_FRAG = `
  uniform sampler2D tDiffuse;
  uniform vec2 uTexelStep;
  varying vec2 vUv;

  void main() {
    vec3 sum = texture2D(tDiffuse, vUv).rgb * 0.2941176;
    sum += texture2D(tDiffuse, vUv + uTexelStep * 1.3846154).rgb * 0.3529412 * 0.5;
    sum += texture2D(tDiffuse, vUv - uTexelStep * 1.3846154).rgb * 0.3529412 * 0.5;
    sum += texture2D(tDiffuse, vUv + uTexelStep * 3.2307692).rgb * 0.0705882;
    sum += texture2D(tDiffuse, vUv - uTexelStep * 3.2307692).rgb * 0.0705882;
    gl_FragColor = vec4(sum, 1.0);
  }
`;

// 3. Final PS2 Composite: Bloom + ACES Filmic + Cold Horror Grade + Vignette + Film Grain
const COMPOSITE_FRAG = `
  uniform sampler2D tDiffuse;
  uniform sampler2D tBloom;
  uniform float uBloomStrength;
  uniform float uTime;
  uniform float uGrainAmount;
  uniform float uVignetteStrength;
  uniform float uDitherScale;
  varying vec2 vUv;

  vec3 acesFilmic(vec3 x) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  // 4x4 Ordered Bayer Dithering (authentic PS1/PS2 fog & shadow banding aesthetic)
  float bayer4x4(vec2 pos) {
    int x = int(mod(pos.x, 4.0));
    int y = int(mod(pos.y, 4.0));
    int index = x + y * 4;
    if (index == 0) return 0.0 / 16.0;
    if (index == 1) return 8.0 / 16.0;
    if (index == 2) return 2.0 / 16.0;
    if (index == 3) return 10.0 / 16.0;
    if (index == 4) return 12.0 / 16.0;
    if (index == 5) return 4.0 / 16.0;
    if (index == 6) return 14.0 / 16.0;
    if (index == 7) return 6.0 / 16.0;
    if (index == 8) return 3.0 / 16.0;
    if (index == 9) return 11.0 / 16.0;
    if (index == 10) return 1.0 / 16.0;
    if (index == 11) return 9.0 / 16.0;
    if (index == 12) return 15.0 / 16.0;
    if (index == 13) return 7.0 / 16.0;
    if (index == 14) return 13.0 / 16.0;
    return 5.0 / 16.0;
  }

  void main() {
    vec3 base = texture2D(tDiffuse, vUv).rgb;
    vec3 bloom = texture2D(tBloom, vUv).rgb;

    // Combine scene + subtle PS2 bloom
    vec3 color = base + bloom * uBloomStrength;

    // ACES Filmic tone mapping + slight exposure calibration
    color = acesFilmic(color * 1.06);

    // Silent Hill / Cry of Fear Grimy Color Grading (desaturated olive-slate shadows + punchy contrast)
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    vec3 desat = mix(color, vec3(luma), 0.26);
    vec3 shadowTint = vec3(0.84, 0.91, 0.92);
    color = mix(desat * shadowTint, desat, smoothstep(0.05, 0.58, luma));
    color = mix(color, smoothstep(0.0, 1.0, color), 0.22);

    // Soft horror vignette around screen edges
    vec2 centered = vUv - 0.5;
    float dist = length(centered) * 1.4142135;
    float vignette = 1.0 - smoothstep(0.50, 1.28, dist) * uVignetteStrength;
    color *= vignette;

    // Subtle PS1/PS2 ordered Bayer dithering + animated film grain
    float dither = (bayer4x4(gl_FragCoord.xy) - 0.5) * uDitherScale;
    float grain = (hash12(vUv * 512.0 + fract(uTime * 17.3)) - 0.5) * uGrainAmount;
    color = clamp(color + dither + grain, 0.0, 1.0);

    gl_FragColor = vec4(color, 1.0);
  }
`;

function ensureInitialized(renderer) {
  if (postScene) return;

  postScene = new THREE.Scene();
  postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  matThreshold = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      uThreshold: { value: 0.72 }
    },
    vertexShader: FULLSCREEN_VERT,
    fragmentShader: THRESHOLD_FRAG,
    depthTest: false,
    depthWrite: false
  });

  matBlur = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      uTexelStep: { value: new THREE.Vector2(1 / 512, 0) }
    },
    vertexShader: FULLSCREEN_VERT,
    fragmentShader: BLUR_FRAG,
    depthTest: false,
    depthWrite: false
  });

  matComposite = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      tBloom: { value: null },
      uBloomStrength: { value: 0.30 },
      uTime: { value: 0 },
      uGrainAmount: { value: 0.026 },
      uVignetteStrength: { value: 0.44 },
      uDitherScale: { value: 0.012 }
    },
    vertexShader: FULLSCREEN_VERT,
    fragmentShader: COMPOSITE_FRAG,
    depthTest: false,
    depthWrite: false
  });

  postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), matComposite);
  postQuad.frustumCulled = false;
  postScene.add(postQuad);

  resizePostProcessing(renderer);
}

export function resizePostProcessing(renderer) {
  if (!renderer) return;
  renderer.getDrawingBufferSize(_bufSize);
  const w = Math.max(2, Math.floor(_bufSize.x));
  const h = Math.max(2, Math.floor(_bufSize.y));
  if (w === currentW && h === currentH && rtScene) return;

  currentW = w;
  currentH = h;

  if (rtScene) rtScene.dispose();
  if (rtBloomA) rtBloomA.dispose();
  if (rtBloomB) rtBloomB.dispose();

  const rtOpts = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    depthBuffer: true,
    stencilBuffer: false
  };
  rtScene = new THREE.WebGLRenderTarget(w, h, rtOpts);

  const bw = Math.max(2, Math.floor(w * 0.5));
  const bh = Math.max(2, Math.floor(h * 0.5));
  const bloomOpts = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    depthBuffer: false,
    stencilBuffer: false
  };
  rtBloomA = new THREE.WebGLRenderTarget(bw, bh, bloomOpts);
  rtBloomB = new THREE.WebGLRenderTarget(bw, bh, bloomOpts);
}

export function renderWithPostProcessing(renderer, scene, camera, timeSec = 0, graphicMode = 'hd') {
  if (!renderer || !scene || !camera) return;

  ensureInitialized(renderer);
  resizePostProcessing(renderer);

  // 1. Render 3D scene into offscreen render target
  renderer.setRenderTarget(rtScene);
  renderer.clear();
  renderer.render(scene, camera);

  // 2. Half-resolution bloom bright-pass
  matThreshold.uniforms.tDiffuse.value = rtScene.texture;
  postQuad.material = matThreshold;
  renderer.setRenderTarget(rtBloomA);
  renderer.render(postScene, postCamera);

  // 3. Separable Gaussian blur (Horizontal -> Vertical)
  const bw = Math.max(2, Math.floor(currentW * 0.5));
  const bh = Math.max(2, Math.floor(currentH * 0.5));
  postQuad.material = matBlur;

  matBlur.uniforms.tDiffuse.value = rtBloomA.texture;
  matBlur.uniforms.uTexelStep.value.set(1.25 / bw, 0.0);
  renderer.setRenderTarget(rtBloomB);
  renderer.render(postScene, postCamera);

  matBlur.uniforms.tDiffuse.value = rtBloomB.texture;
  matBlur.uniforms.uTexelStep.value.set(0.0, 1.25 / bh);
  renderer.setRenderTarget(rtBloomA);
  renderer.render(postScene, postCamera);

  // 4. Final composite to screen
  matComposite.uniforms.tDiffuse.value = rtScene.texture;
  matComposite.uniforms.tBloom.value = rtBloomA.texture;
  matComposite.uniforms.uTime.value = timeSec;
  matComposite.uniforms.uBloomStrength.value = (graphicMode === 'ps1') ? 0.18 : 0.28;
  matComposite.uniforms.uGrainAmount.value = (graphicMode === 'ps1') ? 0.040 : 0.026;
  matComposite.uniforms.uVignetteStrength.value = 0.44;
  matComposite.uniforms.uDitherScale.value = (graphicMode === 'ps1') ? 0.032 : 0.012;

  postQuad.material = matComposite;
  renderer.setRenderTarget(null);
  renderer.render(postScene, postCamera);
}
