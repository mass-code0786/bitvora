import { afterAll,beforeAll,describe,expect,it } from "vitest";
import { existsSync,readFileSync } from "node:fs";
import { chromium,type Browser,type Page } from "playwright-core";

const chromePaths=[
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
];
const executablePath=chromePaths.find(existsSync);
const suite=executablePath?describe:describe.skip;
let browser:Browser,page:Page;

suite("logout confirmation mobile layout",()=>{
  beforeAll(async()=>{
    browser=await chromium.launch({headless:true,executablePath});
    page=await browser.newPage();
    const css=readFileSync("app/globals.css","utf8");
    await page.setContent(`<style>${css}</style>
      <nav id="bottom-nav" style="position:fixed;z-index:100;left:16px;right:16px;bottom:16px;height:64px"></nav>
      <div class="logout-confirm-overlay">
        <button aria-label="Cancel logout" class="logout-confirm-scrim"></button>
        <div class="logout-confirm-dialog" role="alertdialog" style="opacity:1;transform:translateY(0px) scale(1)">
          <span></span><h2>Logout</h2><p>Are you sure you want to logout?</p>
          <div><button id="cancel" onclick="window.cancelled=true">Cancel</button><button id="logout" onclick="window.loggedOut=true">Logout</button></div>
        </div>
      </div>`);
  });
  afterAll(async()=>{await browser?.close()});

  for(const width of [320,360,390])it(`stays within a ${width}px viewport`,async()=>{
    await page.setViewportSize({width,height:568});
    const box=await page.locator(".logout-confirm-dialog").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(16);
    expect(box!.x+box!.width).toBeLessThanOrEqual(width-16);
    expect(Math.abs((box!.x+box!.width/2)-width/2)).toBeLessThan(1);
  });

  it("keeps both actions visible, clickable, and above bottom navigation",async()=>{
    await page.setViewportSize({width:320,height:568});
    for(const selector of ["#cancel","#logout"]){
      await expect(page.locator(selector).isVisible()).resolves.toBe(true);
      await page.locator(selector).click();
    }
    expect(await page.evaluate(()=>({cancelled:(window as typeof window&{cancelled?:boolean}).cancelled,loggedOut:(window as typeof window&{loggedOut?:boolean}).loggedOut}))).toEqual({cancelled:true,loggedOut:true});
    const overlayZ=await page.locator(".logout-confirm-overlay").evaluate(node=>Number(getComputedStyle(node).zIndex));
    const navZ=await page.locator("#bottom-nav").evaluate(node=>Number(getComputedStyle(node).zIndex));
    expect(overlayZ).toBeGreaterThan(navZ);
  });

  it("stays inside a landscape mobile viewport",async()=>{
    await page.setViewportSize({width:568,height:320});
    const box=await page.locator(".logout-confirm-dialog").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(16);
    expect(box!.x+box!.width).toBeLessThanOrEqual(552);
    expect(box!.y).toBeGreaterThanOrEqual(16);
    expect(box!.y+box!.height).toBeLessThanOrEqual(304);
  });
});
