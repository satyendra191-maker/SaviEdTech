'use client';

import { useEffect, useRef } from 'react';

export function AtomGraphic({ className = '' }: { className?: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        let angle = 0;

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };

        resize();
        window.addEventListener('resize', resize);

        const colors = {
            nucleus: '#fbbf24',
            electron1: '#38bdf8',
            electron2: '#a78bfa',
            electron3: '#f472b6',
            orbit: 'rgba(148, 163, 184, 0.3)',
        };

        const drawNucleus = (cx: number, cy: number, radius: number) => {
            const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
            gradient.addColorStop(0, '#fef3c7');
            gradient.addColorStop(0.5, colors.nucleus);
            gradient.addColorStop(1, '#d97706');
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
        };

        const drawOrbit = (cx: number, cy: number, rx: number, ry: number, rotation: number) => {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rotation);
            ctx.beginPath();
            ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
            ctx.strokeStyle = colors.orbit;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
        };

        const drawElectron = (cx: number, cy: number, rx: number, ry: number, rotation: number, electronAngle: number) => {
            const x = cx + rx * Math.cos(electronAngle + rotation);
            const y = cy + ry * Math.sin(electronAngle + rotation);

            const gradient = ctx.createRadialGradient(x, y, 0, x, y, 6);
            gradient.addColorStop(0, 'white');
            gradient.addColorStop(0.5, colors.electron1);
            gradient.addColorStop(1, '#0284c7');

            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(x, y, 10, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
            ctx.fill();
        };

        const draw = () => {
            const width = canvas.getBoundingClientRect().width;
            const height = canvas.getBoundingClientRect().height;
            const cx = width / 2;
            const cy = height / 2;

            ctx.clearRect(0, 0, width, height);

            const baseRadius = Math.min(width, height) * 0.35;

            const orbits = [
                { rx: baseRadius, ry: baseRadius * 0.4, rotation: angle },
                { rx: baseRadius * 0.85, ry: baseRadius * 0.75, rotation: angle + Math.PI / 3 },
                { rx: baseRadius * 0.9, ry: baseRadius * 0.5, rotation: angle + (2 * Math.PI) / 3 },
            ];

            orbits.forEach((orbit) => {
                drawOrbit(cx, cy, orbit.rx, orbit.ry, orbit.rotation);
            });

            drawNucleus(cx, cy, 12);

            orbits.forEach((orbit, index) => {
                const electronColors = [colors.electron1, colors.electron2, colors.electron3];
                const electronAngle = angle * (index + 1) * 1.5 + (index * Math.PI * 2) / 3;
                const x = cx + orbit.rx * Math.cos(electronAngle + orbit.rotation);
                const y = cy + orbit.ry * Math.sin(electronAngle + orbit.rotation);

                const gradient = ctx.createRadialGradient(x, y, 0, x, y, 6);
                gradient.addColorStop(0, 'white');
                gradient.addColorStop(0.5, electronColors[index]);
                gradient.addColorStop(1, electronColors[index].replace('0.7', '0.9'));

                ctx.beginPath();
                ctx.arc(x, y, 5, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(x, y, 12, 0, Math.PI * 2);
                ctx.fillStyle = electronColors[index].replace(')', ', 0.15)').replace('rgb', 'rgba');
                ctx.fill();
            });

            angle += 0.015;
            animationId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className={className}
            style={{ width: '100%', height: '100%' }}
        />
    );
}
