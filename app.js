const canvas = document.getElementById('vortex-canvas'), ctx = canvas.getContext('2d'), 
      video = document.getElementById('camera-feed'), status = document.getElementById('status');
let isRunning = false, fileBuffer = "", rxBuffer = "";
const secretPin = "1234"; // Aapka Secret Code

// 1. FILE UPLOADER (Jo file aap select karenge wahi transfer hogi)
function loadFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    status.innerText = "Packing File: " + file.name;
    const reader = new FileReader();
    reader.onload = (ev) => {
        // File ka naam aur uska asli data (Image/Video) dono ko pack kar rahe hain
        const package = JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileContent: ev.target.result
        });
        fileBuffer = btoa(unescape(encodeURIComponent(package)));
        status.innerText = "File Ready: " + file.name;
        status.style.color = "#00ffcc";
    };
    reader.readAsDataURL(file); // Ye asli image/video ko read karta hai
}

function setMode(m) {
    isRunning = true;
    if(m === 'send') {
        if(!fileBuffer) return alert("Pehle File Upload karein!");
        startTx();
    } else {
        rxBuffer = "";
        video.classList.remove('hidden');
        startRx();
    }
}

// 2. SENDER (Visual Tunneling)
function startTx() {
    let p = 0;
    function draw() {
        if(!isRunning) return;
        ctx.fillStyle = "#000"; ctx.fillRect(0,0,canvas.width,canvas.height);
        const pts = [{x:0.5,y:0.2},{x:0.8,y:0.5},{x:0.5,y:0.8},{x:0.2,y:0.5}];
        
        pts.forEach((pt,i) => {
            const char = fileBuffer[p+i];
            // Binary bits ko colors mein badalna
            ctx.fillStyle = char ? "#00ffcc" : "#011"; 
            ctx.beginPath(); ctx.arc(pt.x*canvas.width, pt.y*canvas.height, 35, 0, 7); ctx.fill();
        });
        
        p = (p + 4 >= fileBuffer.length) ? 0 : p + 4;
        requestAnimationFrame(draw);
    }
    draw();
}

// 3. RECEIVER (Optical Decoding)
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
                bits += (pix[0]+pix[1]+pix[2])/3 > 140 ? "1" : "0";
            });
            
            if(bits !== "0000") {
                rxBuffer += bits;
                status.innerText = "Receiving Bytes: " + rxBuffer.length;
            }

            // Jab transfer ruk jaye ya pattern match ho to save karein
            if(rxBuffer.length > 5000) saveFile(); 
            requestAnimationFrame(listen);
        }
        listen();
    } catch(e) { status.innerText = "Camera Error"; }
}

// 4. FILE DOWNLOADER (Wahi asli file wapis banana)
function saveFile() {
    try {
        isRunning = false;
        const decoded = decodeURIComponent(escape(atob(rxBuffer)));
        const fileObj = JSON.parse(decoded);
        
        const a = document.createElement('a');
        a.href = fileObj.fileContent; // Asli image/video ka data
        a.download = fileObj.fileName; // Asli file ka naam
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        status.innerText = "SUCCESS: " + fileObj.fileName + " Saved!";
    } catch(e) { status.innerText = "Syncing..."; isRunning = true; }
}
