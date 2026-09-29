import { describe, it, expect } from "vitest";
import { resolveRuntimeMode, isLocalHostname } from "./runtimeMode";

// `DEV` é true só no dev server (`npm run dev`); qualquer `vite build` tem
// DEV false e PROD true, inclusive o build de e2e.
const devServer = { DEV: true, PROD: false };
const build = { DEV: false, PROD: true };

describe("resolveRuntimeMode", () => {
  it("dev server sem VITE_MODE: banco no emulador, login real", () => {
    expect(resolveRuntimeMode({ ...devServer, VITE_MODE: "" })).toEqual({
      e2e: false,
      useDatabaseEmulator: true,
      useAuthEmulator: false,
    });
  });

  it("dev server com VITE_MODE=development: igual ao sem VITE_MODE", () => {
    expect(resolveRuntimeMode({ ...devServer, VITE_MODE: "development" }).useDatabaseEmulator).toBe(true);
  });

  it("dev server com VITE_MODE=production: tudo real", () => {
    expect(resolveRuntimeMode({ ...devServer, VITE_MODE: "production" })).toEqual({
      e2e: false,
      useDatabaseEmulator: false,
      useAuthEmulator: false,
    });
  });

  it("build de produção: tudo real", () => {
    expect(resolveRuntimeMode({ ...build, VITE_MODE: "production" })).toEqual({
      e2e: false,
      useDatabaseEmulator: false,
      useAuthEmulator: false,
    });
  });

  it("build sem VITE_MODE nunca vai para o emulador", () => {
    const modo = resolveRuntimeMode({ ...build, VITE_MODE: undefined });
    expect(modo.useDatabaseEmulator).toBe(false);
    expect(modo.useAuthEmulator).toBe(false);
  });

  it("build e2e: banco e login no emulador", () => {
    expect(resolveRuntimeMode({ ...build, VITE_MODE: "e2e" })).toEqual({
      e2e: true,
      useDatabaseEmulator: true,
      useAuthEmulator: true,
    });
  });

  it("só o modo e2e liga o emulador de login", () => {
    for (const VITE_MODE of [undefined, "", "development", "production", "E2E"]) {
      for (const env of [devServer, build]) {
        expect(resolveRuntimeMode({ ...env, VITE_MODE }).useAuthEmulator).toBe(false);
      }
    }
  });
});

describe("isLocalHostname", () => {
  it("aceita os endereços locais", () => {
    for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
      expect(isLocalHostname(host)).toBe(true);
    }
  });

  it("recusa o site no ar e parecidos", () => {
    for (const host of [
      "plataformacodefolio.web.app",
      "plataformacodefolio.firebaseapp.com",
      "localhost.evil.com",
      "",
    ]) {
      expect(isLocalHostname(host)).toBe(false);
    }
  });
});
