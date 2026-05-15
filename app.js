const canvas = document.getElementById('vortex-canvas'), ctx = canvas.getContext('2d'), video = document.getElementById('camera-feed'), term = document.getElementById('terminal');
let isRunning = false, buf = ""; const pin = "1234";

function log(m) { term.innerHTML += `<div>> ${m}</div>`; term.scrollTop = term.scrollHeight; }

function prepareFile(e) {
    const f = e.target.files[0]; const r = new FileReader();
    r.onload = (e) => { window.data = JSON.stringify({n: f.name, d: e.target.result}); log("File ready: " + f.name); };
    r.readAsDataURL(f);
}

function startSender() {
    isRunning = true; const b = btoa(window.data).split('').map(c=>c.charCodeAt(0).toString(2).padStart(8,'0')).join('');
    let p = 0;
    function trans() {
        if(!isRunning) return;
        ctx.fillStyle = "#000"; ctx.fillRect(0,0,canvas.width,canvas.height);
        [{x:0.5,y:0.2},{x:0.8,y:0.5},{x:0.5,y:0.8},{x:0.2,y:0.5}].forEach((pt,i) => {
            ctx.fillStyle = b[p+i] === "1" ? "#00ffcc" : "#022";
            ctx.beginPath(); ctx.arc(pt.x*canvas.width, pt.y*canvas.height, 20, 0, 7); ctx.fill();
        });
        p = (p+4 >= b.length) ? 0 : p+4;
        requestAnimationFrame(trans);
    }
    trans();
}

async function startReceiver() {
    isRunning = true; video.classList.remove('hidden');
    const s = await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
    video.srcObject = s;
    function cap() {
        if(!isRunning) return;
        ctx.drawImage(video, 0,0, canvas.width, canvas.height);
        let b = ""; [{x:0.5,y:0.2},{x:0.8,y:0.5},{x:0.5,y:0.8},{x:0.2,y:0.5}].forEach(pt => {
            b += ctx.getImageData(pt.x*canvas.width, pt.y*canvas.height, 1,1).data[0] > 100 ? "1" : "0";
        });
        if(b !== "0000") buf += String.fromCharCode(parseInt(b, 2));
        if(buf.length > 500) { alert("Data Received! Swipe/Click to Save"); finalize(); }
        requestAnimationFrame(cap);
    }
    cap();
}

function finalize() {
    const p = prompt("Pin:");
    if(p === pin) {
        const obj = JSON.parse(atob(buf));
        const a = document.createElement('a'); a.href = obj.d; a.download = obj.n; a.click();
    }
    isRunning = false; location.reload();
}
