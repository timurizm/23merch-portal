const TRANSLIT: Record<string, string> = {
  а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",
  к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",
  х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
};

export function buildFilename(clientName: string, ext: "pptx" | "pdf"): string {
  const date = new Date().toISOString().slice(0, 10);
  const slug = clientName
    .toLowerCase()
    .split("")
    .map((c) => TRANSLIT[c] ?? (c.match(/[a-z0-9]/i) ? c : "_"))
    .join("")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 30);
  return `KP_${slug}_${date}.${ext}`;
}
