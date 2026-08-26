"use strict";

document.addEventListener("DOMContentLoaded", () => {
    // DOM이 준비된 후 실행

    // --- 매트릭스 배경 효과 ---
    const canvas = document.getElementById('matrixCanvas');
    const ctx = canvas.getContext('2d');

    let width, height, columns;
    const fontSize = 16;
    let drops = [];
    
    function initCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        columns = Math.floor(width / fontSize);
        
        const currentDropsLength = drops.length;
        for (let i = currentDropsLength; i < columns; i++) {
            drops[i] = 1;
        }
    }

    function drawMatrix() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.font = fontSize + 'px monospace';

        for (let i = 0; i < columns; i++) {
            const text = Math.random() > 0.5 ? '1' : '0';
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);

            if (drops[i] * fontSize > height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }

    window.addEventListener('resize', initCanvas);
    initCanvas();
    setInterval(drawMatrix, 60);

    // --- CLI 타이핑 효과 ---
    const commands = [
        "npm install --global vriefcase",
        "npm i -g vriefcase",
        "vriefcase popular css framework",
        "vriefcase korean web font",
        "vriefcase @bootstrap",
        "vriefcase @pretendard",
        // "vriefcase @bootstrap my-path",
        // "vriefcase @bootstrap \"css/framework\""
    ];

    let cmdIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    const typingElement = document.getElementById('typing-text');

    function typeCommand() {
        const currentCommand = commands[cmdIndex];

        if (isDeleting) {
            typingElement.textContent = currentCommand.substring(0, charIndex - 1);
            charIndex--;
        } else {
            typingElement.textContent = currentCommand.substring(0, charIndex + 1);
            charIndex++;
        }

        let typeSpeed = isDeleting ? 30 : 70;

        if (!isDeleting && charIndex === currentCommand.length) {
            typeSpeed = 2000;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            cmdIndex = (cmdIndex + 1) % commands.length;
            typeSpeed = 500;
        }

        setTimeout(typeCommand, typeSpeed);
    }

    setTimeout(typeCommand, 1000);
});