const THREE = window.THREE;

    /* =========================================================================
       PROCEDURAL TEXTURES (SNOW, DRIPPING BLOOD, HOUSE, NUN ROBE)
       ========================================================================= */
    function createProceduralTexture(type) {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const ctx = c.getContext('2d');

      if (type === 'snow') {
        ctx.fillStyle = '#dde5eb';
        ctx.fillRect(0, 0, 64, 64);
        for (let i = 0; i < 400; i++) {
          ctx.fillStyle = Math.random() > 0.5 ? '#e9f1f5' : '#cad4dc';
          ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
        }
        for (let i = 0; i < 30; i++) {
          ctx.fillStyle = '#b1bec8';
          ctx.fillRect(Math.random() * 64, Math.random() * 64, 3, 2);
        }
      } else if (type === 'blood_on_snow') {
        ctx.clearRect(0, 0, 64, 64);
        ctx.fillStyle = '#5c0206';
        ctx.beginPath();
        ctx.arc(32, 32, 22, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#9b0b13';
        ctx.beginPath();
        ctx.arc(31, 31, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#c71f28';
        ctx.beginPath();
        ctx.arc(28, 27, 8, 0, Math.PI * 2);
        ctx.arc(35, 34, 6, 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < 35; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = 14 + Math.random() * 15;
          ctx.fillStyle = Math.random() > 0.4 ? '#80060c' : '#b2131b';
          ctx.fillRect(32 + Math.cos(a) * r, 32 + Math.sin(a) * r, 2, 2);
        }
      } else if (type === 'drip_droplet') {
        ctx.clearRect(0, 0, 64, 64);
        ctx.fillStyle = '#7a050b';
        ctx.beginPath();
        ctx.arc(32, 32, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#b8121a';
        ctx.beginPath();
        ctx.arc(30, 30, 11, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'clapboard_white') {
        ctx.fillStyle = '#edf2f5';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#cbd6dd';
        for (let y = 0; y < 64; y += 8) {
          ctx.fillRect(0, y, 64, 1);
        }
      } else if (type === 'nun_bloody_face') {
        // Pale face streaked with tears and vertical streams of blood from eyes/mouth
        ctx.fillStyle = '#b8c3cb';
        ctx.fillRect(0, 0, 64, 64);

        // Dark hollow eye sockets
        ctx.fillStyle = '#222830';
        ctx.fillRect(16, 22, 10, 8);
        ctx.fillRect(38, 22, 10, 8);

        // Bleeding tears pouring down cheeks
        ctx.fillStyle = '#8f0c15';
        ctx.fillRect(18, 28, 6, 28);
        ctx.fillRect(40, 28, 6, 28);

        // Bloody mouth and jawline
        ctx.fillStyle = '#65060d';
        ctx.fillRect(22, 46, 20, 10);
        ctx.fillStyle = '#a8121e';
        ctx.fillRect(24, 52, 16, 12);
      } else if (type === 'wood_planks') {
        ctx.fillStyle = '#3a271c';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#22150e';
        for (let y = 0; y < 64; y += 12) {
          ctx.fillRect(0, y, 64, 2);
        }
        ctx.fillStyle = '#4e3527';
        for (let i = 0; i < 240; i++) {
          ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 1);
        }
      } else if (type === 'fireplace_brick') {
        ctx.fillStyle = '#3a211e';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#180e0c';
        for (let y = 0; y < 64; y += 8) {
          ctx.fillRect(0, y, 64, 1);
          const offset = (y % 16 === 0) ? 0 : 16;
          for (let x = offset; x < 64; x += 32) {
            ctx.fillRect(x, y, 1, 8);
          }
        }
      } else if (type === 'cream_wood_cabin') {
        // Warm rustic cream clapboard timber
        ctx.fillStyle = '#eeddc6';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#caa988';
        for (let y = 0; y < 64; y += 8) {
          ctx.fillRect(0, y, 64, 1.5);
        }
        ctx.fillStyle = '#faf0e2';
        for (let i = 0; i < 220; i++) {
          ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 1);
        }
      } else if (type === 'cream_barn_wood') {
        // Vertical cream barn wood panels
        ctx.fillStyle = '#e8d8be';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#c5af92';
        for (let x = 0; x < 64; x += 8) {
          ctx.fillRect(x, 0, 1.5, 64);
        }
        ctx.fillStyle = '#f5ebdc';
        for (let i = 0; i < 180; i++) {
          ctx.fillRect(Math.random() * 64, Math.random() * 64, 1, 3);
        }
      } else if (type === 'cream_stone_wall') {
        // Warm cream limestone masonry blocks
        ctx.fillStyle = '#e6d8c4';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#bda890';
        for (let y = 0; y < 64; y += 12) {
          ctx.fillRect(0, y, 64, 2);
          const offset = (y % 24 === 0) ? 0 : 16;
          for (let x = offset; x < 64; x += 32) {
            ctx.fillRect(x, y, 2, 12);
          }
        }
        ctx.fillStyle = '#f5ede2';
        for (let i = 0; i < 150; i++) {
          ctx.fillRect(Math.random() * 64, Math.random() * 64, 1, 2);
        }
      } else if (type === 'l4d_flannel_red') {
        // Classic Left 4 Dead Lumberjack / Survivor Flannel Shirt (Red & Charcoal Buffalo Check)
        ctx.fillStyle = '#8f1a22';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#1e1619';
        for (let y = 0; y < 64; y += 8) {
          for (let x = 0; x < 64; x += 8) {
            if ((Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0) {
              ctx.fillRect(x, y, 8, 8);
            }
          }
        }
        // Frayed tears & dried arterial blood splatter
        ctx.fillStyle = '#520308';
        for (let i = 0; i < 70; i++) {
          ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 3);
        }
        ctx.fillStyle = '#c7242e';
        for (let i = 0; i < 30; i++) {
          ctx.fillRect(Math.random() * 64, Math.random() * 64, 1, 1);
        }
      } else if (type === 'l4d_hoodie_grey') {
        // Athletic street runner heather-grey hoodie with grime & blood
        ctx.fillStyle = '#3a3f45';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#2a2e33';
        for (let i = 0; i < 200; i++) {
          ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 1);
        }
        // Collar & chest blood drips
        ctx.fillStyle = '#6e070e';
        for (let y = 0; y < 32; y += 4) {
          ctx.fillRect(18 + (y % 6) * 4, y, 3, 12);
        }
      } else if (type === 'l4d_patient_white') {
        // Soiled hospital patient gown with bile stains & blood smears
        ctx.fillStyle = '#b2c4ba';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#7a856a';
        for (let i = 0; i < 80; i++) {
          ctx.fillRect(Math.random() * 64, Math.random() * 64, 3, 2);
        }
        ctx.fillStyle = '#7a050d';
        for (let i = 0; i < 60; i++) {
          ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 4);
        }
      } else if (type === 'l4d_bruiser_work') {
        // Heavy worker / mechanic canvas vest with grease & gore
        ctx.fillStyle = '#8a5c36';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#241a14';
        for (let i = 0; i < 150; i++) {
          ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
        }
        ctx.fillStyle = '#61060c';
        for (let i = 0; i < 40; i++) {
          ctx.fillRect(Math.random() * 64, Math.random() * 64, 3, 3);
        }
      } else if (type === 'l4d_denim_blue') {
        // Worn denim jeans with torn knee threads
        ctx.fillStyle = '#263b4f';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#162330';
        for (let y = 0; y < 64; y += 4) {
          ctx.fillRect(0, y, 64, 1);
        }
        ctx.fillStyle = '#3f5870';
        for (let i = 0; i < 120; i++) {
          ctx.fillRect(Math.random() * 64, Math.random() * 64, 1, 2);
        }
        // Dirt & knee scuffs
        ctx.fillStyle = '#473a2e';
        ctx.fillRect(16, 24, 14, 16);
        ctx.fillRect(36, 28, 14, 14);
      } else if (type === 'l4d_dark_jeans') {
        // Charcoal tattered pants
        ctx.fillStyle = '#222528';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#141618';
        for (let i = 0; i < 180; i++) {
          ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 1);
        }
      } else if (type === 'l4d_zombie_face') {
        // Left 4 Dead Common Infected snarling undead face
        ctx.fillStyle = '#6b7d70';
        ctx.fillRect(0, 0, 64, 64);
        // Dark sunken hollow eye sockets
        ctx.fillStyle = '#161d18';
        ctx.fillRect(14, 18, 12, 10);
        ctx.fillRect(38, 18, 12, 10);
        // Glaring diseased milky cataracts / feverish white-yellow pupils
        ctx.fillStyle = '#fffae0';
        ctx.fillRect(18, 21, 5, 5);
        ctx.fillRect(42, 21, 5, 5);
        // Exposed snarling mouth & jagged rotting teeth
        ctx.fillStyle = '#2b0206';
        ctx.fillRect(16, 42, 32, 16);
        ctx.fillStyle = '#ddd8b8'; // Teeth
        for (let x = 18; x < 46; x += 4) {
          ctx.fillRect(x, 43, 2.5, 3.5); // Top teeth
          ctx.fillRect(x, 52, 2.5, 3.5); // Bottom teeth
        }
        // Dripping blood from mouth & chin
        ctx.fillStyle = '#820811';
        ctx.fillRect(20, 56, 8, 8);
        ctx.fillRect(36, 56, 8, 8);
      } else if (type === 'l4d_necrotic_skin') {
        // Necrotic decaying pale skin with purple veins & scabs
        ctx.fillStyle = '#6e7e72';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#3a473e';
        for (let i = 0; i < 90; i++) {
          ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 1);
        }
        ctx.fillStyle = '#7a050d';
        for (let i = 0; i < 40; i++) {
          ctx.fillRect(Math.random() * 64, Math.random() * 64, 1, 3);
        }
      } else if (type === 'asphalt_road') {
        c.width = 64; c.height = 64;
        ctx.fillStyle = '#181b20';
        ctx.fillRect(0, 0, 64, 64);
        for (let i = 0; i < 300; i++) {
          ctx.fillStyle = Math.random() > 0.5 ? '#242830' : '#111317';
          ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
        }
        // Snowy tire tracks on asphalt
        ctx.fillStyle = 'rgba(215, 230, 240, 0.42)';
        ctx.fillRect(8, 0, 12, 64);
        ctx.fillRect(44, 0, 12, 64);
        // Yellow road center divider dashes
        ctx.fillStyle = '#cca028';
        ctx.fillRect(30, 6, 4, 22);
        ctx.fillRect(30, 38, 4, 22);
      } else if (type === 'l4d_bloody_claws') {
        // Rotting clawed hands with dark coagulated blood
        ctx.fillStyle = '#5c6b60';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#6e070e';
        ctx.fillRect(0, 24, 64, 40);
        ctx.fillStyle = '#1a0104';
        for (let i = 0; i < 40; i++) {
          ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
        }
      } else if (type === 'andika_sweater') {
        // Green & ivory white knit horizontal stripes matching concept art
        c.width = 64; c.height = 64;
        ctx.fillStyle = '#2f5938';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#e2ede6';
        for (let y = 0; y < 64; y += 16) {
          ctx.fillRect(0, y, 64, 8);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        for (let y = 0; y < 64; y += 2) {
          ctx.fillRect(0, y, 64, 0.6);
        }
      } else if (type === 'andika_cargo') {
        // Dark black cargo fabric with stitched seams & pocket flaps
        c.width = 64; c.height = 64;
        ctx.fillStyle = '#1a1b1f';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#292a33';
        for (let i = 0; i < 80; i++) {
          ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
        }
        ctx.strokeStyle = '#3d3f4c';
        ctx.lineWidth = 1.6;
        ctx.strokeRect(6, 10, 52, 42);
        ctx.strokeRect(14, 18, 36, 26);
      } else if (type === 'andika_face') {
        // Asian female face with mischievous toothy grin
        c.width = 64; c.height = 64;
        ctx.fillStyle = '#e8c4ab';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = 'rgba(215, 120, 110, 0.25)';
        ctx.beginPath();
        ctx.arc(16, 36, 10, 0, Math.PI * 2);
        ctx.arc(48, 36, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#161210';
        ctx.beginPath();
        ctx.ellipse(20, 24, 7, 3.5, 0.08, 0, Math.PI * 2);
        ctx.ellipse(44, 24, 7, 3.5, -0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5c3523';
        ctx.fillRect(19, 23, 3, 3);
        ctx.fillRect(43, 23, 3, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(20, 23, 1, 1);
        ctx.fillRect(44, 23, 1, 1);
        ctx.strokeStyle = '#1d1512';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(13, 18); ctx.quadraticCurveTo(20, 15, 27, 18);
        ctx.moveTo(37, 18); ctx.quadraticCurveTo(44, 15, 51, 18);
        ctx.stroke();
        ctx.fillStyle = '#c79f84';
        ctx.fillRect(31, 31, 3, 3);
        ctx.fillStyle = '#401317';
        ctx.beginPath();
        ctx.moveTo(20, 44);
        ctx.quadraticCurveTo(32, 53, 44, 43);
        ctx.quadraticCurveTo(32, 45, 20, 44);
        ctx.fill();
        ctx.fillStyle = '#f5f7f6';
        ctx.fillRect(23, 44.5, 18, 3.5);
        ctx.strokeStyle = '#9c424a';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = '#15161a';
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(64, 0); ctx.lineTo(64, 14);
        ctx.lineTo(48, 12); ctx.lineTo(38, 16); ctx.lineTo(32, 8);
        ctx.lineTo(26, 16); ctx.lineTo(16, 12); ctx.lineTo(0, 14);
        ctx.closePath();
        ctx.fill();
      } else if (type === 'katz_street_sign') {
        c.width = 128; c.height = 32;
        ctx.fillStyle = '#143820';
        ctx.fillRect(0, 0, 128, 32);
        ctx.strokeStyle = '#e6efe9';
        ctx.lineWidth = 2;
        ctx.strokeRect(3, 3, 122, 26);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Katz St', 64, 16);
      } else if (type === 'martin_street_sign') {
        c.width = 128; c.height = 32;
        ctx.fillStyle = '#143820';
        ctx.fillRect(0, 0, 128, 32);
        ctx.strokeStyle = '#e6efe9';
        ctx.lineWidth = 2;
        ctx.strokeRect(3, 3, 122, 26);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Martin St', 64, 16);
      } else if (type === 'parking_sign') {
        c.width = 64; c.height = 96;
        ctx.fillStyle = '#e8eeea';
        ctx.fillRect(0, 0, 64, 96);
        ctx.strokeStyle = '#1d4872';
        ctx.lineWidth = 3;
        ctx.strokeRect(4, 4, 56, 88);
        ctx.fillStyle = '#1d4872';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PARKING', 32, 34);
        ctx.font = 'bold 13px monospace';
        ctx.fillText('1 HOUR', 32, 58);
      } else if (type === 'gutter_grate') {
        c.width = 64; c.height = 64;
        ctx.fillStyle = '#1e2124';
        ctx.fillRect(0, 0, 64, 64);
        ctx.strokeStyle = '#32363b';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, 60, 60);
        ctx.fillStyle = '#0a0b0d';
        for (let x = 8; x < 58; x += 7) {
          ctx.fillRect(x, 6, 4, 52);
        }
      } else if (type === 'storefront_brick') {
        c.width = 64; c.height = 64;
        ctx.fillStyle = '#4c2e28';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#221512';
        for (let y = 0; y < 64; y += 8) {
          ctx.fillRect(0, y, 64, 1.5);
          const off = (y % 16 === 0) ? 0 : 16;
          for (let x = off; x < 64; x += 32) {
            ctx.fillRect(x, y, 1.5, 8);
          }
        }
        ctx.fillStyle = '#6e443c';
        for (let i = 0; i < 90; i++) {
          ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 1);
        }
      } else if (type === 'awning_fabric') {
        c.width = 64; c.height = 64;
        ctx.fillStyle = '#22303d';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#18222b';
        for (let x = 0; x < 64; x += 12) {
          ctx.fillRect(x, 0, 6, 64);
        }
      } else if (type === 'concrete_curb') {
        c.width = 64; c.height = 64;
        ctx.fillStyle = '#5c636a';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#44494f';
        for (let i = 0; i < 200; i++) {
          ctx.fillRect(Math.random() * 64, Math.random() * 64, 1.5, 1.5);
        }
      } else if (type === 'andika_sneaker') {
        c.width = 64; c.height = 64;
        ctx.fillStyle = '#222328';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#e4ece8';
        ctx.fillRect(0, 48, 64, 16);
        ctx.fillStyle = '#b5c0b8';
        ctx.fillRect(0, 46, 64, 2);
        ctx.strokeStyle = '#f0f5f2';
        ctx.lineWidth = 2;
        for (let y = 14; y < 42; y += 7) {
          ctx.beginPath();
          ctx.moveTo(20, y); ctx.lineTo(44, y);
          ctx.stroke();
        }
      } else if (type === 'river_water') {
        c.width = 128; c.height = 128;
        ctx.fillStyle = '#22556b';
        ctx.fillRect(0, 0, 128, 128);
        for (let y = 0; y < 128; y += 8) {
          ctx.fillStyle = (y % 16 === 0) ? '#2e6f8a' : '#3781a0';
          ctx.fillRect(0, y, 128, 4);
        }
        for (let i = 0; i < 90; i++) {
          ctx.fillStyle = Math.random() > 0.5 ? '#6dc0dd' : '#aee3f5';
          ctx.fillRect(Math.random() * 128, Math.random() * 128, 6, 2);
        }
      } else if (type === 'waterfall_stream') {
        c.width = 256; c.height = 256;
        const grad = ctx.createLinearGradient(0, 0, 256, 0);
        grad.addColorStop(0, '#225570');
        grad.addColorStop(0.25, '#357d9e');
        grad.addColorStop(0.5, '#4496bd');
        grad.addColorStop(0.75, '#357d9e');
        grad.addColorStop(1, '#225570');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);

        // Churning turbulent vertical rapids
        for (let x = 0; x < 256; x += 2) {
          const alpha = 0.25 + Math.sin(x * 0.15) * 0.2 + Math.random() * 0.35;
          ctx.fillStyle = `rgba(195, 240, 255, ${alpha.toFixed(2)})`;
          const w = 1 + Math.floor(Math.random() * 3);
          ctx.fillRect(x, 0, w, 256);
        }

        // Foaming water bubbles and white water streaks
        for (let i = 0; i < 400; i++) {
          const rx = Math.random() * 256;
          const ry = Math.random() * 256;
          const rh = 6 + Math.random() * 22;
          const rw = 1.5 + Math.random() * 3.5;
          const op = 0.45 + Math.random() * 0.55;
          ctx.fillStyle = `rgba(255, 255, 255, ${op.toFixed(2)})`;
          ctx.fillRect(rx, ry, rw, rh);
        }

        // Froth foam bubbles
        for (let i = 0; i < 220; i++) {
          const bx = Math.random() * 256;
          const by = Math.random() * 256;
          const br = 1 + Math.random() * 2.5;
          ctx.fillStyle = 'rgba(235, 250, 255, 0.75)';
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (type === 'waterfall_mist') {
        c.width = 64; c.height = 64;
        const rad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
        rad.addColorStop(0, 'rgba(240, 250, 255, 0.95)');
        rad.addColorStop(0.35, 'rgba(215, 240, 252, 0.55)');
        rad.addColorStop(0.75, 'rgba(190, 225, 245, 0.18)');
        rad.addColorStop(1, 'rgba(180, 215, 240, 0)');
        ctx.fillStyle = rad;
        ctx.fillRect(0, 0, 64, 64);
      } else if (type === 'waterfall_top_stream') {
        c.width = 256; c.height = 256;
        // High-definition alpine glacial water rushing towards the cliff precipice
        const grad = ctx.createLinearGradient(0, 0, 256, 0);
        grad.addColorStop(0, '#1c4961');
        grad.addColorStop(0.2, '#286280');
        grad.addColorStop(0.5, '#3e8fb8');
        grad.addColorStop(0.8, '#286280');
        grad.addColorStop(1, '#1c4961');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);

        // Longitudinal high-speed current bands
        for (let y = 0; y < 256; y += 4) {
          const streamAlpha = 0.25 + Math.sin(y * 0.12) * 0.15;
          ctx.fillStyle = `rgba(135, 215, 245, ${streamAlpha.toFixed(2)})`;
          ctx.fillRect(0, y, 256, 2);
        }

        // Forward accelerating white rapids filaments
        for (let i = 0; i < 320; i++) {
          const rx = Math.random() * 256;
          const ry = Math.random() * 256;
          const rw = 4 + Math.random() * 18;
          const rh = 1.5 + Math.random() * 2.5;
          const op = 0.35 + Math.random() * 0.55;
          ctx.fillStyle = `rgba(225, 248, 255, ${op.toFixed(2)})`;
          ctx.fillRect(rx, ry, rw, rh);
        }

        // Glacial blue swirl flecks
        for (let i = 0; i < 180; i++) {
          const fx = Math.random() * 256;
          const fy = Math.random() * 256;
          ctx.fillStyle = '#bcebff';
          ctx.fillRect(fx, fy, 2, 2);
        }
      } else if (type === 'waterfall_crest_foam') {
        c.width = 256; c.height = 128;
        // Agitated white water froth and spray at the cliff lip
        ctx.fillStyle = 'rgba(165, 225, 248, 0.45)';
        ctx.fillRect(0, 0, 256, 128);

        for (let i = 0; i < 600; i++) {
          const bx = Math.random() * 256;
          const by = Math.random() * 128;
          const bw = 3 + Math.random() * 12;
          const bh = 2 + Math.random() * 6;
          const op = 0.5 + Math.random() * 0.5;
          ctx.fillStyle = `rgba(255, 255, 255, ${op.toFixed(2)})`;
          ctx.fillRect(bx, by, bw, bh);
        }

        for (let i = 0; i < 250; i++) {
          const fx = Math.random() * 256;
          const fy = Math.random() * 128;
          const fr = 1 + Math.random() * 3.5;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.beginPath();
          ctx.arc(fx, fy, fr, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (type === 'chainlink_fence') {
        c.width = 256;
        c.height = 256;
        ctx.clearRect(0, 0, 256, 256);

        const step = 64;
        // 1. Dark wire shadow / ambient occlusion outline
        ctx.lineWidth = 4.6;
        ctx.strokeStyle = 'rgba(12, 16, 20, 0.95)';
        for (let i = -256; i <= 512; i += step) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i + 256, 256);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(i, 256);
          ctx.lineTo(i + 256, 0);
          ctx.stroke();
        }

        // 2. Galvanized steel wire core
        ctx.lineWidth = 2.8;
        ctx.strokeStyle = '#9eb0be';
        for (let i = -256; i <= 512; i += step) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i + 256, 256);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(i, 256);
          ctx.lineTo(i + 256, 0);
          ctx.stroke();
        }

        // 3. Highlight frost/metallic glint
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(235, 245, 255, 0.85)';
        for (let i = -256; i <= 512; i += step) {
          ctx.beginPath();
          ctx.moveTo(i - 0.8, 0);
          ctx.lineTo(i + 256 - 0.8, 256);
          ctx.stroke();
        }

        // 4. Interlocking knuckle twists at diamond vertex intersections
        ctx.fillStyle = '#b8c8d4';
        for (let y = 0; y <= 256; y += step) {
          for (let x = 0; x <= 256; x += step) {
            if ((x + y) % (step * 2) === 0) {
              ctx.beginPath();
              ctx.arc(x, y, 3.2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      const tex = new THREE.CanvasTexture(c);
      tex.generateMipmaps = true;
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      return tex;
    }

    const snowTex = createProceduralTexture('snow');
    snowTex.wrapS = THREE.RepeatWrapping;
    snowTex.wrapT = THREE.RepeatWrapping;
    snowTex.repeat.set(24, 24);

    const bloodSnowTex = createProceduralTexture('blood_on_snow');
    const bloodDripTex = createProceduralTexture('drip_droplet');
    const houseWallTex = createProceduralTexture('clapboard_white');
    houseWallTex.wrapS = THREE.RepeatWrapping;
    houseWallTex.wrapT = THREE.RepeatWrapping;
    houseWallTex.repeat.set(4, 4);

    const woodPlanksTex = createProceduralTexture('wood_planks');
    woodPlanksTex.wrapS = THREE.RepeatWrapping;
    woodPlanksTex.wrapT = THREE.RepeatWrapping;
    woodPlanksTex.repeat.set(4, 4);

    const brickHearthTex = createProceduralTexture('fireplace_brick');
    brickHearthTex.wrapS = THREE.RepeatWrapping;
    brickHearthTex.wrapT = THREE.RepeatWrapping;
    brickHearthTex.repeat.set(2, 2);

    // Cream textures for all other village houses (bukan hitam)
    const creamCabinTex = createProceduralTexture('cream_wood_cabin');
    creamCabinTex.wrapS = THREE.RepeatWrapping;
    creamCabinTex.wrapT = THREE.RepeatWrapping;
    creamCabinTex.repeat.set(4, 4);

    const creamBarnTex = createProceduralTexture('cream_barn_wood');
    creamBarnTex.wrapS = THREE.RepeatWrapping;
    creamBarnTex.wrapT = THREE.RepeatWrapping;
    creamBarnTex.repeat.set(4, 4);

    const creamStoneTex = createProceduralTexture('cream_stone_wall');
    creamStoneTex.wrapS = THREE.RepeatWrapping;
    creamStoneTex.wrapT = THREE.RepeatWrapping;
    creamStoneTex.repeat.set(3, 3);

    const nunFaceTex = createProceduralTexture('nun_bloody_face');

    // Left 4 Dead Infected procedural textures
    const l4dFlannelTex = createProceduralTexture('l4d_flannel_red');
    const l4dHoodieTex = createProceduralTexture('l4d_hoodie_grey');
    const l4dPatientTex = createProceduralTexture('l4d_patient_white');
    const l4dBruiserTex = createProceduralTexture('l4d_bruiser_work');
    const l4dDenimTex = createProceduralTexture('l4d_denim_blue');
    const l4dDarkPantsTex = createProceduralTexture('l4d_dark_jeans');
    const l4dFaceTex = createProceduralTexture('l4d_zombie_face');
    const l4dNecroticSkinTex = createProceduralTexture('l4d_necrotic_skin');
    const l4dClawsTex = createProceduralTexture('l4d_bloody_claws');

    // ANDIKA (Def Jam PS2 Character) Textures
    const andikaSweaterTex = createProceduralTexture('andika_sweater');
    andikaSweaterTex.wrapS = THREE.RepeatWrapping;
    andikaSweaterTex.wrapT = THREE.RepeatWrapping;
    andikaSweaterTex.repeat.set(2, 2);

    const andikaCargoTex = createProceduralTexture('andika_cargo');
    andikaCargoTex.wrapS = THREE.RepeatWrapping;
    andikaCargoTex.wrapT = THREE.RepeatWrapping;
    andikaCargoTex.repeat.set(1, 2);

    const andikaFaceTex = createProceduralTexture('andika_face');
    const andikaSneakerTex = createProceduralTexture('andika_sneaker');
    const katzSignTex = createProceduralTexture('katz_street_sign');
    const martinSignTex = createProceduralTexture('martin_street_sign');
    const parkingSignTex = createProceduralTexture('parking_sign');
    const drainGrateTex = createProceduralTexture('gutter_grate');
    const storefrontBrickTex = createProceduralTexture('storefront_brick');
    const awningFabricTex = createProceduralTexture('awning_fabric');
    const concreteCurbTex = createProceduralTexture('concrete_curb');


    const asphaltRoadTex = createProceduralTexture('asphalt_road');
    asphaltRoadTex.wrapS = THREE.RepeatWrapping;
    asphaltRoadTex.wrapT = THREE.RepeatWrapping;
    asphaltRoadTex.repeat.set(1, 32);

    const riverWaterTex = createProceduralTexture('river_water');
    riverWaterTex.wrapS = THREE.RepeatWrapping;
    riverWaterTex.wrapT = THREE.RepeatWrapping;
    riverWaterTex.repeat.set(2, 16);

    const waterfallTex = createProceduralTexture('waterfall_stream');
    waterfallTex.wrapS = THREE.RepeatWrapping;
    waterfallTex.wrapT = THREE.RepeatWrapping;
    waterfallTex.repeat.set(2, 4);

    const waterfallMistTex = createProceduralTexture('waterfall_mist');

    const topStreamTex = createProceduralTexture('waterfall_top_stream');
    topStreamTex.wrapS = THREE.RepeatWrapping;
    topStreamTex.wrapT = THREE.RepeatWrapping;
    topStreamTex.repeat.set(2, 8);

    const crestFoamTex = createProceduralTexture('waterfall_crest_foam');
    crestFoamTex.wrapS = THREE.RepeatWrapping;
    crestFoamTex.wrapT = THREE.RepeatWrapping;
    crestFoamTex.repeat.set(2, 1);

    const chainlinkTex = createProceduralTexture('chainlink_fence');
    chainlinkTex.wrapS = THREE.RepeatWrapping;
    chainlinkTex.wrapT = THREE.RepeatWrapping;

export const textures = {
  createProceduralTexture,
  snowTex,
  asphaltRoadTex,
  riverWaterTex,
  waterfallTex,
  waterfallMistTex,
  topStreamTex,
  crestFoamTex,
  chainlinkTex,
  bloodSnowTex,
  bloodDripTex,
  houseWallTex,
  woodPlanksTex,
  brickHearthTex,
  creamCabinTex,
  creamBarnTex,
  creamStoneTex,
  nunFaceTex,
  l4dFlannelTex,
  l4dHoodieTex,
  l4dPatientTex,
  l4dBruiserTex,
  l4dDenimTex,
  l4dDarkPantsTex,
  l4dFaceTex,
  l4dNecroticSkinTex,
  l4dClawsTex,
  andikaSweaterTex,
  andikaCargoTex,
  andikaFaceTex,
  andikaSneakerTex,
  katzSignTex,
  martinSignTex,
  parkingSignTex,
  drainGrateTex,
  storefrontBrickTex,
  awningFabricTex,
  concreteCurbTex
};

export { createProceduralTexture, snowTex, asphaltRoadTex, riverWaterTex, waterfallTex, waterfallMistTex, topStreamTex, crestFoamTex, chainlinkTex, bloodSnowTex, bloodDripTex, houseWallTex, woodPlanksTex, brickHearthTex, creamCabinTex, creamBarnTex, creamStoneTex, nunFaceTex, l4dFlannelTex, l4dHoodieTex, l4dPatientTex, l4dBruiserTex, l4dDenimTex, l4dDarkPantsTex, l4dFaceTex, l4dNecroticSkinTex, l4dClawsTex, andikaSweaterTex, andikaCargoTex, andikaFaceTex, andikaSneakerTex, katzSignTex, martinSignTex, parkingSignTex, drainGrateTex, storefrontBrickTex, awningFabricTex, concreteCurbTex };

