import { describe, it } from "vitest";
import { analyzeUpload } from "@/lib/modimport/analyze";
import { writeDbpf } from "@/lib/modimport/dbpf";
import { buildImportFiles } from "@/lib/modimport/save-to-project";
const enc = new TextEncoder();
const tuning = `<?xml version="1.0" encoding="utf-8"?>\n<I c="Trait" i="trait" m="coolmod.traits.night_owl" n="coolmod_NightOwl" s="9876543210">\n  <T n="display_name">0x1A2B3C4D</T>\n</I>`;
const bytes = writeDbpf([
 {typeNum:0x0333406c,groupNum:0,instance:9876543210n,raw:enc.encode(tuning),memSize:tuning.length,compressionType:0},
 {typeNum:0x0badf00d,groupNum:0,instance:111n,raw:enc.encode(tuning),memSize:tuning.length,compressionType:0},
 {typeNum:0x545ac67a,groupNum:0,instance:222n,raw:new Uint8Array([68,65,84,65,0,1,2,3]),memSize:8,compressionType:0},
]);
describe("dbg",()=>{it("x",async()=>{
 const {session,bytes:orig}=await analyzeUpload([{name:"CoolMod.package",relativePath:"CoolMod.package",bytes}]);
 const p=session.projects[0]!;
 console.log(p.resources.map(r=>({n:r.name,e:r.editability,t:r.typeLabel,len:r.text?.length})));
 const files=buildImportFiles(p,orig);
 const m=JSON.parse(Buffer.from(files.find(f=>f.name==="resources.json")!.dataUrl.split(",")[1]!,"base64").toString());
 console.log(m.resources);
})});
