const PARTS=["00","01","02","03","040","041","042","050","051"];
const EXPECTED_SHA="f3b87537e1315a4a22b1ff6bcdf23681b31ce1d1730c408f7b30c31c7962bd67";
const decoder=new TextDecoder();

function fail(error){
  console.error(error);
  document.body.classList.add("caneta-ready");
  const main=document.querySelector("#main");
  if(main) main.innerHTML=`<section class="boot-error"><h1>Caneta Football could not start</h1><p>${String(error?.message||error)}</p><p>Reconnect once and reload so the verified product package can be stored for offline use.</p></section>`;
}

function base64Bytes(value){
  const binary=atob(value);
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i+=1) bytes[i]=binary.charCodeAt(i);
  return bytes;
}

function hex(buffer){return [...new Uint8Array(buffer)].map(value=>value.toString(16).padStart(2,"0")).join("");}

async function inflateRaw(bytes){
  if(typeof DecompressionStream!=="function") throw new Error("This browser does not support the offline package format. Use a current version of Chrome, Edge, Firefox or Safari.");
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzip(bytes){
  const files=new Map();
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let offset=0;
  while(offset+30<=bytes.length){
    const signature=view.getUint32(offset,true);
    if(signature===0x02014b50||signature===0x06054b50) break;
    if(signature!==0x04034b50) throw new Error(`Invalid product archive at byte ${offset}.`);
    const flags=view.getUint16(offset+6,true);
    const method=view.getUint16(offset+8,true);
    const compressedSize=view.getUint32(offset+18,true);
    const nameLength=view.getUint16(offset+26,true);
    const extraLength=view.getUint16(offset+28,true);
    if(flags&0x08) throw new Error("Unsupported ZIP data descriptor.");
    const nameStart=offset+30;
    const dataStart=nameStart+nameLength+extraLength;
    const name=decoder.decode(bytes.subarray(nameStart,nameStart+nameLength));
    const compressed=bytes.subarray(dataStart,dataStart+compressedSize);
    let value;
    if(method===0) value=compressed.slice();
    else if(method===8) value=await inflateRaw(compressed);
    else throw new Error(`Unsupported ZIP method ${method}.`);
    files.set(name,value);
    offset=dataStart+compressedSize;
  }
  return files;
}

async function start(){
  const chunks=await Promise.all(PARTS.map(async part=>{
    const response=await fetch(`./package/part-${part}`);
    if(!response.ok) throw new Error(`Product package part ${part} was not found (${response.status}).`);
    return (await response.text()).trim();
  }));
  const archive=base64Bytes(chunks.join(""));
  if(globalThis.crypto?.subtle){
    const actual=hex(await crypto.subtle.digest("SHA-256",archive));
    if(actual!==EXPECTED_SHA) throw new Error("The product package failed its integrity check.");
  }
  const files=await unzip(archive);
  const required=["styles.css","app.js","data/trip.json","data/journeys/CFT-DEMO-BA-001.json"];
  required.forEach(name=>{if(!files.has(name)) throw new Error(`The product package is missing ${name}.`);});

  const style=document.createElement("style");
  style.dataset.canetaProduct="true";
  style.textContent=decoder.decode(files.get("styles.css"));
  document.head.append(style);
  document.body.classList.add("caneta-ready");

  const nativeFetch=globalThis.fetch.bind(globalThis);
  globalThis.fetch=async(input,init)=>{
    const raw=typeof input==="string"||input instanceof URL?String(input):input.url;
    const url=new URL(raw,location.href);
    let name=null;
    if(url.pathname.endsWith("/data/trip.json")) name="data/trip.json";
    const journeyMatch=url.pathname.match(/\/data\/journeys\/([A-Za-z0-9_-]+)\.json$/);
    if(journeyMatch){
      const candidate=`data/journeys/${journeyMatch[1]}.json`;
      if(files.has(candidate)) name=candidate;
    }
    if(name){
      return new Response(files.get(name).slice(),{status:200,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
    }
    return nativeFetch(input,init);
  };

  const moduleUrl=URL.createObjectURL(new Blob([files.get("app.js")],{type:"text/javascript"}));
  try{await import(moduleUrl);}finally{URL.revokeObjectURL(moduleUrl);}
}

start().catch(fail);
