const canvas = document.getElementById('vortex-canvas'), ctx = canvas.getContext('2d'), 
      video = document.getElementById('camera-feed'), status = document.getElementById('status');
let isRunning = false, filePackage = null, rxBuffer = "";

// 1. File Loader (Ab ye zyada stable hai)
function loadFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    
    status.innerText = "Processing: " + f.name;
    const r = new FileReader();
    r.onload = (ev) => {
        // Metadata ke sath file ko pack karein
        const rawData = JSON.stringify({n: f.name, d: ev.target.result});
        // btoa use karne se pehle string ko encode karein taky special characters masla na karein
        filePackage = btoa(unescape(encodeURIComponent(rawData)));
        status.innerText = "Ready to send: " + f.name;
        status.style.color = "#00ffcc";
    };
    r.readAsDataURL(f);
}

function setMode(m) {
    if(m === 'send') {
        if(!filePackage) return alert("Pehle file select karein!");
        isRunning = true;
        video.classList.add('hidden');
        startTx();
    } else {
        rxBuffer = "";
        isRunning = true;
        video.classList.remove('hidden');
        startRx();
    }
}

// 2. Sender (Transmission speed ko thora maintain kiya hai)
function startTx() {
    let p = 0;
    function draw() {
        if(!isRunning) return;
        ctx.fillStyle = "#000"; ctx.fillRect(0,0,canvas.width,canvas.height);
        const pts = [{x:0.5,y:0.2},{x:0.8,y:0.5},{x:0.5,y:0.8},{x:0.2,y:0.5}];
        
        pts.forEach((pt,i) => {
            // Binary ke bajaye hum Base64 characters ke bits bhej rahe hain
            const charCode = filePackage.charCodeAt(p + i) || 0;
            ctx.fillStyle = charCode > 64 ? "#00ffcc" : "#022"; 
            ctx.beginPath(); ctx.arc(pt.x*canvas.width, pt.y*canvas.height, 35, 0, 7); ctx.fill();
        });
        
        p = (p + 4 >= filePackage.length) ? 0 : p + 4;
        requestAnimationFrame(draw);
    }
    draw();
}

// 3. Receiver (Reload bug fix kiya hai)
async function startRx() {
    try {
        const s = await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
        video.srcObject = s;
        
        function listen() {
            if(!isRunning) return;
            ctx.drawImage(video, 0,0, canvas.width, canvas.height);
            let b = ""; 
            [{x:0.5,y:0.2},{x:0.8,y:0.5},{x:0.5,y:0.8},{x:0.2,y:0.5}].forEach(pt => {
                let pix = ctx.getImageData(pt.x*canvas.width, pt.y*canvas.height, 1,1).data;
                b += (pix[0]+pix[1]+pix[2])/3 > 140 ? "1" : "0";
            });
            
            if(b !== "0000") {
                rxBuffer += String.fromCharCode(parseInt(b, 2) + 60); // Offset mapping
                status.innerText = "Receiving Data: " + rxBuffer.length + " bytes";
            }

            // Jab buffer kafi bara ho jaye tab check karein
            if(rxBuffer.length > 500 && rxBuffer.endsWith("==")) { 
                saveFile(); 
            }
            requestAnimationFrame(listen);
        }
        listen();
    } catch(e) { status.innerText = "Camera Error"; }
}

function saveFile() {
    try {
        isRunning = false;
        const decodedData = decodeURIComponent(escape(atob(rxBuffer)));
        const obj = JSON.parse(decodedData);
        
        const a = document.createElement('a');
        a.href = obj.d;
        a.download = obj.n;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        status.innerText = "SUCCESS: " + obj.n + " saved!";
        rxBuffer = ""; // Reset buffer
    } catch(e) {
        // Agar error aaye to reload nahi, bas error dikhaye
        status.innerText = "Sync Error. Keep trying...";
    }
}
