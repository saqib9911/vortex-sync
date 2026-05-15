const canvas = document.getElementById('vortex-canvas'), ctx = canvas.getContext('2d'), 
      video = document.getElementById('camera-feed'), status = document.getElementById('status');
let isRunning = false, filePackage = null, rxBuffer = "";

function loadFile(e) {
    const f = e.target.files[0];
    const r = new FileReader();
    r.onload = (ev) => {
        filePackage = btoa(JSON.stringify({n: f.name, d: ev.target.result}));
        status.innerText = "Ready to send: " + f.name;
        status.classList.add("text-green-400");
    };
    r.readAsDataURL(f);
}

function setMode(m) {
    isRunning = true;
    if(m === 'send') {
        if(!filePackage) return alert("Please select a file first!");
        stopRx(); startTx();
    } else {
        rxBuffer = ""; startRx();
    }
}

function startTx() {
    let p = 0;
    function draw() {
        if(!isRunning) return;
        ctx.fillStyle = "#000"; ctx.fillRect(0,0,canvas.width,canvas.height);
        const pts = [{x:0.5,y:0.2},{x:0.8,y:0.5},{x:0.5,y:0.8},{x:0.2,y:0.5}];
        pts.forEach((pt,i) => {
            ctx.fillStyle = (filePackage[p+i] === "1") ? "#00ffcc" : "#022";
            ctx.beginPath(); ctx.arc(pt.x*canvas.width, pt.y*canvas.height, 30, 0, 7); ctx.fill();
        });
        p = (p+4 >= filePackage.length) ? 0 : p+4;
        requestAnimationFrame(draw);
    }
    draw();
}

async function startRx() {
    video.classList.remove('hidden');
    const s = await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
    video.srcObject = s;
    function listen() {
        if(!isRunning) return;
        ctx.drawImage(video, 0,0, canvas.width, canvas.height);
        let b = ""; 
        [{x:0.5,y:0.2},{x:0.8,y:0.5},{x:0.5,y:0.8},{x:0.2,y:0.5}].forEach(pt => {
            let pix = ctx.getImageData(pt.x*canvas.width, pt.y*canvas.height, 1,1).data;
            b += (pix[0]+pix[1]+pix[2])/3 > 130 ? "1" : "0";
        });
        if(b !== "0000") rxBuffer += String.fromCharCode(parseInt(b, 2));
        if(rxBuffer.length > 100 && rxBuffer.includes("}")) saveFile();
        requestAnimationFrame(listen);
    }
    listen();
}

function saveFile() {
    try {
        const obj = JSON.parse(atob(rxBuffer));
        const a = document.createElement('a'); a.href = obj.d; a.download = obj.n; a.click();
        isRunning = false; rxBuffer = ""; location.reload();
    } catch(e) {}
}

function stopRx() { video.classList.add('hidden'); isRunning = false; }
function stopTx() { isRunning = false; }
