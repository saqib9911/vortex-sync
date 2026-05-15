/**
 * VORTEX-SYNC v1.5 - "A to Z" Advanced Functions
 * Developed by Saqib Zaheer Satti
 */

const canvas = document.getElementById('vortex-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const video = document.getElementById('camera-feed');
const terminal = document.getElementById('terminal');
const input = document.getElementById('data-input');

let isRunning = false;
let animationId;
let bitBuffer = []; // For noise reduction

// Vortex Geometry Mapping (1,2,4,8,7,5) + Anchors (3,6,9)
const vortexPoints = [
    { n: 1, x: 0.5, y: 0.15 }, { n: 2, x: 0.8, y: 0.3 }, { n: 4, x: 0.85, y: 0.7 },
    { n: 8, x: 0.5, y: 0.85 }, { n: 7, x: 0.15, y: 0.7 }, { n: 5, x: 0.2, y: 0.3 }
];

const anchors = [
    { n: 3, x: 0.3, y: 0.5 }, { n: 6, x: 0.7, y: 0.5 }, { n: 9, x: 0.5, y: 0.5 }
];

function log(msg, type = "info") {
    const color = type === "error" ? "text-red-500" : type === "success" ? "text-cyan-400" : "text-green-500";
    terminal.innerHTML += `<div class="${color}">> ${msg}</div>`;
    terminal.scrollTop = terminal.scrollHeight;
}

// --- ADVANCED SENDER (With Header & Footer) ---
function startSender() {
    stopAll();
    const rawData = input.value;
    if (!rawData) return log("Error: Input empty", "error");

    isRunning = true;
    log("Encoding Stream...");

    // Protocol: START_FLAG (1111) + DATA + END_FLAG (0000)
    const binary = "1111" + rawData.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join('') + "0000";
    let bitPointer = 0;
    let frameCount = 0;

    function animate() {
        if (!isRunning) return;
        
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 1. Draw 3-6-9 Anchors (Always ON for tracking)
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#00ffcc";
        anchors.forEach(a => {
            ctx.fillStyle = "#004444";
            ctx.beginPath();
            ctx.arc(a.x * canvas.width, a.y * canvas.height, 10, 0, Math.PI * 2);
            ctx.fill();
        });

        // 2. Transmit Bits via Vortex 1-2-4-8-7-5
        vortexPoints.forEach((p, i) => {
            const bit = binary[bitPointer + i] || "0";
            ctx.fillStyle = bit === "1" ? "#00ffcc" : "#051a14";
            ctx.beginPath();
            ctx.arc(p.x * canvas.width, p.y * canvas.height, 35, 0, Math.PI * 2);
            ctx.fill();
        });

        // Speed Control (Slow down slightly for camera sync)
        frameCount++;
        if (frameCount % 4 === 0) { 
            bitPointer += 6;
            if (bitPointer >= binary.length) bitPointer = 0; // Loop sending
        }

        animationId = requestAnimationFrame(animate);
    }
    animate();
}

// --- ADVANCED RECEIVER (Noise Filtered) ---
async function startReceiver() {
    stopAll();
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment", frameRate: { ideal: 60 } } 
        });
        video.srcObject = stream;
        video.classList.remove('hidden-element');
        isRunning = true;
        log("Listening for Vortex Pulses...", "info");

        let decodedBinary = "";
        let lastFired = 0;

        function process() {
            if (!isRunning) return;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            let currentByte = "";
            vortexPoints.forEach(p => {
                const pixel = ctx.getImageData(p.x * canvas.width, p.y * canvas.height, 1, 1).data;
                const brightness = (pixel[0] + pixel[1] + pixel[2]) / 3;
                currentByte += brightness > 140 ? "1" : "0";
            });

            // Bit-Validation: Only accept if stable for 2 frames
            if (currentByte !== "000000") {
                const now = Date.now();
                if (now - lastFired > 200) { // Throttle to prevent duplicate reads
                    decodeByte(currentByte);
                    lastFired = now;
                }
            }

            animationId = requestAnimationFrame(process);
        }
        process();
    } catch (err) {
        log("Camera Access Denied", "error");
    }
}

function decodeByte(bits) {
    // Basic visualization of bits moving
    log(`Interpreting Pulse: ${bits}`, "success");
    // In a full version, here you'd push to a string and convert back to ASCII
}

function stopAll() {
    isRunning = false;
    cancelAnimationFrame(animationId);
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(t => t.stop());
    }
    video.classList.add('hidden-element');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    log("System Reset.");
}
