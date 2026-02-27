import { generateEpubBuffer } from "./epub";
import JSZip from "jszip";

describe("EPUB Generator", () => {
  it("should generate a valid EPUB ZIP buffer containing required files", async () => {
    const markdownInput = `# Hello World
This is a **bold** test!`;
    const filename = "test.md";

    const buffer = await generateEpubBuffer(markdownInput, filename);
    expect(buffer).toBeDefined();

    const zip = await JSZip.loadAsync(buffer);
    
    // Validate mimetype is present and correct
    const mimetype = zip.file("mimetype");
    expect(mimetype).toBeDefined();
    const mimetypeContent = await mimetype!.async("string");
    expect(mimetypeContent).toBe("application/epub+zip");

    // Validate container.xml
    const container = zip.file("META-INF/container.xml");
    expect(container).toBeDefined();
    const containerContent = await container!.async("string");
    expect(containerContent).toContain("OEBPS/content.opf");

    // Validate OPF exists
    const opf = zip.file("OEBPS/content.opf");
    expect(opf).toBeDefined();
    const opfContent = await opf!.async("string");
    expect(opfContent).toContain(`<dc:title>${filename}</dc:title>`);

    // Validate NCX exists
    const ncx = zip.file("OEBPS/toc.ncx");
    expect(ncx).toBeDefined();

    // Validate content.html exists and contains parsed markdown
    const htmlFile = zip.file("OEBPS/content.html");
    expect(htmlFile).toBeDefined();
    const htmlContent = await htmlFile!.async("string");
    
    // Check for marked's translation (XMLSerializer natively injects namespaces in JSDOM)
    expect(htmlContent).toMatch(/<h1[^>]*>Hello World<\/h1>/);
    expect(htmlContent).toMatch(/<strong[^>]*>bold<\/strong>/);
    
    // Check for our XHTML wrapper
    expect(htmlContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(htmlContent).toContain('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN"');
  });
});
