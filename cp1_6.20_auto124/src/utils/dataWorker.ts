self.addEventListener("message", (event: MessageEvent) => {
  const { type, payload } = event.data;

  if (type === "parse-csv") {
    const csvContent: string = payload;
    const lines = csvContent.split(/\r?\n/).filter((line) => line.trim() !== "");
    if (lines.length === 0) {
      self.postMessage({
        type: "parse-csv-result",
        data: { columns: [], rows: [], columnTypes: {} },
      });
      return;
    }

    const columns = lines[0].split(",").map((h) => h.trim());
    const rows: Record<string, string | number>[] = [];
    const columnTypes: Record<string, string> = {};

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row: Record<string, string | number> = {};
      for (let j = 0; j < columns.length; j++) {
        const raw = values[j] ?? "";
        const num = parseFloat(raw);
        if (!isNaN(num) && raw !== "") {
          row[columns[j]] = num;
        } else {
          row[columns[j]] = raw;
        }
      }
      rows.push(row);
    }

    for (const col of columns) {
      let allNumbers = true;
      for (const row of rows) {
        if (typeof row[col] !== "number") {
          allNumbers = false;
          break;
        }
      }
      columnTypes[col] = allNumbers ? "number" : "string";
    }

    self.postMessage({
      type: "parse-csv-result",
      data: { columns, rows, columnTypes },
    });
  }

  if (type === "format-json") {
    const jsonString: string = payload;
    const parsedObject = JSON.parse(jsonString);
    self.postMessage({
      type: "format-json-result",
      data: parsedObject,
    });
  }
});
