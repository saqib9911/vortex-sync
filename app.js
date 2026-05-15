const canvas = document.getElementById('vortex-canvas'), ctx = canvas.getContext('2d'), 
      video = document.getElementById('camera-feed'), status = document.getElementById('status');
let isRunning = false, filePackage = null, rxBuffer = "";

// 1. File Selection
function loadFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
        // Safe stringification
        const rawData = JSON.stringify({n: f.name, d: ev.target.result});
        filePackage = btoa(unescape(encodeURIComponent(rawData)));
        status.innerText = "Loaded: " + f.name;
        status.style.color = "#00ffcc";
    };
    r.readAsDataURL(f);
}

// 2. Mode Switch
function setMode(m) {
    stopAll(); // Pehle sab kuch saaf karo
    isRunning = true;
    if(m === 'send') {
        if(!filePackage) return alert("Select file first!");
        startTx();
    } else {
        rxBuffer = "";
        video.classList.remove('hidden');
        startRx();
    }
}

// 3. Sender
function startTx() {
    let p = 0;
    function draw() {
        if(!isRunning) return;
        ctx.fillStyle = "#000"; ctx.fillRect(0,0,canvas.width,canvas.height);
        const pts = [{x:0.5,y:0.2},{x:0.8,y:0.5},{x:0.5,y:0.8},{x:0.2,y:0.5}];
        pts.forEach((pt,i) => {
            const char = filePackage[p+i];
            ctx.fillStyle = char ? "#00ffcc" : "#022"; 
            ctx.beginPath(); ctx.arc(pt.x*canvas.width, pt.y*canvas.height, 30, 0, 7); ctx.fill();
        });
        p = (p + 4 >= filePackage.length) ? 0 : p + 4;
        requestAnimationFrame(draw);
    }
    draw();
}

// 4. Receiver
async function startRx() {
    try {
        const s = await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
        video.srcObject = s;
        function listen() {
            if(!isRunning) return;
            ctx.drawImage(video, 0,0, canvas.width, canvas.height);
            let bits = ""; 
            [{x:0.5,y:0.2},{x:0.8,y:0.5},{x:0.5,y:0.8},{x:0.2,y:0.5}].forEach(pt => {
                let pix = ctx.getImageData(pt.x*canvas.width, pt.y*canvas.height, 1,1).data;
                bits += (pix[0]+pix[1]+pix[2])/3 > 130 ? "1" : "0";
            });
            
            if(bits !== "0000") {
                rxBuffer += bits; // Store raw bits
                status.innerText = "Syncing: " + rxBuffer.length;
            }

            // Transfer complete hone par auto-save (Logic adjusted for stability)
            if(rxBuffer.length > 2000 && rxBuffer.endsWith("00000000")) saveFile();
            requestAnimationFrame(listen);
        }
        listen();
    } catch(e) { status.innerText = "Camera Denied"; }
}

function saveFile() {
    try {
        isRunning = false;
        const decoded = decodeURIComponent(escape(atob(rxBuffer))); // Buffer conversion logic
        const obj = JSON.parse(decoded);
        const a = document.createElement('a'); a.href = obj.d; a.download = obj.n; a.click();
        status.innerText = "File Saved!";
        stopAll();
    } catch(e) { status.innerText = "Syncing..."; }
}

function stopAll() {
    isRunning = false;
    if(video.srcObject) video.srcObject.getTracks().forEach(t => t.stop());
    video.classList.add('hidden');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    rxBuffer = "";
}
