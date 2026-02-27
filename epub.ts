import JSZip from "jszip";
import { marked } from "marked";

/**
 * Converts markdown string content into a standalone EPUB `.epub` package Buffer.
 * Designed to be run independent of Obsidian API context for robust testing.
 */
export async function generateEpubBuffer(
  content: string,
  filename: string
): Promise<ArrayBuffer> {
  const zip = new JSZip();

  // mimetype MUST be uncompressed (STORE) per EPUB specifications
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  // META-INF/container.xml
  zip.folder("META-INF")?.file(
    "container.xml",
    `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  // Parse markdown to HTML using marked
  // Enable breaks to match Obsidian's default line-break behavior
  const parsedHtmlRaw = await marked.parse(content, {
    async: true,
    breaks: true,
    gfm: true,
  });

  // Convert to strictly valid XHTML using the browser's native DOMParser (or JSDOM in tests)
  let doc: Document;
  if (typeof DOMParser !== 'undefined') {
      doc = new DOMParser().parseFromString(parsedHtmlRaw, "text/html");
  } else {
      throw new Error("DOMParser is not defined in this environment");
  }
  
  // XMLSerializer guarantees perfectly well-formed XML strings, escaping any arbitrary tags/entities
  let serializer: XMLSerializer;
  if (typeof XMLSerializer !== 'undefined') {
      serializer = new XMLSerializer();
  } else {
      throw new Error("XMLSerializer is not defined in this environment");
  }

  const xhtmlBody = Array.from(doc.body.childNodes)
    .map((node) => serializer.serializeToString(node))
    .join("\\n");

  // Generate valid XHTML from content
  const htmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
<head>
  <title>${filename}</title>
</head>
<body>
  <div>
    ${xhtmlBody}
  </div>
</body>
</html>`;

  // OEBPS/content.opf
  zip.folder("OEBPS")?.file(
    "content.opf",
    `<?xml version="1.0" encoding="UTF-8"?>
<package version="2.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${filename}</dc:title>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="content" href="content.html" media-type="application/xhtml+xml"/>
    <item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="toc">
    <itemref idref="content"/>
  </spine>
</package>`
  );

  // OEBPS/toc.ncx
  zip.folder("OEBPS")?.file(
    "toc.ncx",
    `<?xml version="1.0" encoding="UTF-8"?>
<ncx version="2005-1" xmlns="http://www.daisy.org/z3986/2005/ncx/">
  <head>
    <meta name="dtb:uid" content="BookId"/>
  </head>
  <docTitle><text>${filename}</text></docTitle>
  <navMap>
    <navPoint id="navPoint-1" playOrder="1">
      <navLabel><text>Start</text></navLabel>
      <content src="content.html"/>
    </navPoint>
  </navMap>
</ncx>`
  );

  // OEBPS/content.html
  zip.folder("OEBPS")?.file("content.html", htmlContent);

  // Generate zip buffer using Node Uint8Array compatibility
  // We compress the rest of the files using DEFLATE
  const u8array = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 5 },
  });
  return u8array.buffer as ArrayBuffer;
}
