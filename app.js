const canvas = document.getElementById('vortex-canvas'), ctx = canvas.getContext('2d'), 
      video = document.getElementById('camera-feed'), btn = document.getElementById('mode-btn');
let isSending = true, fileBase64 = "", rxData = "";

function loadFile(e) {
    const f = e.target.files[0]; const r = new FileReader();
    r.onload = (e) => { fileBase64 = JSON.stringify({n: f.name, d: e.target.result}); alert("File Ready"); };
    r.readAsDataURL(f);
}

function switchMode() {
    isSending = !isSending;
    btn.innerText = isSending ? "SEND MODE" : "RECEIVE MODE";
    if(isSending) { stopRx(); startTx(); } else { stopTx(); startRx(); }
}

function startTx() {
    if(!fileBase64) return alert("Select File First!");
    const data = btoa(fileBase64); let p = 0;
    function draw() {
        if(!isSending) return;
        ctx.fillStyle = "#000"; ctx.fillRect(0,0,canvas.width,canvas.height);
        [{x:0.5,y:0.2},{x:0.8,y:0.5},{x:0.5,y:0.8},{x:0.2,y:0.5}].forEach((pt,i) => {
            ctx.fillStyle = (data[p+i] === "1") ? "#00ffcc" : "#022";
            ctx.beginPath(); ctx.arc(pt.x*canvas.width, pt.y*canvas.height, 25, 0, 7); ctx.fill();
        });
        p = (p+4 >= data.length) ? 0 : p+4;
        requestAnimationFrame(draw);
    }
    draw();
}

async function startRx() {
    video.classList.remove('hidden');
    const s = await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
    video.srcObject = s;
    function listen() {
        if(isSending) return;
        ctx.drawImage(video, 0,0, canvas.width, canvas.height);
        let b = ""; [{x:0.5,y:0.2},{x:0.8,y:0.5},{x:0.5,y:0.8},{x:0.2,y:0.5}].forEach(pt => {
            b += ctx.getImageData(pt.x*canvas.width, pt.y*canvas.height, 1,1).data[0] > 120 ? "1" : "0";
        });
        if(b !== "0000") rxData += String.fromCharCode(parseInt(b, 2));
        if(rxData.length > 500) { saveFile(); }
        requestAnimationFrame(listen);
    }
    listen();
}

function saveFile() {
    try {
        const obj = JSON.parse(atob(rxData));
        const a = document.createElement('a'); a.href = obj.d; a.download = obj.n; a.click();
        rxData = ""; alert("File Saved!");
    } catch(e) {}
}

function stopTx() { isSending = false; }
function stopRx() { video.classList.add('hidden'); if(video.srcObject) video.srcObject.getTracks().forEach(t => t.stop()); }
