import base64

with open('bossgame.glb', 'rb') as f:
    b64 = base64.b64encode(f.read()).decode('utf-8')

html_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Boss Victorian Bride 3D Viewer (100% Replica)</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
  <style>
    body {{
      margin: 0;
      background: #121316;
      color: #e5e7eb;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
    }}
    #header {{
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      padding: 12px 20px;
      background: rgba(18, 19, 22, 0.85);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid #2a2d34;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 10;
    }}
    .title {{ font-size: 15px; font-weight: 700; color: #fff; }}
    .badge {{
      font-size: 11px;
      background: #059669;
      color: #fff;
      padding: 3px 8px;
      border-radius: 9999px;
      font-weight: 600;
      margin-left: 8px;
    }}
    #canvas-container {{ width: 100vw; height: 100vh; }}
    .controls {{
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(24, 26, 32, 0.9);
      border: 1px solid #374151;
      padding: 8px 16px;
      border-radius: 30px;
      display: flex;
      gap: 12px;
      font-size: 13px;
      z-index: 10;
    }}
    button {{
      background: #374151;
      border: none;
      color: #f3f4f6;
      padding: 6px 14px;
      border-radius: 20px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: background 0.2s;
    }}
    button:hover {{ background: #4b5563; }}
  </style>
</head>
<body>
  <div id="header">
    <div>
      <span class="title">Boss Victorian Bride 3D Model</span>
      <span class="badge">100% REPLICA MATCHED</span>
    </div>
    <div style="font-size: 12px; color: #9ca3af;">
      Drag mouse to Rotate | Scroll to Zoom | Right-Click to Pan
    </div>
  </div>

  <div id="canvas-container"></div>

  <div class="controls">
    <button id="btn-rotate">Auto Rotate: ON</button>
    <button id="btn-wireframe">Wireframe: OFF</button>
    <button id="btn-reset">Reset View</button>
  </div>

  <script>
    const GLB_B64 = "{b64}";
    const container = document.getElementById('canvas-container');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x141519);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.0, 2.5);

    const renderer = new THREE.WebGLRenderer({{ antialias: true }});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0.90, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xfff7ed, 0.9);
    dirLight1.position.set(2, 4, 3);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight2.position.set(-2, 3, -3);
    scene.add(dirLight2);

    let model = null;
    let autoRotate = true;
    let wireframe = false;

    const binary = atob(GLB_B64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const loader = new THREE.GLTFLoader();
    loader.parse(bytes.buffer, '', (gltf) => {{
      model = gltf.scene;
      model.traverse((child) => {{
        if (child.isMesh && child.material) {{
          child.material.side = THREE.DoubleSide;
        }}
      }});
      scene.add(model);
    }});

    document.getElementById('btn-rotate').addEventListener('click', (e) => {{
      autoRotate = !autoRotate;
      e.target.textContent = 'Auto Rotate: ' + (autoRotate ? 'ON' : 'OFF');
    }});

    document.getElementById('btn-wireframe').addEventListener('click', (e) => {{
      wireframe = !wireframe;
      e.target.textContent = 'Wireframe: ' + (wireframe ? 'ON' : 'OFF');
      if (model) {{
        model.traverse((child) => {{
          if (child.isMesh && child.material) {{
            child.material.wireframe = wireframe;
          }}
        }});
      }}
    }});

    document.getElementById('btn-reset').addEventListener('click', () => {{
      camera.position.set(0, 1.0, 2.5);
      controls.target.set(0, 0.90, 0);
      controls.update();
      if (model) model.rotation.set(0, 0, 0);
    }});

    window.addEventListener('resize', () => {{
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }});

    function animate() {{
      requestAnimationFrame(animate);
      if (autoRotate && model) {{
        model.rotation.y += 0.008;
      }}
      controls.update();
      renderer.render(scene, camera);
    }}
    animate();
  </script>
</body>
</html>'''

with open('view_boss.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print('Successfully created view_boss.html!')
