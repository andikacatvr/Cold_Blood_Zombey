import struct
import json
import os

def inspect_glb(path):
    print(f'=== {path} ===')
    if not os.path.exists(path):
        print("File does not exist!")
        return
    file_size = os.path.getsize(path)
    print(f'File size: {file_size} bytes')
    with open(path, 'rb') as f:
        magic, version, length = struct.unpack('<4sII', f.read(12))
        chunk_len, chunk_type = struct.unpack('<II', f.read(8))
        json_bytes = f.read(chunk_len).rstrip(b' \x00')
        gltf = json.loads(json_bytes.decode('utf-8'))
        print('Nodes:', json.dumps(gltf.get('nodes', []), indent=2))
        print('Meshes:', len(gltf.get('meshes', [])))
        for i, m in enumerate(gltf.get('meshes', [])):
            print(f"  Mesh {i}: {m.get('name')}, primitives: {len(m.get('primitives', []))}")
            for p_idx, p in enumerate(m.get('primitives', [])):
                pos_idx = p['attributes']['POSITION']
                pos_acc = gltf['accessors'][pos_idx]
                mat_idx = p.get('material')
                mat_name = gltf['materials'][mat_idx].get('name') if mat_idx is not None and 'materials' in gltf else 'None'
                print(f"    Prim {p_idx}: Mat={mat_name}, Pos min={pos_acc.get('min')}, max={pos_acc.get('max')}, count={pos_acc.get('count')}")
        print('Materials:', len(gltf.get('materials', [])))
        for mat in gltf.get('materials', []):
            print('  Material:', mat.get('name'), mat.get('pbrMetallicRoughness', {}))
        print('Textures:', len(gltf.get('textures', [])))
        print('Images:', len(gltf.get('images', [])))
        for img in gltf.get('images', []):
            print('  Image:', img.get('name'), img.get('mimeType'), 'bufferView:', img.get('bufferView'))

if __name__ == '__main__':
    inspect_glb('ps2_twintail_hair.glb')
    inspect_glb('public/models/nona_batavia.glb')
