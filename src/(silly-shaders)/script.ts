import * as THREE from "three";
import {vertexShader, fluidShader, displayShader} from "./shaders";

let nameText: HTMLElement | null = null;
document.addEventListener('DOMContentLoaded', () =>
{
    nameText = document.getElementById("cool-text");
});

type FluidConfig = {
    brushSize: number;
    brushStrength: number;
    distortionAmount: number;
    fluidDecay: number;
    trailLength: number;
    stopDecay: number;
    color1: string;
    color2: string;
    color3: string;
    color4: string;
    colorIntensity: number;
    softness: number;
    [key: string]: any;
};

const config: FluidConfig = {
    brushSize: 25.0,
    brushStrength: 0.5,
    distortionAmount: 1.0,
    fluidDecay: 0.95,
    trailLength: 0.8,
    stopDecay: 0.85,
    color1: "#b8c9d4",
    color2: "#2b5266",
    color3: "#0f2433",
    color4: "#5a7d91",
    colorIntensity: 1.0,
    softness: 0.5,
    ...(window as any).FLUID_CONFIG,
};

function hexToRgb(hex: string): [number, number, number] {
    const r = parseInt(hex.slice(1,3), 16) / 255;
    const g = parseInt(hex.slice(3,5), 16) / 255;
    const b = parseInt(hex.slice(5,7), 16) / 255;
    return [r, g, b];
}

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const renderer = new THREE.WebGLRenderer({antialias:true});

const gradientCanvas = document.querySelector(".gradient-canvas") as HTMLElement;
renderer.setSize(window.innerWidth, window.innerHeight);
gradientCanvas.appendChild(renderer.domElement);

const fluidTarget1 = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: (THREE as any).HalfFloatType,
    }
);
const fluidTarget2 = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: (THREE as any).HalfFloatType,
    }
);

let currentFluidTarget = fluidTarget1;
let previousFluidTarget = fluidTarget2;
let frameCount = 0;

const fluidMaterial = new THREE.ShaderMaterial({
    uniforms: {
        iTime: { value: 0 },
        iResolution:{
            value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
        iMouse: {value: new THREE.Vector4(0,0,0,0)},
        iFrame: {value:0},
        iPreviousFrame: {value:null},
        uBrushSize: {value:config.brushSize},
        uBrushStrength:{value: config.brushStrength},
        uFluidDecay: {value:config.fluidDecay},
        uTrailLength:{value: config.trailLength},
        uStopDecay: {value:config.stopDecay},
    },
    vertexShader: vertexShader,
    fragmentShader:fluidShader,
});

const displayMaterial = new THREE.ShaderMaterial({
    uniforms: {
        iTime: {value:0},
        iResolution:{
            value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
        iFluid: {value:null},
        uDistortionAmount: {value: config.distortionAmount},
        uColor1: {value: new THREE.Vector3(...hexToRgb(config.color1))},
        uColor2: {value: new THREE.Vector3(...hexToRgb(config.color2))},
        uColor3: {value: new THREE.Vector3(...hexToRgb(config.color3))},
        uColor4: {value: new THREE.Vector3(...hexToRgb(config.color4))},
        uColorIntensity: {value: config.colorIntensity},
        uSoftness: {value:config.softness},
    },
    vertexShader: vertexShader,
    fragmentShader: displayShader,
});

const geometry = new THREE.PlaneGeometry(2,2);
const fluidPlane = new THREE.Mesh(geometry, fluidMaterial);
const displayPlane = new THREE.Mesh(geometry, displayMaterial);

let mouseX = 0,
   mouseY = 0;
let prevMouseX = 0,
   prevMouseY = 0;
let lastMoveTime = 0;

document.addEventListener("mousemove", (e: MouseEvent)=>{
    const rect = gradientCanvas.getBoundingClientRect();
    prevMouseX = mouseX;
    prevMouseY = mouseY;
    mouseX = e.clientX - rect.left;
    mouseY = rect.height - (e.clientY - rect.top);
    lastMoveTime = performance.now();
    (fluidMaterial.uniforms as any).iMouse.value.set(
        mouseX,
        mouseY,
        prevMouseX,
        prevMouseY,
    );
    if(nameText) {
        nameText.style.color = `rgb(${(mouseY*.5)%255},${(mouseX*.5 - mouseY*.5)%255}, ${(mouseX*.5)%255})`;
    }
});


document.addEventListener("mouseleave", ()=>{
    (fluidMaterial.uniforms as any).iMouse.value.set(0,0,0,0);
});

function animate(){
    requestAnimationFrame(animate);

    const time = performance.now() * 0.001;
    (fluidMaterial.uniforms as any).iTime.value = time;
    (displayMaterial.uniforms as any).iTime.value = time;
    (fluidMaterial.uniforms as any).iFrame.value = frameCount;

    if(performance.now() - lastMoveTime > 100) {
        (fluidMaterial.uniforms as any).iMouse.value.set(0,0,0,0);
    }

    (fluidMaterial.uniforms as any).uBrushSize.value = config.brushSize;
    (fluidMaterial.uniforms as any).uBrushStrength.value = config.brushStrength;
    (fluidMaterial.uniforms as any).uFluidDecay.value = config.fluidDecay;
    (fluidMaterial.uniforms as any).uTrailLength.value = config.trailLength;
    (fluidMaterial.uniforms as any).uStopDecay.value = config.stopDecay;

    (displayMaterial.uniforms as any).uDistortionAmount.value = config.distortionAmount;
    (displayMaterial.uniforms as any).uColorIntensity.value = config.colorIntensity;
    (displayMaterial.uniforms as any).uSoftness.value = config.softness;
    (displayMaterial.uniforms as any).uColor1.value.set(...hexToRgb(config.color1));
    (displayMaterial.uniforms as any).uColor2.value.set(...hexToRgb(config.color2));
    (displayMaterial.uniforms as any).uColor3.value.set(...hexToRgb(config.color3));
    (displayMaterial.uniforms as any).uColor4.value.set(...hexToRgb(config.color4));

    (fluidMaterial.uniforms as any).iPreviousFrame.value = previousFluidTarget.texture;
    renderer.setRenderTarget(currentFluidTarget);
    renderer.render(fluidPlane, camera);

    (displayMaterial.uniforms as any).iFluid.value = currentFluidTarget.texture;
    renderer.setRenderTarget(null);
    renderer.render(displayPlane,camera);

    const temp = currentFluidTarget;
    currentFluidTarget = previousFluidTarget;
    previousFluidTarget = temp;

    frameCount ++;

}

window.addEventListener("resize", ()=>{
    const width = window.innerWidth;
    const height = window.innerHeight;

    renderer.setSize(width, height);
    (fluidMaterial.uniforms as any).iResolution.value.set(width, height);
    (displayMaterial.uniforms as any).iResolution.value.set(width, height);

    fluidTarget1.setSize(width,height);
    fluidTarget2.setSize(width,height);
    frameCount = 0;

});

animate();
