"use client";
import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { vertexShader, fluidShader, displayShader } from "../(silly-shaders)/shaders";

function Scene() {
  const { gl, size } = useThree();
  const camera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);

  const simMeshRef = useRef<THREE.Mesh | null>(null);
  const displayMeshRef = useRef<THREE.Mesh | null>(null);

  const rtA = useRef<THREE.WebGLRenderTarget | null>(null);
  const rtB = useRef<THREE.WebGLRenderTarget | null>(null);
  const currentRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const previousRef = useRef<THREE.WebGLRenderTarget | null>(null);

  const frameCount = useRef(0);
  const lastMoveTime = useRef(0);

  const mouse = useRef({ x: 0, y: 0, px: 0, py: 0, down: false });

  // create materials
  const fluidMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(size.width, size.height) },
        iMouse: { value: new THREE.Vector4(0, 0, 0, 0) },
        iFrame: { value: 0 },
        iPreviousFrame: { value: null },
        uBrushSize: { value: 25.0 },
        uBrushStrength: { value: 0.0 },
        uFluidDecay: { value: 0.95 },
        uTrailLength: { value: 0.8 },
        uStopDecay: { value: 0.85 },
      },
      vertexShader: vertexShader,
      fragmentShader: fluidShader,
    });
  }, [size.width, size.height]);

  const displayMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(size.width, size.height) },
        iFluid: { value: null },
        uDistortionAmount: { value: 1.0 },
        uColor1: { value: new THREE.Vector3(0.02, 0.02, 0.02) },
        uColor2: { value: new THREE.Vector3(0.08, 0.08, 0.08) },
        uColor3: { value: new THREE.Vector3(0.98, 0.98, 0.98) },
        uColor4: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
        uColorIntensity: { value: 1.0 },
        uSoftness: { value: 0.5 },
      },
      vertexShader: vertexShader,
      fragmentShader: displayShader,
    });
  }, [size.width, size.height]);

  // initialize render targets
  useEffect(() => {
    const params: THREE.WebGLRenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: (THREE as any).HalfFloatType || THREE.FloatType,
    };
    rtA.current = new THREE.WebGLRenderTarget(size.width, size.height, params);
    rtB.current = new THREE.WebGLRenderTarget(size.width, size.height, params);
    currentRef.current = rtA.current;
    previousRef.current = rtB.current;

    // cleanup
    return () => {
      rtA.current?.dispose();
      rtB.current?.dispose();
    };
  }, [size.width, size.height]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const rect = (gl.domElement.parentElement ?? gl.domElement).getBoundingClientRect();
      mouse.current.px = mouse.current.x;
      mouse.current.py = mouse.current.y;
      mouse.current.x = e.clientX - rect.left;
      mouse.current.y = rect.height - (e.clientY - rect.top);
      lastMoveTime.current = performance.now();
    };
    const onLeave = () => {
      mouse.current.x = 0; mouse.current.y = 0; mouse.current.px = 0; mouse.current.py = 0;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, [gl.domElement]);

  useFrame(() => {
    if (!rtA.current || !rtB.current) return;
    if (!simMeshRef.current || !displayMeshRef.current) return;

    const now = performance.now() * 0.001;
    (fluidMaterial.uniforms as any).iTime.value = now;
    (displayMaterial.uniforms as any).iTime.value = now;
    (fluidMaterial.uniforms as any).iFrame.value = frameCount.current;

    if (performance.now() - lastMoveTime.current > 100) {
      (fluidMaterial.uniforms as any).iMouse.value.set(0, 0, 0, 0);
    } else {
      (fluidMaterial.uniforms as any).iMouse.value.set(
        mouse.current.x,
        mouse.current.y,
        mouse.current.px,
        mouse.current.py
      );
    }

    (fluidMaterial.uniforms as any).iPreviousFrame.value = previousRef.current.texture;

    // render simulation into current render target
    const simScene = new THREE.Scene();
    simScene.add(simMeshRef.current);
    gl.setRenderTarget(currentRef.current);
    gl.render(simScene, camera);

    // render display to screen
    (displayMaterial.uniforms as any).iFluid.value = currentRef.current.texture;
    const dispScene = new THREE.Scene();
    dispScene.add(displayMeshRef.current);
    gl.setRenderTarget(null);
    gl.render(dispScene, camera);

    // swap
    const tmp = currentRef.current;
    currentRef.current = previousRef.current;
    previousRef.current = tmp;

    frameCount.current++;
  }, 1);

  // create meshes once
  useEffect(() => {
    const geom = new THREE.PlaneGeometry(2, 2);
    const simMesh = new THREE.Mesh(geom, fluidMaterial);
    const dispMesh = new THREE.Mesh(geom, displayMaterial);
    simMeshRef.current = simMesh;
    displayMeshRef.current = dispMesh;

    return () => {
      geom.dispose();
      fluidMaterial.dispose();
      displayMaterial.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function SillyShadersScene() {
  return (
    <div className="shader-canvas" style={{ width: "100%", height: "100%", position: "relative" }}>
      <Canvas className="shader-r3f-canvas" style={{ width: "100%", height: "100%", display: "block" }} gl={{ antialias: true, preserveDrawingBuffer: true }} dpr={[1, 2]}>
        <Scene />
      </Canvas>
      <img
        src="/images/logo.png"
        alt="logo"
        className="shader-logo pointer-events-none"
        style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", maxWidth: "48%", maxHeight: "48%", objectFit: "contain" }}
      />
    </div>
  );
}
