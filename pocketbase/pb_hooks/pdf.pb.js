routerAdd("POST", "/api/generate-pdf", (c) => {
    try {
        const info = c.requestInfo();
        const html = info.body.html;
        if (!html) {
            return c.json(400, { error: "HTML is required" });
        }

        const tempDir = $os.tempDir();
        const rand = Math.floor(Math.random() * 1000000);
        const htmlFile = tempDir + "/report-" + rand + ".html";
        const pdfFile = tempDir + "/report-" + rand + ".pdf";

        $os.writeFile(htmlFile, html);

        const cmd = $os.cmd("chromium",
            "--headless",
            "--disable-gpu",
            "--no-sandbox",
            "--print-to-pdf=" + pdfFile,
            "--no-pdf-header-footer",
            htmlFile
        );
        cmd.run();

        const pdfBytes = $os.readFile(pdfFile);
        $os.remove(htmlFile);
        $os.remove(pdfFile);
        
        return c.blob(200, "application/pdf", pdfBytes);
    } catch (e) {
        return c.json(500, { error: e.message || "PDF generation failed" });
    }
});
